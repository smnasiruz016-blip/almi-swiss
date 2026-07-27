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

const DIR = path.join(process.cwd(), "src", "data", "items");
const AUDIO = path.join(process.cwd(), "public", "audio", "ch");
const WRITE = process.argv.includes("--write");
const FAILURES = path.join(process.cwd(), "reports", "audio-verify-failures.json");

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// Anything the content check flagged is not wired. A file that does not say what the
// transcript says is worse than no file: it looks finished and tests the wrong thing.
const rejected = new Set<string>(
  fs.existsSync(FAILURES) ? (JSON.parse(fs.readFileSync(FAILURES, "utf8")) as { stem: string }[]).map((f) => f.stem) : [],
);
if (rejected.size) console.log(`${rejected.size} clip(s) held back by the content check — not wiring those\n`);

let wired = 0;
const noFile: string[] = [];
const held: string[] = [];

for (const f of fs.readdirSync(DIR).filter((x) => x.includes("listening"))) {
  const full = path.join(DIR, f);
  const items: any[] = JSON.parse(fs.readFileSync(full, "utf8"));
  let touched = false;

  for (const it of items) {
    if (!it.payload?.transcript) continue;
    const stem = `${slug(f.replace(".json", ""))}--${slug(it.title)}`;
    if (rejected.has(stem)) { held.push(`${it.language} ${it.title}`); continue; }
    if (!fs.existsSync(path.join(AUDIO, `${stem}.wav`))) { noFile.push(`${it.language} ${it.title}`); continue; }
    const url = `/audio/ch/${stem}.wav`;
    if (it.payload.audioUrl === url) continue;
    it.payload.audioUrl = url;
    wired++;
    touched = true;
  }
  if (touched && WRITE) fs.writeFileSync(full, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

console.log(`${wired} item(s) would take an audioUrl${WRITE ? " — WRITTEN" : ""}`);
if (held.length) { console.log(`\n${held.length} held by the content check:`); for (const h of held.slice(0, 8)) console.log(`  ${h}`); }
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
if (!WRITE) console.log(`\nDRY — nothing written. Staged for the batch.`);
