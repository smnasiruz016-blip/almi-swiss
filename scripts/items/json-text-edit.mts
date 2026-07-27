// SURGICAL edits to a JSON file's TEXT, so a writer changes only the bytes it means to.
//
// Why this exists. The bundles in src/data/items are not written in one style: 17 of 34
// round-trip byte-identically through JSON.stringify(items, null, 2), and 17 do not —
// those are hand-formatted, with objects inline and arrays wrapped to a print width. Line
// endings are split too: 29 CRLF, 5 LF, and there is no .gitattributes or .editorconfig
// to appeal to.
//
// So ANY writer that re-serialises a whole file reformats half the bank. Re-running
// de-game would have produced a 304-line file as 384 lines: a diff where 37 real key
// changes are buried in ~2,000 lines of reflow, which is a diff nobody can review — and
// an unreviewable diff is how a bad key change gets waved through.
//
// Normalising everything to LF or to stringify output might well be worth doing. It is
// not worth doing ACCIDENTALLY, as a side effect of a de-game. That is a separate,
// deliberate commit.
//
// These helpers therefore locate the exact character span of a value and replace it in
// place. Everything outside the span keeps its bytes, whatever style it is in.

import fs from "node:fs";

/** CRLF or LF, whichever the file already uses. Mixed files are reported, not guessed at. */
export function detectEol(text: string): "\r\n" | "\n" {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  if (crlf && lf) throw new Error("mixed line endings — refusing to guess");
  return crlf ? "\r\n" : "\n";
}

/** End index (exclusive) of the JSON value starting at `i`. String-aware. */
export function valueEnd(text: string, i: number): number {
  const c = text[i];
  if (c === '"') {
    for (let k = i + 1; k < text.length; k++) {
      if (text[k] === "\\") { k++; continue; }
      if (text[k] === '"') return k + 1;
    }
    throw new Error("unterminated string");
  }
  if (c === "{" || c === "[") {
    let depth = 0;
    for (let k = i; k < text.length; k++) {
      const ch = text[k];
      if (ch === '"') { k = valueEnd(text, k) - 1; continue; }
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") { depth--; if (depth === 0) return k + 1; }
    }
    throw new Error("unterminated container");
  }
  let k = i;
  while (k < text.length && !",}]".includes(text[k])) k++;
  return k;
}

/** Spans of the top-level array elements — one per item in a bundle. */
export function itemSpans(text: string): Array<[number, number]> {
  const start = text.indexOf("[");
  if (start < 0) throw new Error("not a JSON array");
  const spans: Array<[number, number]> = [];
  let k = start + 1;
  while (k < text.length) {
    const ch = text[k];
    if (ch === "]") break;
    if (ch === "{") { const end = valueEnd(text, k); spans.push([k, end]); k = end; continue; }
    k++;
  }
  return spans;
}

/** Span of the value for `key`, searched only at the object's OWN depth so a nested
 *  `"cefr"` inside payload can never be mistaken for the item's own. */
export function keyValueSpan(text: string, objStart: number, key: string): { keyStart: number; valueStart: number; valueEnd: number } | null {
  const objEnd = valueEnd(text, objStart);
  let depth = 0;
  for (let k = objStart; k < objEnd; k++) {
    const ch = text[k];
    if (ch === '"') {
      const end = valueEnd(text, k);
      if (depth === 1) {
        const name = JSON.parse(text.slice(k, end));
        let c = end;
        while (c < objEnd && /\s/.test(text[c])) c++;
        if (text[c] === ":" && name === key) {
          let v = c + 1;
          while (v < objEnd && /\s/.test(text[v])) v++;
          return { keyStart: k, valueStart: v, valueEnd: valueEnd(text, v) };
        }
        // Skip this key's value so nested keys are never seen at depth 1.
        if (text[c] === ":") {
          let v = c + 1;
          while (v < objEnd && /\s/.test(text[v])) v++;
          k = valueEnd(text, v) - 1;
          continue;
        }
      }
      k = end - 1;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
  }
  return null;
}

/** Indentation of the line containing `i`. */
export function indentAt(text: string, i: number): string {
  const lineStart = text.lastIndexOf("\n", i) + 1;
  const m = /^[ \t]*/.exec(text.slice(lineStart, i));
  return m ? m[0] : "";
}

/** Render a value in the SAME shape as the text it replaces: single-line stays
 *  single-line, multi-line stays multi-line at the same indent. A value that was written
 *  on one line should not become eleven lines because its contents were reordered. */
export function renderLike(value: unknown, originalText: string, indent: string, eol: "\r\n" | "\n"): string {
  const wasMultiline = /\n/.test(originalText);
  if (!wasMultiline) {
    // Match the separator style already in the file (", " vs ",").
    const compact = JSON.stringify(value);
    return /,\s/.test(originalText) ? compact.replace(/,(?=\S)/g, ", ") : compact;
  }
  const pretty = JSON.stringify(value, null, 2);
  return pretty.split("\n").map((l, n) => (n === 0 ? l : indent + l)).join(eol);
}

/** Apply spans as [start, end, replacementText], right-to-left so earlier offsets hold. */
export function spliceAll(text: string, edits: Array<[number, number, string]>): string {
  return [...edits].sort((a, b) => b[0] - a[0]).reduce((acc, [s, e, r]) => acc.slice(0, s) + r + acc.slice(e), text);
}

/** Read a bundle as text + parsed items, refusing anything with mixed endings. */
export function readBundle(file: string): { text: string; eol: "\r\n" | "\n"; items: any[] } {
  const text = fs.readFileSync(file, "utf8");
  return { text, eol: detectEol(text), items: JSON.parse(text) };
}

/** Sorted-key JSON, so two graphs are compared on CONTENT and not on key order.
 *
 *  Needed because inserting a key into text puts it where the file wants it (`cefr` after
 *  `difficulty`, matching every other bundle) while `it.cefr = ...` appends it last in
 *  memory. Those are the same item. Comparing raw stringify output would fail every
 *  insert — the same key-order trap that has bitten the jsonb reconcilers. Key order in
 *  JSON carries no meaning; the TEXT position is chosen separately, for the diff. */
export function canonical(v: unknown): string {
  const walk = (x: any): any =>
    Array.isArray(x) ? x.map(walk)
      : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, walk(x[k])]))
      : x;
  return JSON.stringify(walk(v));
}

/** The writer's own guard: the edited TEXT must parse to exactly the intended graph, and
 *  it must differ from the original on no more than the lines we meant to touch. A
 *  surgical writer that silently corrupts JSON would be worse than a reformatting one. */
export function assertFaithful(before: string, after: string, expected: unknown, label: string): { changedLines: number } {
  const parsed = JSON.parse(after);
  if (canonical(parsed) !== canonical(expected)) {
    throw new Error(`${label}: edited text does not parse to the intended items`);
  }
  return diffCounts(before, after);
}

/** Real added/removed line counts via LCS.
 *
 *  Comparing line i to line i is NOT a diff: inserting one line makes every line after it
 *  "differ", which reported 120 inserted `cefr` keys as 2,611 changed lines and made a
 *  minimal edit look like a rewrite. What git would show is what matters here, because
 *  the whole point of the surgery is that a human can review the result. */
export function diffCounts(before: string, after: string): { changedLines: number; added: number; removed: number } {
  const a = before.split(/\r?\n/), b = after.split(/\r?\n/);
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const common = dp[0][0];
  const removed = n - common, added = m - common;
  return { changedLines: added + removed, added, removed };
}
