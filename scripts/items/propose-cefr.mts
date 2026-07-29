// PROPOSE a CEFR level for every getting-started item.
//
//   npx tsx scripts/items/propose-cefr.mts
//
// Writes a proposal for review. It does NOT touch the bank: levelling is a judgement and
// a script can only do the mechanical part — count turns, count competing data points,
// read the task. Where the signals are genuinely mixed the item is marked with a "?" and
// left for a human, and the residual list is exported separately.
//
// THE RUBRIC (beta-g, revised 2026-07-27)
//   A1  one concrete familiar fact, very short, slow and clear
//       L a single short message with one fact   R a sign / short note / simple SMS
//       S greet, introduce, a basic need
//       W short, simple, ISOLATED sentences about oneself and immediate needs —
//         a self-introduction, an SMS or note, a form filled in simple sentences
//   A2  a short routine exchange; find specific info among a little more; a simple
//       transaction or description
//       L a short conversation or announcement   R a schedule / notice / short email
//       S an everyday transaction
//       W a short CONNECTED text — an email or letter with detail or a reason, a
//         description, a message that explains or requests with linked sentences
//
// LENGTH IS NOT THE MEASURE. The first version bumped anything over 200 characters and
// produced eighteen false borderlines. Level is task complexity plus language: a single
// short message with one concrete fact is A1 at 265 characters, and what moves an item
// to A2 is the TASK — sifting specific information out of more of it.

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "data", "items");
type Proposal = { surface: string; skill: string; title: string; type: string; level: string; why: string; item: any };
const out: Proposal[] = [];

/** Turn count, by the conventions measured across all 340 transcripts. */
function turnCount(t: string): number {
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const dash = lines.filter((l) => /^[—–-]\s/.test(l)).length;
  if (dash >= 2) return dash;
  const colon = lines.filter((l) => /^[A-ZÄÖÜÉÈ][\wÄÖÜäöüéèçà .'-]{0,24}?\s*:/.test(l)).length;
  return colon >= 2 ? colon : 1;
}

/** Separately-answerable data points — a rough proxy, and honest about being rough, for
 *  how much "more" there is to sift. Three or more competing times, prices or days is
 *  where "find the one fact" stops being the task. */
function dataPoints(text: string): number {
  const nums = text.match(/\b\d{1,4}([.:,]\d{1,2})?/g) ?? [];
  const days = text.match(/\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi) ?? [];
  return new Set([...nums, ...days].map((x) => x.toLowerCase())).size;
}

const A2_SPEAKING = /(termin|rendez-vous|weg |chemin|beschreib|décri|erklär|expliqu|reklam|problem|bestell|command|arzt|médecin|vereinbar|telefon|téléphon)/i;
const A1_SPEAKING = /(guten tag|bonjour|grüss|salut|vorstell|présent|familie|famille|kaufen|acheter|preis|prix|\bname\b|\bnom\b|wohn|habit)/i;
const A1_WRITING = /(vorstell|présent|sms|zettel|notiz|\bmot\b|formular|formulaire|einkaufs|liste|steckbrief|kurz)/i;
const A2_WRITING = /(e-?mail|brief|lettre|erklär|expliqu|begründ|beschreib|décri|entschuldig|excus|reklamation|einladung|invitation|antwort|répons)/i;
const CONNECTOR = /(\bweil\b|\bdenn\b|\bdeshalb\b|parce que|\bdonc\b|ensuite|\bcar\b)/i;

for (const f of fs.readdirSync(DIR).filter((x) => x.startsWith("getting-started"))) {
  const surface = f.replace("getting-started-", "").replace(".json", "");
  const skill = surface.split("-")[1];

  for (const it of JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as any[]) {
    const p = it.payload ?? {};
    let level = "A2?";
    let why = "no signal matched";

    if (skill === "listening" || skill === "reading") {
      const body: string = p.transcript ?? p.text ?? p.passage ?? "";
      const turns = turnCount(body);
      const facts = dataPoints(body);
      if (["MATCHING", "ORDERING", "CLOZE"].includes(it.taskType)) {
        level = "A2"; why = `${it.taskType} — a task about more than one fact`;
      } else if (skill === "listening" && turns >= 2) {
        level = "A2"; why = `${turns}-turn exchange — understanding a short conversation`;
      } else if (facts >= 3) {
        level = "A2"; why = `${facts} competing data points — find specific info among more`;
      } else {
        level = "A1"; why = `a single short ${skill === "listening" ? "message" : "note or sign"}, ${facts} data point(s) — one concrete fact`;
      }
    }

    if (skill === "speaking") {
      const stim: string = p.stimulus ?? "";
      const secs = Number(p.minSeconds ?? 0);
      const hay = `${it.title} ${stim}`;
      if (A2_SPEAKING.test(hay)) { level = "A2"; why = `an everyday transaction or description (${secs}s)`; }
      else if (A1_SPEAKING.test(hay)) { level = "A1"; why = `greet, introduce or a basic need (${secs}s)`; }
      else { level = "A2?"; why = `neither clearly a greeting nor clearly a transaction (${secs}s)`; }
    }

    if (skill === "writing") {
      const stim: string = p.stimulus ?? "";
      const crit: string = (p.criteria ?? []).join(" ");
      const band = p.charBand ?? {};
      const hay = `${it.title} ${stim}`;
      const connected = CONNECTOR.test(crit) || CONNECTOR.test(stim);
      if (A2_WRITING.test(hay)) { level = "A2"; why = `an email, letter or explanation (${band.min}-${band.max}) — connected text`; }
      else if (connected) { level = "A2"; why = `the criteria ask for linked sentences (${band.min}-${band.max}) — connected text`; }
      else if (A1_WRITING.test(hay)) { level = "A1"; why = `a self-introduction, note, SMS or form (${band.min}-${band.max}) — simple isolated sentences`; }
      else { level = "A1?"; why = `neither clearly isolated sentences nor clearly connected text (${band.min}-${band.max})`; }
    }

    // ── beta-g's DECIDING RULE for what the first pass could not settle ──────
    // A2 if the task or criteria REQUIRE connected or structured output: sequencing
    // connectors, a stated reason, a structured description, or a transaction. A1 if it
    // is satisfiable with simple isolated personal sentences that need no linking.
    // The criteria are where this is decidable — they say what the answer must contain.
    if (level.includes("?")) {
      const crit: string = (p.criteria ?? []).join(" ");
      const stim: string = p.stimulus ?? "";
      const hay = `${it.title} ${stim} ${crit}`;
      const SEQUENCING = /(ensuite|après|d'abord|dans l'ordre|puis|dann|zuerst|danach|reihenfolge|schritt)/i;
      const REASON = /(parce que|pourquoi|weil|wofür|warum|begründ|raison|grund)/i;
      const STRUCTURED = /(beschreib|décri|erklär|expliqu|raconte|erzähl|vergleich|compar)/i;
      const TRANSACTION = /(bitte|bittet|demande|bestell|command|vereinbar|rendez-vous|termin|lädt.*ein|invit|bietet.*an|propose|reklam|entschuldig|excus)/i;

      const hits: string[] = [];
      if (SEQUENCING.test(hay)) hits.push("sequencing connectors");
      if (REASON.test(hay)) hits.push("a stated reason");
      if (STRUCTURED.test(hay)) hits.push("a structured description");
      if (TRANSACTION.test(hay)) hits.push("a transaction or request");

      if (hits.length) { level = "A2"; why = `RESOLVED A2 — the criteria require ${hits.join(" and ")}`; }
      else { level = "A1"; why = `RESOLVED A1 — satisfiable with simple isolated personal sentences, no linking required`; }
    }

    out.push({ surface, skill, title: it.title, type: it.taskType, level, why, item: it });
  }
}

// ── the full proposal ─────────────────────────────────────────────────────────
const lines = [
  "GETTING-STARTED — PROPOSED CEFR LEVELS (rubric v2: task complexity, not length)",
  "",
  "Proposed by rule. NOT written to the bank. A '?' means the signals were mixed.",
];
let cur = "";
for (const r of out) {
  if (r.surface !== cur) { cur = r.surface; lines.push("", `== ${cur} ==`); }
  lines.push(`  ${r.level.padEnd(4)} ${r.type.padEnd(16)} ${r.title}`, `         ${r.why}`);
}
const tally = new Map<string, number>();
for (const r of out) tally.set(r.level, (tally.get(r.level) ?? 0) + 1);
lines.push("", "TALLY", ...[...tally].sort().map(([k, v]) => `  ${k.padEnd(4)} ${v}`));
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/getting-started-cefr-proposal.txt", lines.join("\n"), "utf8");

// ── only the residual, with everything needed to settle it ────────────────────
const residual = out.filter((r) => r.level.includes("?"));
const rl = [
  "GETTING-STARTED — ITEMS STILL AMBIGUOUS AFTER RUBRIC v2",
  "",
  "Everything the rule could settle has been settled. These are the ones where it could",
  "not, with the full text so the call can be made without opening the bank.",
];
for (const r of residual) {
  const p = r.item.payload ?? {};
  rl.push("", `── ${r.surface} · ${r.type}`, `   ${r.title}`, `   best guess : ${r.level}   ${r.why}`);
  rl.push(`   prompt     : ${String(r.item.prompt ?? "").replace(/\s+/g, " ")}`);
  const body = p.transcript ?? p.text ?? p.passage ?? p.stimulus ?? "";
  if (body) rl.push(`   text       : ${String(body).replace(/\s+/g, " ")}`);
  if (p.criteria) rl.push(`   criteria   : ${p.criteria.join(" | ")}`);
  if (p.charBand) rl.push(`   charBand   : ${p.charBand.min}-${p.charBand.max}`);
  if (p.minSeconds) rl.push(`   minSeconds : ${p.minSeconds}`);
  if (p.options) rl.push(`   options    : ${p.options.join(" | ")}`);
}
fs.writeFileSync("reports/getting-started-cefr-residual.txt", rl.join("\n"), "utf8");

// The machine-readable decision, so what gets reviewed is exactly what gets written.
// apply-cefr reads THIS, not the classifier — re-running the rules at write time would
// mean the bank could take a level nobody had looked at.
fs.writeFileSync(
  "reports/getting-started-cefr-decided.json",
  JSON.stringify(out.map((r) => ({ surface: r.surface, title: r.title, level: r.level, why: r.why })), null, 1),
  "utf8",
);

console.log(`${out.length} item(s) levelled → reports/getting-started-cefr-proposal.txt`);
for (const [k, v] of [...tally].sort()) console.log(`  ${k.padEnd(4)} ${v}`);
console.log(`\n${residual.length} still ambiguous → reports/getting-started-cefr-residual.txt`);

// ── does A1 writing exist? ────────────────────────────────────────────────────
console.log(`\nA1 WRITING — does the track sold as "A1–A2" actually contain any?`);
for (const surface of ["german-writing", "french-writing"]) {
  const w = out.filter((r) => r.surface === surface);
  const a1 = w.filter((r) => r.level === "A1");
  console.log(`  ${surface}: ${a1.length} A1 of ${w.length}` + (a1.length ? ` — e.g. ${a1.slice(0, 3).map((x) => x.title).join(", ")}` : "  ← GAP"));
}
