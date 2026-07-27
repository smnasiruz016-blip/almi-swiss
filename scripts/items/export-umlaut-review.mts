// EXPORT the undecided umlaut tokens with a real phrase around each one.
//
//   npx tsx scripts/items/export-umlaut-review.mts
//
// The proposal file carries the classifier's reasoning; this carries what a reviewer
// actually needs — the token, the candidate restoration, and the sentence it sits in.
// Context is pulled from parsed string VALUES, not from raw file text, so a snippet is a
// German phrase rather than a slice of JSON with quotes and braces in it.

import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "data", "items");
const DECIDED = path.join(process.cwd(), "reports", "umlaut-decided.json");
const OUT = path.join(process.cwd(), "reports", "umlaut-review.txt");

type Decision = { token: string; to: string; why: string; occurrences: number };
const decided: Decision[] = JSON.parse(fs.readFileSync(DECIDED, "utf8"));
const open = decided.filter((d) => d.to.trim().startsWith("?"));

const strings: string[] = [];
const walk = (n: any): void => {
  if (typeof n === "string") strings.push(n);
  else if (Array.isArray(n)) n.forEach(walk);
  else if (n && typeof n === "object") Object.values(n).forEach(walk);
};
for (const f of fs.readdirSync(DIR).filter((x) => x.startsWith("telc-goethe-german"))) {
  walk(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
}

const L = [
  "TELC/GOETHE GERMAN — 33 TOKENS NEEDING A CALL",
  "",
  "Mark each RESTORE (the sequence stands in for an umlaut) or LEAVE (real German, the",
  "letters just meet). The middle column is what the rule would produce — it is a",
  "suggestion, and on at least three of these it is WRONG. Nothing is applied except what",
  "comes back marked.",
  "",
];

for (const d of open) {
  const rx = new RegExp(`\\b${d.token}\\b`);
  const hit = strings.find((s) => rx.test(s)) ?? "";
  const i = hit.search(rx);
  let ctx = hit.slice(Math.max(0, i - 46), i + d.token.length + 46).replace(/\s+/g, " ").trim();
  if (i > 46) ctx = `…${ctx}`;
  if (i + d.token.length + 46 < hit.length) ctx = `${ctx}…`;
  L.push(
    `  ${d.token.padEnd(18)} → ${d.to.replace(/^\?\s*/, "").padEnd(18)} ×${d.occurrences}`,
    `     ${ctx}`,
    ``,
  );
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`${open.length} token(s) → ${path.relative(process.cwd(), OUT)}`);
for (const d of open) console.log(`  ${d.token.padEnd(18)} → ${d.to.replace(/^\?\s*/, "")}`);
