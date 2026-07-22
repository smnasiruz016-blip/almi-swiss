// CONFORMANCE GATE — does each item match a REAL task of its own exam?
//
// verify-items.mts counts items and checks that answer keys self-grade. Neither
// tells you whether an item belongs to the exam it is filed under. That gap is how
// almi-french shipped 121 items carrying another exam's parameters, and how THIS
// repo came to serve the telc/Goethe surface as a 1:1 translation of its DELF/TCF
// French items — same titles in order, same charBands, same minSeconds, for two
// exams that do not share a task structure.
//
// Checks items against src/lib/ch/exam-structure.ts. Valid values are DERIVED from
// that file, not restated here: change the structure and the gate changes with it.
//
// ── STRICTNESS FOLLOWS SOURCING, WHICH IS THE POINT ──────────────────────────
// telc/Goethe  STRICT per task. The bodies publish task counts and approximate
//              lengths, and each item declares WHICH exam it is written for, so an
//              item can be matched against one real task.
// fide         ENVELOPE. fide is functional and publishes task TYPES, not word
//              counts. There is no published figure to test equality against, and
//              inventing one would be exactly the fabrication this gate exists to
//              prevent. The envelope catches an item pitched wildly outside an
//              A1–B1 functional bank, not a ±20-character difference.
// delf-tcf     ENVELOPE, because the surface holds two incompatible shapes (DELF is
//              level-based, TCF is scale-based — the registry says so).
// canton-civic NOT CHECKED. Knowledge MCQ carries no length or timing parameter, so
//              there is nothing to conform. Guarded instead by verify-items.
//
// Run: npx tsx scripts/items/conformance-gate.mts

import { ALL_EXAMS } from "../../src/lib/ch/registry";
import { itemsForSurface } from "../../src/lib/ch/items";
import {
  GOETHE_B1,
  TELC_B1,
  FIDE,
  DELF_TCF,
  CERTIFICATE_VARIANTS,
} from "../../src/lib/ch/exam-structure";

type Band = { min?: number; max?: number };

const violations: string[] = [];
let checked = 0;
let skipped = 0;

/** Does [min,max] sit inside any of the given task bands? */
function fitsWritten(min: number, max: number, tasks: { charMin: number; charMax: number }[]) {
  return tasks.some((t) => min >= t.charMin && max <= t.charMax);
}

for (const e of ALL_EXAMS) {
  for (const skill of e.skills) {
    for (const it of itemsForSurface(e, skill)) {
      const p = (it.payload ?? {}) as Record<string, unknown>;
      const cb = (p.charBand ?? null) as Band | null;
      const secs = typeof p.minSeconds === "number" ? p.minSeconds : null;
      const where = `${e.slug} ${skill} — ${it.title}`;

      // ── canton-civic: nothing to conform ──
      if (e.exam === "CANTON_CIVIC") {
        skipped++;
        continue;
      }

      // ── telc / Goethe: strict, against the exam the item declares ──
      if (e.exam === "TELC_GOETHE") {
        const variant = (it as { variant?: string }).variant;
        if (!variant || !CERTIFICATE_VARIANTS.includes(variant as never)) {
          violations.push(
            `${where}\n      declares no exam. This surface is telc AND Goethe — two exams with ` +
              `different task structures. Every item must set variant: "GOETHE" | "TELC".`,
          );
          checked++;
          continue;
        }
        const spec = variant === "GOETHE" ? GOETHE_B1 : TELC_B1;
        checked++;

        if (cb) {
          if (!fitsWritten(Number(cb.min), Number(cb.max), spec.schreiben.tasks)) {
            const ok = spec.schreiben.tasks.map((t) => `${t.label} ${t.charMin}–${t.charMax}`).join(" | ");
            violations.push(`${where}\n      charBand ${cb.min}-${cb.max} matches no ${variant} B1 Schreiben task (valid: ${ok})`);
          }
        } else if (secs !== null) {
          const ok = spec.sprechen.parts.map((t) => t.minSeconds);
          if (!ok.includes(secs)) {
            violations.push(`${where}\n      minSeconds ${secs} matches no ${variant} B1 Sprechen part (valid: ${ok.join(" | ")})`);
          }
        }
        continue;
      }

      // ── fide / fide-c-permit / getting-started / delf-tcf: envelope ──
      const env = e.exam === "DELF_TCF" ? DELF_TCF : FIDE;
      if (cb) {
        checked++;
        const min = Number(cb.min);
        const max = Number(cb.max);
        if (min < env.charEnvelope.min || max > env.charEnvelope.max) {
          violations.push(
            `${where}\n      charBand ${min}-${max} falls outside the authored A1–B1 envelope ` +
              `(${env.charEnvelope.min}–${env.charEnvelope.max})`,
          );
        }
      } else if (secs !== null) {
        checked++;
        if (secs < env.secondsEnvelope.min || secs > env.secondsEnvelope.max) {
          violations.push(
            `${where}\n      minSeconds ${secs} falls outside the authored A1–B1 envelope ` +
              `(${env.secondsEnvelope.min}–${env.secondsEnvelope.max})`,
          );
        }
      } else {
        skipped++;
      }
    }
  }
}

if (violations.length) {
  console.error(`\n✗ CONFORMANCE GATE FAILED — ${violations.length} item(s) do not match a real task of their exam.\n`);
  for (const v of violations.slice(0, 40)) console.error(`  ${v}`);
  if (violations.length > 40) console.error(`  … and ${violations.length - 40} more.`);
  console.error(`\n  ${violations.length} of ${checked} checked. Fix the ITEM to a real task of its exam —`);
  console.error("  adjust the parameters AND the prompt so the task genuinely is what it claims.");
  console.error("  Never re-file an item under another exam to make this pass.\n");
  process.exit(1);
}

console.log(`✓ Conformance gate: ${checked} items match a real task of their exam.`);
console.log(`  (${skipped} skipped: canton-civic knowledge MCQ, and objective reading/listening items,`);
console.log("   carry no length or timing parameter — there is nothing to conform. Their");
console.log("   correctness is guarded by verify-items: every answer key must self-grade.");
