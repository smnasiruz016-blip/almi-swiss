// STRUCTURAL DEGENERACY — is a MATCHING or ORDERING key answerable with no language?
//
// ONE DEFINITION, TWO CALLERS. The re-key script (rekey-structural.mts) redraws until a
// key passes this predicate; the build gate (answer-distribution-gate.mts) fails the
// build if a served key does not. They MUST agree: a repair that satisfies a weaker rule
// than the gate leaves the build red, and a gate weaker than the repair is a gate that
// cannot see what the repair was for. So neither owns it — this module does, and both
// import it. There is nowhere for the two to drift apart.
//
// THE CLASS. answer-distribution-gate.mts scores POSITION: no single option index may
// hold too much of a section. MATCHING and ORDERING are excluded from that rule, and
// correctly so — no single index gives them away. The giveaway is the shape of the whole
// key, and it is not a weaker defect:
//
//   MATCHING [[0,0],[1,1],[2,2],[3,3]]  "pair them straight down"      scores 100%
//   ORDERING [0,1,2,3]                  "press submit untouched"        scores 100%
//
// BOTTOM TO TOP IS NOT HARDER THAN TOP TO BOTTOM, so the reversal is scored on exactly
// the same footing as the identity. AlmiDanish shipped a reversed MATCHING key that read
// as clean because only the diagonal was checked.
//
// AND THERE ARE TWO REVERSALS, NOT ONE. A matching item prints MORE right options than
// it has left rows — that is what makes some of them distractors. So "bottom to top"
// splits in two, and they coincide only when the columns happen to be the same length:
//
//   r === pairs.length-1-l   up the paired ROWS
//   r === right.length-1-l   up the COLUMN AS PRINTED, which is what the learner sees
//
// AlmiSwiss shipped two live items keyed [[0,4],[1,3],[2,2],[3,1]] over 5 options —
// fide German READING "Wer entscheidet worüber?" and getting-started French READING "Où
// est-ce que j'achète ça ?". Every row pairs to right.length-1-l, so starting at the last
// option and walking up scored 100% with no German or French. Against pairs.length-1-l
// they score 0/4, and the external audit reported PASS on both. All three readings are
// scored here.
//
// NEAR-DEGENERACY COUNTS. A 75% diagonal is as gameable as a 100% one, and 75% is
// exactly what "Vier Anrufe am Arbeitsplatz" shipped. The threshold is measured, not
// chosen: across the sibling banks the two classes separate cleanly — degenerate keys sit
// at 100%, sound ones top out around 33% for pairs and 50% for orders. 0.7 sits in both
// gaps. Worth re-measuring if this product ever authors longer sequences, where
// half-in-place is easier to hit by chance.

/** At or above this share of a key running a no-language line, the item is gameable. */
export const NEAR_DEGENERATE = 0.7;

/** Below 3 positions there is no shape to read — every 2-element permutation is both a
 *  derangement and the reversal, so scoring it would fail items nothing can fix. */
export const MIN_POSITIONS = 3;

export type Reading = { label: string; matched: number; share: number };

/** How far a MATCHING key runs along each no-language line. `nRight` is the number of
 *  options actually PRINTED, which is normally larger than the number of rows. */
export function matchingReadings(pairs: readonly (readonly number[])[], nRight: number): Reading[] {
  const n = pairs.length;
  const count = (f: (l: number) => number) => pairs.filter(([l, r]) => r === f(l)).length;
  const readings: Reading[] = [
    { label: "straight down", matched: count((l) => l), share: 0 },
    { label: "bottom to top", matched: count((l) => n - 1 - l), share: 0 },
  ];
  // Only a distinct line when the columns differ; otherwise it IS "bottom to top".
  if (nRight > 0 && nRight !== n) {
    readings.push({ label: `bottom to top down the printed column of ${nRight}`, matched: count((l) => nRight - 1 - l), share: 0 });
  }
  return readings.map((r) => ({ ...r, share: n ? r.matched / n : 0 }));
}

/** How far an ORDERING key runs along each no-language line. */
export function orderingReadings(order: readonly number[]): Reading[] {
  const n = order.length;
  return [
    { label: "already in the printed order", matched: order.filter((v, i) => v === i).length },
    { label: "the printed order reversed", matched: order.filter((v, i) => v === n - 1 - i).length },
  ].map((r) => ({ ...r, share: n ? r.matched / n : 0 }));
}

/** The single worst no-language reading, or null when the key is too short to have a
 *  shape. Callers compare `.share` against NEAR_DEGENERATE. */
export function worstReading(readings: Reading[], n: number): Reading | null {
  if (n < MIN_POSITIONS) return null;
  return readings.reduce((a, b) => (b.share > a.share ? b : a));
}

export function isDegenerate(worst: Reading | null): boolean {
  return worst !== null && worst.share >= NEAR_DEGENERATE;
}

/** One printable line explaining why a key is gameable. */
export function explain(worst: Reading, n: number): string {
  const pc = `${Math.round(worst.share * 100)}%`;
  return worst.share === 1
    ? `all ${n} positions run ${worst.label} — answering that way scores 100% without reading`
    : `${worst.matched} of ${n} positions (${pc}) run ${worst.label} — answering that way scores ${pc} without reading`;
}
