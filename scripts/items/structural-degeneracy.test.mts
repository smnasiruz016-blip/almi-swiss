// PROOF for the structural-degeneracy predicate behind the MATCHING/ORDERING build gate.
//
// WHY THIS FILE EXISTS. The gate was RED-proven against the real bank by restoring the
// three keys that actually shipped, and that is the proof that matters most. But the bank
// cannot exercise every branch:
//
//   • Every ORDERING key in the bank is length 5, and a PERMUTATION CAN NEVER HAVE
//     EXACTLY n-1 POSITIONS ON A LINE — fixing n-1 of them forces the nth. So a
//     5-element order can only sit at 0 / 20 / 40 / 60 / 100%, and the near band
//     (70–99%) is UNREACHABLE. Exact identity and exact reversal are the only reachable
//     degenerate states there, and both are proven against the bank. The near-ORDERING
//     branch first becomes reachable at n = 7 (5 of 7 = 71%), which this product does not
//     author yet — so it is proven here instead of left as untested code that would ship
//     the day someone writes a longer sequence.
//   • The non-square printed-column reading needs leftN !== rightN. Every square fixture
//     collapses it onto the ordinary reversal and cannot tell the two apart — which is
//     exactly how two 100%-gameable Swiss keys passed an external audit whose proofs were
//     all square.
//
// Run: npm run gate:structural:test

import { NEAR_DEGENERATE, matchingReadings, orderingReadings, worstReading, isDegenerate } from "./structural-degeneracy.mjs";

let failed = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (!cond) failed++;
  console.log(`${cond ? "✓" : "✗"} ${name}${detail && !cond ? `\n    ${detail}` : ""}`);
}
const matchWorst = (pairs: number[][], nRight: number) => worstReading(matchingReadings(pairs, nRight), pairs.length);
const orderWorst = (order: number[]) => worstReading(orderingReadings(order), order.length);

// ── MATCHING, square ────────────────────────────────────────────────────────
ok("identity matching is degenerate", isDegenerate(matchWorst([[0, 0], [1, 1], [2, 2], [3, 3]], 4)));
ok("reversed matching is degenerate", isDegenerate(matchWorst([[0, 3], [1, 2], [2, 1], [3, 0]], 4)));
ok("a mixed square key is not", !isDegenerate(matchWorst([[0, 1], [1, 3], [2, 0], [3, 2]], 4)));

// ── MATCHING, NON-SQUARE — the reading a square fixture cannot see ──────────
// The exact key fide-german READING and getting-started-french READING both shipped.
const col = matchWorst([[0, 4], [1, 3], [2, 2], [3, 1]], 5);
ok("non-square: bottom-to-top down the printed column is degenerate", isDegenerate(col));
ok("…and it is reported as the COLUMN reading, not the row one",
  col!.label.includes("printed column"), `got: ${col?.label}`);
ok("…while the row reading alone would have scored it 0/4 and passed",
  matchingReadings([[0, 4], [1, 3], [2, 2], [3, 1]], 5).find((r) => r.label === "bottom to top")!.matched === 0);

// The near case on the same axis, and the 75% key that started all this.
ok("non-square: near-reversed down the column is degenerate", isDegenerate(matchWorst([[0, 4], [1, 3], [2, 2], [3, 0]], 5)));
ok("the 75% key Swiss shipped is degenerate", isDegenerate(matchWorst([[0, 4], [1, 2], [2, 1], [3, 0]], 5)));

// The three keys the bank was re-keyed TO must pass — a rule that rejects its own
// remediation is not a rule.
for (const [name, pairs] of [
  ["Vier Anrufe am Arbeitsplatz", [[0, 1], [1, 4], [2, 3], [3, 2]]],
  ["Wer entscheidet worüber?", [[0, 1], [1, 0], [2, 3], [3, 4]]],
  ["Où est-ce que j'achète ça ?", [[0, 2], [1, 0], [2, 3], [3, 4]]],
] as [string, number[][]][]) {
  const w = matchWorst(pairs, 5);
  ok(`re-keyed "${name}" passes (worst ${Math.round((w?.share ?? 0) * 100)}%)`, !isDegenerate(w));
}

// A short key has no shape to read; scoring it would fail items nothing can fix.
ok("a 2-pair key is not judged", matchWorst([[0, 1], [1, 0]], 2) === null);

// ── ORDERING ────────────────────────────────────────────────────────────────
ok("ordering already in the printed order is degenerate", isDegenerate(orderWorst([0, 1, 2, 3, 4])));
ok("ordering exactly reversed is degenerate", isDegenerate(orderWorst([4, 3, 2, 1, 0])));
ok("a mixed order is not", !isDegenerate(orderWorst([0, 3, 2, 4, 1])));

// THE BRANCH THE BANK CANNOT REACH. At n=5 the near band is empty: 3 of 5 is 60%, and
// 4 of 5 is impossible. At n=7, 5 of 7 = 71% clears the threshold.
ok("n=5: 3-of-5 on the reversal is 60% and correctly passes",
  !isDegenerate(orderWorst([4, 3, 2, 0, 1])) && Math.abs(orderWorst([4, 3, 2, 0, 1])!.share - 0.6) < 1e-9);
const near7 = orderWorst([6, 5, 4, 3, 2, 0, 1]);   // reversed, last two swapped → 5 of 7
ok("n=7: 5-of-7 on the reversal (71%) is degenerate",
  isDegenerate(near7), `share=${near7?.share.toFixed(3)} threshold=${NEAR_DEGENERATE}`);
ok("n=7: 4-of-7 (57%) still passes", !isDegenerate(orderWorst([6, 5, 4, 0, 1, 2, 3])));

console.log(failed === 0
  ? `\n✓ STRUCTURAL-DEGENERACY PROOF: every branch behaves as specified, including the non-square column reading and the near-ordering band the bank's 5-element keys cannot reach.`
  : `\n✗ STRUCTURAL-DEGENERACY PROOF: ${failed} case(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
