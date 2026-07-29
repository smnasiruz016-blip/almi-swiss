// LISTENING AUDIO — local, free, no account, no per-use cost.
//
//   npx tsx scripts/items/generate-listening-audio.mts --sample
//   npx tsx scripts/items/generate-listening-audio.mts --all        (held)
//
// fide Listening is an audio test: the candidate hears a clip and answers. Every one of
// the 340 listening items already carries its transcript, so this is synthesis, not
// authoring — but until it runs, the listening surfaces are a reading test wearing a
// listening label.
//
// PIPER, run on this machine. Voices are ONNX files on disk and inference is CPU-only,
// so the marginal cost of every clip after the download is zero. edge-tts sounds better
// and was rejected: it calls a Microsoft endpoint, which is neither local nor free in
// the sense that matters here, and it would make the audio depend on a service nobody
// has a contract with.
//
// DIALOGUES GET TWO VOICES. Thirty-two transcripts are two-handed, and one voice reading
// both parts is not a listening test — telling speakers apart IS the skill being
// assessed. Turns are split on the "A:" / "Name:" prefix the transcripts already use and
// assigned alternately.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ITEMS = path.join(process.cwd(), "src", "data", "items");
const VOICES = path.join(process.cwd(), ".piper-voices");
const OUT = path.join(process.cwd(), "public", "audio", "ch");
const SAMPLE = process.argv.includes("--sample");
const ALL = process.argv.includes("--all");

// Two voices per language so a dialogue has two speakers. Order is [first, second].
const VOICE: Record<string, string[]> = {
  DE: ["de_DE-thorsten-medium", "de_DE-kerstin-low"],
  FR: ["fr_FR-tom-medium", "fr_FR-siwis-medium"],
};

/** The items the sample deliberately covers: Swiss-French numerals, which a fr_FR voice
 *  may not say the Swiss way, and a two-hander, to see whether turn-splitting works. */
const SAMPLE_TITLES = [
  "Le prix au marché : nonante",
  "Septante, nonante — et huitante ?",
  "Deux collègues parlent du trajet",
  "Nachricht auf dem Anrufbeantworter",
  "Vier kurze Mitteilungen",
  "Un message de Sara",
];

type Turn = { voice: number; text: string };

// MEASURED ACROSS ALL 340 TRANSCRIPTS, because the first version handled one convention
// and silently mishandled the other two:
//
//   59  em-dash dialogue      "— Tu viens comment au travail ?"   (French convention)
//   57  colon-prefixed        "Mitteilung eins:" / "Herr Ndiaye:"
//  224  a single block        an announcement, a voicemail
//
// The em-dash form was read entirely in ONE voice — a two-hander with one speaker is not
// a listening test, since telling the speakers apart is the skill. And the colon form was
// having its prefix DELETED, which is right for a speaker name and wrong for an
// enumerated label: "Mitteilung eins" tells the candidate which message they are hearing,
// and the questions refer to it.
const ENUMERATED = /\b(\d+|eins|zwei|drei|vier|fünf|un|une|deux|trois|quatre|cinq|uno|due|tre)\s*$/i;
const SPEAKER_PREFIX = /^([A-ZÄÖÜÉÈ][\wÄÖÜäöüéèçà .'-]{0,24}?)\s*:\s*(.+)$/;

function turns(transcript: string): Turn[] {
  const lines = transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out: Turn[] = [];
  const speakers: string[] = [];
  let dashTurn = 0;

  for (const line of lines) {
    // French/Italian dialogue:each turn opens with a dash. Alternate speakers.
    const dash = /^[—–-]\s*(.+)$/.exec(line);
    if (dash) { out.push({ voice: dashTurn++ % 2, text: dash[1] }); continue; }

    const m = SPEAKER_PREFIX.exec(line);
    if (m) {
      const [, who, rest] = m;
      if (ENUMERATED.test(who)) {
        // A label, not a person: SPEAK IT, and give each numbered item its own voice so
        // four messages sound like four callers.
        if (!speakers.includes(who)) speakers.push(who);
        out.push({ voice: speakers.indexOf(who) % 2, text: `${who}. ${rest}` });
      } else {
        if (!speakers.includes(who)) speakers.push(who);
        out.push({ voice: speakers.indexOf(who) % 2, text: rest });
      }
      continue;
    }

    if (out.length) out[out.length - 1].text += ` ${line}`;
    else out.push({ voice: 0, text: line });
  }
  return out.length ? out : [{ voice: 0, text: transcript }];
}

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function synth(text: string, voice: string, outFile: string) {
  // A BUFFER, not a string, and PYTHONIOENCODING set.
  //
  // Passing a JS string made Node encode stdin with the system codepage, which on this
  // machine is not UTF-8. Piper received "möglich" as mojibake and voiced the mojibake:
  // the clip said "M-Athilde absatzlich", and "die Ärztin" came out "die Athilde RZT".
  // The files were valid WAVs of the right length, so nothing about the generation
  // reported a problem — it took transcribing them back to find it. Every umlaut and
  // accent in 340 clips would have shipped like that.
  execFileSync("python", [
    "-m", "piper", "--model", path.join(VOICES, `${voice}.onnx`), "--output_file", outFile,
  ], {
    input: Buffer.from(text, "utf8"),
    stdio: ["pipe", "ignore", "pipe"],
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  });
}

const targets: { lang: string; title: string; transcript: string; file: string }[] = [];
for (const f of fs.readdirSync(ITEMS).filter((x) => x.includes("listening"))) {
  for (const it of JSON.parse(fs.readFileSync(path.join(ITEMS, f), "utf8")) as any[]) {
    const t = it.payload?.transcript;
    if (!t) continue;
    if (SAMPLE && !SAMPLE_TITLES.includes(it.title)) continue;
    targets.push({ lang: it.language, title: it.title, transcript: t, file: `${slug(f.replace(".json", ""))}--${slug(it.title)}` });
  }
}

if (!SAMPLE && !ALL) { console.log("pass --sample or --all"); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
console.log(`${targets.length} item(s) to voice → ${OUT}\n`);

const started = Number(process.env.T0 ?? 0);
for (const t of targets) {
  const parts = turns(t.transcript);
  const voices = VOICE[t.lang] ?? VOICE.DE;
  const chunks: string[] = [];
  parts.forEach((p, i) => {
    const chunk = path.join(OUT, `.${t.file}.part${i}.wav`);
    synth(p.text, voices[p.voice], chunk);
    chunks.push(chunk);
  });
  // One turn is already the finished clip; several are concatenated raw and the
  // header rewritten, which needs no encoder and no dependency.
  const final = path.join(OUT, `${t.file}.wav`);
  if (chunks.length === 1) fs.renameSync(chunks[0], final);
  else {
    const bufs = chunks.map((c) => fs.readFileSync(c));
    const body = Buffer.concat(bufs.map((b, i) => (i === 0 ? b.subarray(44) : b.subarray(44))));
    const header = Buffer.from(bufs[0].subarray(0, 44));
    header.writeUInt32LE(36 + body.length, 4);
    header.writeUInt32LE(body.length, 40);
    fs.writeFileSync(final, Buffer.concat([header, body]));
    for (const c of chunks) fs.unlinkSync(c);
  }
  const kb = Math.round(fs.statSync(final).size / 1024);
  console.log(`  ${t.lang}  ${parts.length} turn(s)  ${String(kb).padStart(4)} KB  ${t.title}`);
}
console.log(`\ndone — ${targets.length} file(s). Cost: nothing; Piper runs on this machine.`);
