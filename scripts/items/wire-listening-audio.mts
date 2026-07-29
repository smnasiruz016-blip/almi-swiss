// WIRE each listening item to its rendered clip.
//
//   npx tsx scripts/items/wire-listening-audio.mts            (dry run)
//   npx tsx scripts/items/wire-listening-audio.mts --write    (staged batch)
//
// Sets payload.audioUrl on every listening item that has a matching file under
// public/audio/ch. It does NOT remove the transcript: the transcript is what the audio
// was rendered from, what the Whisper check compares against, and the accessibility
// fallback. What changes is that the player now has a real file to play.
//
// WHY THIS IS AN UPGRADE RATHER THAN A FIRST AUDIO LAYER. TtsAudio already speaks, via
// the browser's SpeechSynthesis API — but that depends entirely on the candidate's
// device. A machine with no German voice installed silently falls back to SHOWING the
// transcript, which turns a listening item into a reading item for that candidate and
// not for the next one. An exam cannot be a different exam per device. A rendered file
// is the same for everyone, carries two voices where the script has two speakers, and
// has been checked against its own transcript.
//
// REFUSES on any listening item with no file. A bank where some items play and some
// quietly fall back to text is the inconsistency this is meant to end.

import fs from "node:fs";
import path from "node:path";
import { readBundle, itemSpans, keyValueSpan, indentAt, spliceAll, assertFaithful } from "./json-text-edit.mjs";

const DIR = path.join(process.cwd(), "src", "data", "items");
const AUDIO = path.join(process.cwd(), "public", "audio", "ch");
const WRITE = process.argv.includes("--write");
const FAILURES = path.join(process.cwd(), "reports", "audio-verify-failures.json");
const MACHINE = path.join(process.cwd(), "reports", "audio-verify-machine.json");

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// THE ACCEPT RULE. Wire a clip when the file exists AND the audio has been shown to say
// what the transcript says — either by measurement or by a written human verdict:
//
//   recall >= threshold and every number heard   -> the check passed, wire it
//   below threshold but ACCEPTED with evidence   -> the check's own limitation, wire it
//   below threshold and NOT adjudicated          -> refuse
//   no clip file / no measurement at all         -> refuse
//
// The first version held back everything the content check flagged, which was right when
// "flagged" meant "unexamined". It is wrong now. All 10 flagged clips carry a written
// ACCEPTED verdict: French elides its plural so "chères clientes" is heard singular,
// `medium` renders "seize heures" as "César", and two German clips were confirmed by ear.
// Their audio IS correct — the CHECK is what falls short, and refusing to wire correct
// audio because an ASR mishears French liaison leaves 10 items falling back to text.
//
// What is NOT loosened: a clip that is below threshold and has nobody's name against it
// is still refused, and so is a missing file. The guarantee is unchanged — every served
// listening item plays the same audio for every candidate. What changed is that
// "verified" now includes "a human looked at it and wrote down why", which is the only
// thing that can clear a defect the instrument cannot see.
type Record = { stem: string; recall_ok: boolean; numbers_ok: boolean; recall: number };
const machine = new Map<string, Record>(
  fs.existsSync(MACHINE)
    ? (JSON.parse(fs.readFileSync(MACHINE, "utf8")).records as Record[]).map((r) => [r.stem, r])
    : [],
);
type Verdict = { stem: string; classification?: string; reason?: string };
const adjudicated = new Map<string, Verdict>(
  fs.existsSync(FAILURES)
    ? (JSON.parse(fs.readFileSync(FAILURES, "utf8")) as Verdict[])
        .filter((v) => v.classification === "ACCEPTED" && (v.reason ?? "").trim().length > 0)
        .map((v) => [v.stem, v])
    : [],
);
console.log(`${machine.size} measured clip(s), ${adjudicated.size} accepted-with-evidence\n`);

let wired = 0;
let passed = 0;
let byVerdict = 0;
const noFile: string[] = [];
const held: string[] = [];

let totalAdded = 0;
const perFile: Array<[string, number, number]> = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.includes("listening"))) {
  const full = path.join(DIR, f);
  const { text, eol, items } = readBundle(full);
  const spans = itemSpans(text);
  const splices: Array<[number, number, string]> = [];
  let touched = false;

  for (const [idx, it] of items.entries()) {
    if (!it.payload?.transcript) continue;
    const stem = `${slug(f.replace(".json", ""))}--${slug(it.title)}`;

    // Missing file first: nothing else can rescue a clip that does not exist.
    if (!fs.existsSync(path.join(AUDIO, `${stem}.wav`))) { noFile.push(`${it.language} ${it.title}`); continue; }

    const m = machine.get(stem);
    const verdict = adjudicated.get(stem);
    const measured = Boolean(m?.recall_ok && m?.numbers_ok);
    if (measured) passed++;
    else if (verdict) byVerdict++;
    else {
      held.push(m
        ? `${it.language} ${it.title} — recall ${m.recall}, numbers_ok ${m.numbers_ok}, NO written verdict`
        : `${it.language} ${it.title} — never measured by the content check`);
      continue;
    }

    const url = `/audio/ch/${stem}.wav`;
    if (it.payload.audioUrl === url) continue;

    // Surgical insert, for the same reason the de-game and CEFR writers are surgical:
    // 17 of 34 bundles are hand-formatted and do not round-trip through JSON.stringify,
    // and line endings are split 29 CRLF / 5 LF. Re-serialising would reformat half the
    // bank and bury 340 one-line additions in thousands of lines of reflow.
    const payload = keyValueSpan(text, spans[idx][0], "payload");
    if (!payload) throw new Error(`${f} item ${idx}: no payload object`);
    const existing = keyValueSpan(text, payload.valueStart, "audioUrl");
    if (existing) {
      splices.push([existing.valueStart, existing.valueEnd, JSON.stringify(url)]);
    } else {
      // After `transcript` — the clip belongs next to the text it was rendered from.
      const anchor = keyValueSpan(text, payload.valueStart, "transcript");
      if (!anchor) throw new Error(`${f} item ${idx}: no transcript to anchor audioUrl to`);
      const indent = indentAt(text, anchor.keyStart);
      let at = anchor.valueEnd;
      if (text[at] === ",") at++;
      splices.push([at, at, `${eol}${indent}"audioUrl": ${JSON.stringify(url)},`]);
    }
    it.payload.audioUrl = url;
    wired++;
    touched = true;
  }

  if (touched) {
    const out = spliceAll(text, splices);
    const { added, removed } = assertFaithful(text, out, items, f);
    totalAdded += added;
    perFile.push([f, splices.length, added]);
    if (WRITE) fs.writeFileSync(full, out, "utf8");
  }
}

console.log(`${wired} item(s) would take an audioUrl${WRITE ? " — WRITTEN" : ""}`);
console.log(`  ${passed} cleared by measurement (recall >= threshold, every number heard)`);
console.log(`  ${byVerdict} cleared by a written ACCEPTED verdict on a below-threshold clip`);
if (held.length) {
  console.log(`\n${held.length} held — below threshold with no written verdict:`);
  for (const h of held.slice(0, 12)) console.log(`  ${h}`);
}
// A HELD clip and a MISSING clip leave the learner in exactly the same place: an item
// with no audio, falling back to the transcript, in a bank where the item next to it
// plays. The first version refused only on missing files and skipped held ones, which
// would have wired 332 of 340 and called it done — the partial bank this refusal exists
// to prevent, arrived at by the other road.
const unplayable = [...noFile, ...held];
if (unplayable.length) {
  if (noFile.length) {
    console.log(`\n${noFile.length} listening item(s) with NO rendered clip:`);
    for (const n of noFile.slice(0, 8)) console.log(`  ${n}`);
  }
  console.log(`\nREFUSING: ${unplayable.length} item(s) would have no audio. A bank where some items`);
  console.log(`play and some fall back to text is not one exam.`);
  process.exit(1);
}
console.log(`\nDIFF FOOTPRINT — surgical, existing formatting and line endings preserved`);
console.log(`  ${perFile.length} file(s) touched, +${totalAdded} line(s)`);
for (const [f, n, add] of perFile) console.log(`    ${f.padEnd(42)} ${String(n).padStart(3)} insert(s)  +${add}`);

if (!WRITE) console.log(`\nDRY — nothing written. Staged for the batch.`);
