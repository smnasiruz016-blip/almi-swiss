// ITEM-ID COLLISION GATE.
//
// Grading is server-authoritative: /api/ch/submit re-loads an item by its stable id
// (hash of language|track|exam|skill|title) and grades against the SERVER-held answer
// key. If two bundle items hashed to the same id, getItemById() would return the wrong
// one and a learner's answer would be graded against a DIFFERENT item's key — silently.
// This gate refuses the build in that case.
//
// SEEN RED: duplicate a (language,track,exam,skill,title) tuple in any bundle → throws.
//
// Run: npm run gate:item-id

import { assertNoIdCollisions } from "../../src/lib/ch/items";

try {
  assertNoIdCollisions();
  console.log("✓ ITEM-ID GATE: every served item's stableItemId is unique.");
} catch (e) {
  console.error(`\n✗ ITEM-ID COLLISION GATE FAILED\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
