// Bundled item loader for AlmiSwiss practice.
//
// Items are authored as JSON bundles under src/data/items/*.json, one per
// (exam × skill) surface — and because exam slugs are language-suffixed, that means
// one per (language × exam × skill). The content pipeline may still be generating
// them, so the loader is defensive: any missing, empty, or malformed file falls back
// to [] rather than throwing. Files are read from disk at module load (Node runtime)
// so not every bundle must exist at build/tsc time.
//
// ── WHY `language` IS REQUIRED, NOT OPTIONAL ──
// The version of this file inherited from the Nordic fork filtered on
// {track, exam, skill}. That was complete THERE — one national language, so those
// three identified an item. Here they do not: fide-german and fide-french are
// different tests, and an optional language filter would mean any caller that forgot
// to pass it silently serves a French candidate German items. Nothing throws; wrong
// items just look like content. So language is a REQUIRED first argument on every
// lookup — the type checker, not our discipline, is what keeps the languages apart.

import fs from "fs";
import path from "path";
import type {
  SwissTrack,
  SwissExam,
  SwissLanguage,
  SwissSkill,
  SwissTaskType,
  SwissDifficulty,
  CefrLevel,
  ObjectiveAnswer,
} from "./types";
import { ALL_EXAMS } from "./registry";
import type { ExamMeta } from "./registry";

/** A single authored item, matching the SwissItem content fields (no DB id). */
export interface SwissItemSeed {
  language: SwissLanguage;
  track: SwissTrack;
  exam: SwissExam;
  skill: SwissSkill;
  taskType: SwissTaskType;
  difficulty: SwissDifficulty;
  /** The CEFR level this task is pitched at — OPTIONAL, and its absence is "we have
   *  not stated one yet", never "it matches the goal".
   *
   *  Optional because 450 of the 510 items are on tracks whose goal level we have not
   *  reviewed; requiring it would be satisfied only by inventing a level for each,
   *  which is the fabrication this field exists to prevent. Enforcement is scoped
   *  instead: `verify-items.mts` REQUIRES `cefr` on every item of a surface that
   *  declares a goal (goalCefrFor), so a module gets levels the moment it gets a goal
   *  — and a task with no level can never be silently counted as proof of one. */
  cefr?: CefrLevel;
  /** WHICH exam this item is written for, on a surface that bundles two.
   *
   *  Only the CERTIFICATE surfaces need it, and today only telc-goethe enforces it:
   *  that bundle is telc AND Goethe — two exams whose papers differ (Goethe B1
   *  Schreiben has three tasks, telc B1 has one; their Sprechen parts differ too).
   *  Without this field an item is "telc-ish or Goethe-ish", which is precisely how
   *  the surface came to hold 60 translated DELF/TCF tasks: nothing could say what
   *  any item was supposed to be, so nothing could notice they were the wrong shape.
   *
   *  Optional on the type because fide, canton-civic and getting-started have no
   *  such split; REQUIRED by the conformance gate on telc-goethe. Scoped enforcement,
   *  not a field everyone must fill in with a guess. */
  variant?: "GOETHE" | "TELC";
  /** WITHHELD FROM SERVING when false. Absent means served — a bank of 500 items
   *  should not need 500 `"active": true` lines to say the ordinary thing.
   *
   *  Exists because "this task is good, but it is not this exam's task" had no
   *  expression here. Prisma's SwissItem.active is not it: nothing writes SwissItem,
   *  the app serves these JSON bundles off disk, so a flag only the database
   *  understands is a flag nothing reads. Deleting was the only other option, and
   *  deleting discards authored work whose only fault is being on the wrong shelf.
   *
   *  ⚠️ The FILTER, not this field, is what withholds: see loadServed() below. A flag
   *  no loader consults is decoration. */
  active?: boolean;
  /** Why an item is withheld. Only meaningful with `active: false`; the apply script
   *  refuses to withhold an item without one, so the bank never holds a dark item
   *  whose reason lives in a commit message nobody will read again. */
  withheldReason?: string;
  /** "Kept as raw material for a future track pitched at THIS level."
   *
   *  Not a level claim about where the item sits now — `cefr` is that, and it stays
   *  honest. This is the tag that lets six tasks be found again the day someone asks
   *  whether a B2 mediation track is worth building. It exists because the difficulty
   *  axis could not carry the mark: every candidate was already STRETCH, so STRETCH
   *  distinguished nothing. */
  seedFor?: CefrLevel;
  title: string;
  prompt: string;
  payload: unknown;
  answer: ObjectiveAnswer | null;
  maxPoints: number;
}

// Bundle filenames are DERIVED from the registry rather than hand-listed. A
// hand-written list drifts the moment an exam is added or a language ships: the
// inherited one still named sfi-*.json and tisus-*.json bundles months after the
// tree had moved on. Deriving them means the tree and the content pipeline cannot
// disagree about what should exist.
//
// ⚠️ The unit of content is the REGISTRY ENTRY (its slug), NOT (exam, skill).
// `exam` does not identify a surface: FIDE appears under CITIZENSHIP, C_PERMIT and
// GETTING_STARTED — same test, three goals, different content and difficulty. An
// early version of this file filtered on (language, exam, skill) and so returned the
// citizenship items for all three tracks, counting each item three times and letting
// the last track silently claim them. Rule #7 would then have read as satisfied for
// modules with no content of their own. Slugs encode (base, language) and are unique
// per entry, so loading BY SLUG is unambiguous by construction.
function bundleFileFor(e: ExamMeta, skill: SwissSkill): string {
  return `${e.slug}-${skill.toLowerCase()}.json`;
}

function bundleFilesFor(e: ExamMeta): string[] {
  return e.skills.map((skill) => bundleFileFor(e, skill));
}

export const BUNDLE_FILES: string[] = ALL_EXAMS.flatMap(bundleFilesFor);

/** Items for ONE registry entry + skill — the only unambiguous lookup.
 *
 *  SERVED items only: a withheld item is not practice, and it must not be counted as
 *  practice either. Every gate reads the bank through this function, so Rule #7 counts,
 *  the conformance gate and /api/status all shrink by the same two the learner lost. */
export function itemsForSurface(e: ExamMeta, skill: SwissSkill): SwissItemSeed[] {
  return loadServed(bundleFileFor(e, skill));
}

const ITEMS_DIR = path.join(process.cwd(), "src", "data", "items");

function loadBundle(file: string): SwissItemSeed[] {
  try {
    const full = path.join(ITEMS_DIR, file);
    if (!fs.existsSync(full)) return [];
    const raw = fs.readFileSync(full, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SwissItemSeed[];
  } catch {
    // Malformed / partially-written bundle — tolerate and skip.
    return [];
  }
}

/** An item is served unless it says otherwise. Absent `active` = served. */
function isServed(it: SwissItemSeed): boolean {
  return it.active !== false;
}

/** The served view of one bundle — what a learner can actually be given. */
function loadServed(file: string): SwissItemSeed[] {
  return loadBundle(file).filter(isServed);
}

let cache: SwissItemSeed[] | null = null;
let rawCache: SwissItemSeed[] | null = null;

function allItems(): SwissItemSeed[] {
  if (cache) return cache;
  cache = BUNDLE_FILES.flatMap(loadServed);
  return cache;
}

/** EVERY authored item, withheld ones included. Used only by the id-collision gate:
 *  a withheld item keeps its title, so it can still collide with a live one — and it
 *  would collide on the day someone brings it back, which is exactly when nobody is
 *  looking for a hash clash. */
function allItemsIncludingWithheld(): SwissItemSeed[] {
  if (rawCache) return rawCache;
  rawCache = BUNDLE_FILES.flatMap(loadBundle);
  return rawCache;
}

/** Filtered item lookup across surfaces. `language` and `track` are both required:
 *  language because three languages share a tree, and track because `exam` alone is
 *  ambiguous (FIDE spans CITIZENSHIP, C_PERMIT and GETTING_STARTED). For a single
 *  surface prefer itemsForSurface(), which cannot be ambiguous at all. */
export function getItems(
  language: SwissLanguage,
  track: SwissTrack,
  filter: { exam?: SwissExam; skill?: SwissSkill } = {},
): SwissItemSeed[] {
  return allItems().filter(
    (it) =>
      it.language === language &&
      it.track === track &&
      (filter.exam === undefined || it.exam === filter.exam) &&
      (filter.skill === undefined || it.skill === filter.skill),
  );
}

// ── SERVER-SIDE ITEM IDENTITY ───────────────────────────────────────────────
// Items are bundle-served with NO database id, but grading must be
// server-authoritative: the submit route re-loads the item by id and grades against
// the SERVER-held answer key, so the key never ships in the served payload and a
// client-supplied answer is never trusted. The id hashes the FULL identifying tuple —
// language|track|exam|skill|title — because titles are only unique within a surface and
// the same title can recur across languages/tracks. assertNoIdCollisions() proves the
// tuple is unique at build time; a collision would silently grade against the wrong key.

/** Stable, content-derived id for a bundle item — the handle the client posts back. */
export function stableItemId(
  it: Pick<SwissItemSeed, "language" | "track" | "exam" | "skill" | "title">,
): string {
  return hashSeed(`${it.language}|${it.track}|${it.exam}|${it.skill}|${it.title}`).toString(36);
}

/** Re-load the full item (INCLUDING its answer key) by its stable id, server-side.
 *  Withheld items are NOT findable here: a task that is no longer served must not be
 *  gradeable either, so a submission naming one fails loudly instead of quietly
 *  scoring against a task we have withdrawn. */
export function getItemById(id: string): SwissItemSeed | undefined {
  return allItems().find((it) => stableItemId(it) === id);
}

/**
 * Build-time guard: no two bundle items may share a stable id. A collision would make
 * getItemById() return the wrong item, so the submit route would grade a learner's
 * answer against a DIFFERENT item's key — silently. Proven RED-first: duplicate a
 * (language,track,exam,skill,title) tuple in a bundle and this throws.
 */
export function assertNoIdCollisions(): void {
  const seen = new Map<string, string>();
  for (const it of allItemsIncludingWithheld()) {
    const id = stableItemId(it);
    const key = `${it.language}|${it.track}|${it.exam}|${it.skill}|${it.title}`;
    const prior = seen.get(id);
    if (prior) {
      throw new Error(
        `stableItemId collision: "${key}" and "${prior}" both hash to ${id} — grading would key against the wrong item`,
      );
    }
    seen.set(id, key);
  }
}

/**
 * Deterministic stable string hash → 32-bit int. Used as a fallback seed so the
 * pick is varied but reproducible without Math.random at module/build scope.
 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) for a stable shuffle from a numeric seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stableShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A seed for ONE practice run: stable while the run renders, different on the next.
 *
 * ── WHY THIS EXISTS ──
 * pickPractice() has always supported a seeded reshuffle, and NO CALL SITE EVER
 * PASSED ONE. Without a seed it returns pool.slice(0, n) — the same first 8 objective
 * or 4 productive items, in authored order, for every learner, forever. Measured
 * across the bank that meant 208 of 1390 items reachable (15%); the fide pools, 125
 * items each, exposed 8. The shuffle was written for exactly this and never called.
 *
 * ── WHY A TIMESTAMP, AND NOT AN ID ──
 * There is no per-run identifier to key on. SwissSession exists in the schema but no
 * code reads or writes it, and SwissAttempt.itemId is a required FK to SwissItem — a
 * table nothing populates, because items are served from JSON bundles and have no DB
 * id at all. The AUTH session id would be stable for its full 30-day life, which
 * would freeze one learner's eight items for a month: variety between users, none for
 * the user. So the seed is per-request, mixed with the user id so two learners
 * starting in the same millisecond still diverge.
 *
 * ── THE TRADE-OFF, STATED RATHER THAN IMPLIED ──
 * This gives full reachability (every item can be served), variety across runs, and
 * zero repeats WITHIN a run — the same standard almi-celpip and almi-goethe meet.
 * What it does NOT give is a guaranteed per-learner sweep: nothing records what you
 * saw last time, so a later run may repeat an earlier item before showing everything.
 * Guaranteeing that needs persisted per-run state (a plan column and a migration),
 * which this product deliberately avoids — it serves from bundles and keeps no item
 * rows. For practice, occasional cross-run review is acceptable; a learner never
 * seeing 94% of the bank was not.
 */
export function runSeed(userId: string): number {
  return (Date.now() ^ hashSeed(userId)) >>> 0;
}

/**
 * Deterministically pick up to n practice items for a language + exam + skill. With
 * no seed the natural (authored) order is preserved; a numeric seed produces a
 * stable reshuffle for variety. Never uses Math.random.
 *
 * CALLERS MUST PASS A SEED — use runSeed(user.id). Omitting it is what left 85% of
 * the bank unreachable; the parameter stays optional only so the proof and the
 * selftest can request a fixed, reproducible order.
 */
export function pickPractice(
  e: ExamMeta,
  skill: SwissSkill,
  n: number,
  seed?: number,
): SwissItemSeed[] {
  const pool = itemsForSurface(e, skill);
  const ordered =
    seed === undefined ? pool : stableShuffle(pool, seed ^ hashSeed(`${e.slug}:${skill}`));
  return ordered.slice(0, Math.max(0, n));
}

/** How many items exist for a surface — the Rule #7 (≥15 per module per language
 *  track) check, and the honest answer to "is this module ready to ship?". */
export function itemCount(e: ExamMeta, skill: SwissSkill): number {
  return itemsForSurface(e, skill).length;
}
