// Proof for real-entity-gate.mjs. Run: npm run gate:real-entity:test
//
// A gate is only worth its green. The first version of this gate PASSED the Helvetia
// bug it was written for: it scanned raw file lines, and a newline inside a JSON string
// is stored as two characters — a backslash and the letter n. So the character before a
// signature was a LETTER, the word boundary never matched, and the gate was blind in the
// exact place a company name sits. It looked clean.
//
// So both directions are pinned: real names must FAIL, and the ordinary-German uses of
// the same words — plus every real AUTHORITY we name on purpose — must PASS. The
// must-PASS half is the half that keeps the gate usable: noise gets a gate ignored, and
// an ignored gate is worse than none because it reads as coverage.
import fs from "node:fs"; import { execSync } from "node:child_process";
const F = "src/data/items/__gatetest-german-reading.json";
const cases = [
  // [label, string, mustFail]
  ["REAL signature after \n (the PR#11 bug)", "Freundliche Grüsse\nHelvetia Kranken AG", true],
  ["REAL common-word + marker", "Ihre CSS Versicherung dankt Ihnen.", true],
  ["REAL sender form", "Mit freundlichen Grüssen\ndie Mobiliar", true],
  ["REAL unambiguous brand", "Erhältlich bei Migros und Coop.", true],
  ["REAL trademarked programme", "Repair-Café im Gemeindesaal", true],
  ["REAL transport", "Die SBB informiert über den Fahrplan.", true],
  ["GENERIC placeholder (our own)", "Freundliche Grüsse\nKranken AG", false],
  ["COMMON WORD, no corporate context", "Bitte schützen Sie das Mobiliar vor Kratzern.", false],
  ["COMMON WORD, no corporate context", "Helvetia ist die Figur auf der Münze.", false],
  ["AUTHORITY — must be allowed", "Erkundigen Sie sich beim SEM und bei Ihrer Gemeinde.", false],
  ["AUTHORITY — must be allowed", "Ein anerkannter fide-Nachweis der Wohngemeinde.", false],
];
let pass = 0, fail = 0;
for (const [label, s, mustFail] of cases) {
  fs.writeFileSync(F, JSON.stringify([{ language:"DE",track:"CITIZENSHIP",exam:"FIDE",skill:"READING",
    taskType:"MCQ_SINGLE",difficulty:"CORE",cefr:"A2",title:"probe",prompt:"p",
    payload:{passage:s,question:"q",options:["a","b"]},answer:{type:"MCQ_SINGLE",correctIndex:0},maxPoints:1}], null, 2));
  let red = false;
  try { execSync("node scripts/seo/real-entity-gate.mjs", { stdio: "pipe" }); } catch { red = true; }
  const ok = red === mustFail;
  ok ? pass++ : fail++;
  console.log(`${ok ? "✓" : "✗"} ${mustFail ? "must FAIL" : "must PASS"} — ${label}`);
}
fs.unlinkSync(F);
console.log(`\ngate proof: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
