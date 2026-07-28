# RESUME — AlmiSwiss content batch

Save point 2026-07-27. Branch `ch-degame-hardened`. **Nothing deployed, nothing pushed.**

## Open tomorrow

1. ~~**Re-author `Annonce dans le parking`**~~ — **DONE 2026-07-27.** Sentence 2 now reads
   `Merci de sortir votre voiture avant la fermeture.` The clip was re-synthesised under the
   same filename and re-verified: **78.3% → 82.6%**. Both Whisper models now transcribe the
   line verbatim — the *avant sept heures* mishearing is gone. The title, sentence 1
   (`le parking ferme à 22h`), the question, the options and `correctIndex: 0` were not
   touched, so the key is unchanged. It still sits under the 85% line, but on the salutation
   alone (`chères clientes, chers clients` — French pronounces the plural identically to the
   singular, and both models write it back singular). That is the morphology artifact already
   accepted on `Annonce au magasin`, so the entry is reclassified **ACCEPTED** in
   `reports/audio-verify-failures.json`. The salutation was deliberately left as written.
2. ~~**Promote the Whisper confirm model from `small` to `medium`**~~ — **DECIDED AND
   APPLIED 2026-07-27.** `medium` is now the default confirm model. It is recorded as a
   deliberate promotion rather than a re-measurement because it clears failures: of the 7
   clips that left the failure list, only 4 are attributable to the model (`small` still
   below the line); 3 crossed on the content-set change alone. **`WHISPER_CONFIRM=small`
   reverts it.** `medium` is not uniformly better — it scored *lower* on several clips
   (`Zwei Kolleginnen` 100.0% → 90.5%, `Deux amis` 100.0% → 90.9%). Both numbers are kept
   per clip in `reports/audio-verify-machine.json` (`recall_small`, `recall_medium`).

## What IS applied to the bank in this commit

- **Umlaut restoration** — 239 occurrences across the 4 telc/Goethe German bundles, from
  the reviewed list in `reports/umlaut-decided.json`. `Goethe`, `Betreuerin`, `einbauen`
  left as written; `Grüezi` hand-typed.
- **7 binary re-authorings** — 4 in `FIDE::CITIZENSHIP::DE::LISTENING` (8/17 → 12/13, 68% → 52%),
  1 in `TELC_GOETHE::DE::LISTENING` and 2 in `TELC_GOETHE::DE::READING` (both 67% → 50%).
  In all three pools an absolute word no longer predicts the key.

## Staged scripts — ALL 3 APPLIED 2026-07-27

| | script | state |
|---|---|---|
| 37 de-gamed structural keys | `scripts/items/degame-structural.mts` | **APPLIED — `76b5081`** |
| 120 getting-started CEFR levels | `scripts/items/apply-cefr.mts` | **APPLIED — `76b5081`** |
| 340 listening `audioUrl` wiring | `scripts/items/wire-listening-audio.mts` | **APPLIED — `eeb2bf1`** · pending pre-ship browser + build checks |

**De-game, measured by state on the WRITTEN bank** — not predicted from a dry run:

- `verify-degame.mts`: degenerate **37/37 → 0/37**; meaning preserved **37/37** (same
  strings paired, same steps in sequence); permuted key scores full marks **37/37**
  through `src/lib/ch/grading` — the product's own grader, not the audit's opinion of it.
- Independent second detector, `almi-audit` **B1m**, run against this bank: **PASS, 37
  checked, none is the identity.** The same command at the previous commit reports
  `✗ 37 of 37` — so B1m has been seen RED and GREEN across exactly this change, which is
  the only thing that makes the green mean anything.
- `npm run gate:answer-distribution`: 36 sections, no gameable position pattern.

**CEFR** — 120 items levelled A1×51 / A2×69 from `reports/getting-started-cefr-decided.json`.
Levels are never re-derived at write time. 10/10 by-state checks: only nulls filled, no
existing level overwritten, only `getting-started` bundles touched, no field other than
`payload`/`answer`/`cefr` changed anywhere, and no bundle's line-ending style altered
(`fide-german-listening.json` is LF-only and stayed LF-only).

Both were written by the surgical writers in `scripts/items/json-text-edit.mts` (`eabef9f`),
which replace only the character span of a changed value. The bundles are NOT in one
format — 17 of 34 are hand-formatted and do not round-trip through `JSON.stringify`, and
line endings are split 29 CRLF / 5 LF with no `.gitattributes`. Any whole-file
re-serialiser reformats half the bank and buries the key changes. Final footprint: 20
files, **+282 / −162**.

**AUDIO WIRING — applied `eeb2bf1`.** All **340** listening items carry an `audioUrl`, and
the renderer plays it: `TtsAudio` uses a native `<audio>` element when a clip exists
(play/pause/seek, works with no voice pack installed, the same audio for every candidate)
and falls back to `SpeechSynthesis` only where there is none.

The refusal was never about missing files. By the time it ran, all 10 held clips existed on
disk and all 10 carried a written ACCEPTED verdict — the tool was still applying the older
rule "anything the content check flagged is unexamined". The accept rule now reads:

| | |
|---|---|
| file exists AND recall ≥ threshold AND every number heard | wire — **330 clips** |
| file exists AND below threshold BUT adjudicated with evidence | wire — **10 clips** |
| below threshold with no written verdict | **REFUSE** |
| no clip file, or never measured at all | **REFUSE** |

The guarantee is unchanged: every served listening item plays the same audio for every
candidate. What changed is that "verified" now includes "a human looked and wrote down
why" — the only thing that can clear a defect the instrument cannot see. Both refusal
paths were seen RED in a sandbox before applying (delete a clip file; strip a verdict).

**The wiring was inert at first, and `verify-items` caught it** — `payload key "audioUrl"
is not read by any renderer`. It was right: nothing outside the JSON read the field, so
340 wired URLs would have left every candidate on device-dependent TTS while the bank
claimed to have audio. Adding `audioUrl` to `KNOWN_PAYLOAD_KEYS` alone would have made
that gate a rubber stamp for exactly what it exists to catch, so the renderer was wired
first and the allowlist second.

By state, **7/7**: all 340 have an `audioUrl`; every URL resolves to a file that exists;
every wired clip opens as a readable non-empty WAV; all 10 accepted-with-evidence clips are
wired and playable; only `payload.audioUrl` changed anywhere; no line-ending style altered.

### ⚠ Two verification gaps BEFORE this ships

1. **`npm run build` has never run.** It invokes `prisma migrate deploy`, which needs a
   live `DATABASE_URL`. What HAS run: `tsc --noEmit` (clean apart from a pre-existing
   `export-binary-skew` error) and all four item gates. The production build is unverified
   — run it once wherever a database is reachable.
2. **Nobody has clicked play.** The `<audio>` path and the "transcript stays hidden until
   asked for" behaviour are verified by reading code and by types, not by a browser. There
   is no ESLint config in this repo, so no a11y lint ran either. One manual pass on a
   listening item — clip plays, transcript hidden until the toggle — closes it.

CV5: the false positives were a fault in the audit check itself (`almi-audit`), not in this
bank. No change was required here, and none was made.

## Canton civic — AUDITED & VERIFIED ACCURATE 2026-07-27

The 30 `CANTON_CIVIC::KNOWLEDGE` items (15 DE + 15 FR, item-for-item parallel) were checked
by beta-g against official Swiss sources — ch.ch, admin.ch, SEM. **Factually correct and
honestly framed. No content change was required, and none was made.**

Spot-checks that carried the most risk, all confirmed:

- **"There is no single national civics test"** (DE/FR items 5 and 15) — matches the SEM
  position exactly. This is the claim the module's honesty rests on: it tells the candidate
  their result is practice, and that the commune decides whether there is a test, an
  interview, or nothing.
- **Institution numbers** (the MATCHING item) — National Council **200**, Council of States
  **46**, Federal Council **7**, Switzerland **26** cantons. `100 Mitglieder`/`100 membres`
  and `4 Bundesgerichte`/`4 tribunaux fédéraux` are **unmatched distractors, not errors**.
- **Popular initiative 100,000 / 18 months** and **optional referendum 50,000 / 100 days**.

**Not time-sensitive.** Nothing names a current office-holder or a dated vote — the module
tests stable structural facts, so it carries no living-content rot risk and needs no
periodic re-check.

Provenance lives in **`AlmiSwiss_Civic_Reference.md`** (beta-g), committed at the repo root
so the 30 verified facts survive independently of any agent's context.

**Two of the highest-consequence facts were re-verified independently** against the
official sources, rather than taken on the audit's word — they are the two whose error
would do the most damage to the module:

- **No single national civics test.** SEM, ordinary naturalisation, verbatim: *"The
  procedure in the canton and in the commune is governed by cantonal law."* and *"The
  canton may also stipulate additional integration requirements."*, with *"cantonal
  legislation requires a minimum residence period of between two and five years in the
  commune and in the canton concerned."* The page describes no national test. **Items 5
  and 15 (both languages) stand.**
- **Popular initiative 100,000 / 18 months.** EDA/FDFA, verbatim: *"For such an initiative
  to come about, the signatures of 100,000 voters who support the proposal must be
  collected within 18 months."* **Item 8 stands.** The same page also confirms item 9
  verbatim: *"In order to bring about a national referendum, 50,000 valid signatures must
  be collected within 100 days of publication of the new legislation."*

**Citations re-pinned 2026-07-28 — the doc now has working sources.** Every `ch.ch` URL in
beta-g's original section 404s, including the two carrying the initiative and referendum
figures. Rather than edit a signed audit, an **append-only appendix** was added below it
with citations that were each **fetched and seen to return real content**, with the quoted
sentence read off the page:

| Facts | Source |
|---|---|
| 3 levels · 26 cantons · NC 200 · CoS 46 · FC 7 · 3–4 votes/yr | `aboutswitzerland.eda.admin.ch/en/political-system` |
| Federal Assembly composition (200 / 46 / 246) | `aboutswitzerland.eda.admin.ch/en/the-federal-assembly-parliament` |
| Initiative 100,000 / 18 months · referendum 50,000 / 100 days | `aboutswitzerland.eda.admin.ch/en/direct-democracy` |
| No national civics test · canton-governed naturalisation | `sem.admin.ch/.../ordentlich.html` (the one original link still live) |

Four facts have **no URL by design** — four national languages (Federal Constitution Art. 4),
the Federal Presidency, Bern-as-federal-city, and the 3-month insurance deadline. The
authority is named instead. Adding a plausible-looking unverified link is the defect being
repaired, not something to add more of; pin a URL only after fetching it. `fedlex.admin.ch`
is JavaScript-only and cannot be fetched by these tools.

⚠ **The four dead `ch.ch` links still physically appear in beta-g's original section** —
that section is byte-intact by design (prefix md5 still `bf2af635`). So "every citation in
the doc resolves" is NOT true of the file as a whole; it is true of the appendix, which
states plainly that the links above it are dead. A reader who stops before the appendix
will still meet four 404s.

### Canton civic — 1 resolved, 1 open

1. ~~**`cefr = null` on all 30**~~ — **RESOLVED 2026-07-28 (abba g): correct by design, not
   a gap.** `difficulty` (FOUNDATION / CORE / STRETCH) is the axis for these items. CEFR is
   a **language**-proficiency scale and does not describe factual civics knowledge, so a
   CEFR level on a KNOWLEDGE item would assert something the item does not measure. All
   four gates pass with `cefr` null — verified: 30/30 null, all three difficulty bands
   present, `verify:items` · `conformance` · `item-id` · `answer-distribution` PASS.
   **Do not backfill these.** A future CEFR pass must skip `CANTON_CIVIC::KNOWLEDGE`; a
   levelling script that treats null as "missing" would undo a decision, not fill a hole.
2. **The bank carries no per-item `source` field — still open.** Every fact is verified but
   nothing in the data records where it came from. Provenance is deliberately kept in
   `AlmiSwiss_Civic_Reference.md` rather than added to the schema, per the `audioUrl`
   lesson: a payload key that no renderer reads is worse than none — `verify-items` rejects
   it, and adding the key to `KNOWN_PAYLOAD_KEYS` to get past that turns a real gate into a
   rubber stamp. Add a `source` field only if the product will actually render citations.
   ~~Related: four of that doc's citations are dead~~ — **CLOSED 2026-07-28**, re-pinned via
   the append-only appendix above. Working citations now exist for every fact the EDA/FDFA
   and SEM pages cover; the remaining four name their authority without a URL, on purpose.

## Productive scoring — STAGED, awaiting Nasir's GREEN

The 680 productive items (Writing + Speaking) are **48.9% of the bank**. Grading them needs
each item's own declared level, because a grader must judge a task at ITS level and an
exam label is a RANGE ("A1–B1") — a range is not a standard.

**60 items are levelled but NOT written.** `reports/productive-cefr-decided.json` holds the
verdicts; `scripts/items/apply-productive-cefr.mts` applies them and **defaults to a dry
run**. Footprint: 4 files, +60 lines, surgical. A1 10 · A2 11 · B1 39.

**Levelled by TASK TYPE, never by length.** `difficulty` is a ladder inside a module and
crosses levels; charBand/minSeconds corroborate but never decide. That rule changed two
calls: a 50-second *"Contredire poliment"* is **B1** because sustaining a differing position
is the B1 interactive act (length is a documented divergence, not a level signal), and the
three 180–380-character *"Kurze Nachricht"* items are **Goethe B1 Teil 3** — a short PART
of a B1 exam, not A2 tasks. Both would have been mis-levelled by length.

`TELC_GOETHE::DE` is **not** Goethe-only despite the filename: 18 Goethe + 12 telc, all B1,
each title self-declaring its cert. Goethe grades Schreiben on 4 criteria, telc on 3, so
each item must be graded to the cert it was authored for.

### ⚠ Three integrity findings — DECISIONS NEEDED

1. **20 items in `FIDE::CITIZENSHIP::DE` declare B2 — a level fide does not award.** The
   fide-Test Testhandbuch (Mai 2026) is explicit: the test certifies `für die Niveaus A1,
   A2 und B1`. These must NOT be graded at B2 under a fide mapper. Re-level to B1, or
   reclassify them out of the fide track. **Not touched.**
2. **No A1 productive items in `FIDE::CITIZENSHIP`** — levels present are DE A2 125 / B1 105
   / B2 20 and FR A2 139 / B1 111. A1 productive exists only in `GETTING_STARTED` (DE 11,
   FR 10). fide oral can reach A1, so this is a coverage gap, not a blocker.
3. **DELF length conformance.** The 4 B1 production-écrite items are authored at 80–120
   words; the real DELF B1 floor is **≥160**. The A1 items sit at 25–40 words against DELF
   A1's **≥40**. The LEVELS stand — task type sets the level — but the lengths do not match
   the real exam. Either re-author to real DELF lengths, or accept them as reduced-length
   B1-task practice with a written rationale. **Do not silently grade sub-length items as
   full DELF B1.**
   **Grader rule regardless:** the deterministic length veto keys off each item's authored
   `charBand`, NOT DELF's 160-word floor — otherwise all four B1 items would sit at the
   floor permanently.

### Rubric provenance (cite in each per-track constant)

Sourced by beta-g from official material; **CC did not re-verify these** — three verdicts
apply and this one is "could-not-prove (mine)":

| track | rubric | pass |
|---|---|---|
| Goethe B1 | goethe.de B1 Modellsatz — Schreiben 4 criteria (Erfüllung/Kohärenz/Wortschatz/Strukturen) A–E /100; Sprechen /100 | 60% |
| telc B1 | telc.net Übungstest 1 — Schreiben 3 criteria; Sprechen 4 criteria | ≥60% written AND oral, independently |
| DELF B1 | france-education-international.fr + delfdalf.fr — PE /25 (5 dimensions), PO /25 | 50/100 overall, **eliminatory 5/25 per skill** |
| fide | fide-Test Testhandbuch Mai 2026 — **verified by CC** | see below |

**fide, verified verbatim by CC from the Testhandbuch:** oral = `«Sprechen» zu zwei Dritteln
und «Verstehen» zu einem Drittel`; oral cut-offs A1 **26%** / A2 **65%** (A1–A2) and A2
**43%** / B1 **79%** (A2–B1); written cut-offs A1 **39%** / A2 **76%** and A2 **39%** / B1
**73%**. Critically: `Das Resultat schriftlich entspricht dem Resultat, das im Teil «Lesen
und Schreiben» erzielt wurde` — **fide has no writing-only score**, and reading is
deliberately the heavier half. So a Writing-only answer NEVER gets a fide written level.
That suppression is **fide-specific**: Goethe, telc and DELF all grade Writing
independently and must not inherit it.

## Audio

340 clips, **330 match their transcript** (hardened sweep, 2026-07-27). Threshold **0.85,
never moved**. All 10 entries in `reports/audio-verify-failures.json` are ACCEPTED with
written evidence — **0 UNCLASSIFIED, 0 needing re-recording, 0 pending re-authoring**:

- **1 recall failure** — `Annonce dans le parking`, 83.3%, salutation plural/gender
  morphology (`chères clientes, chers clients`), the artifact already accepted on
  `Annonce au magasin`.
- **9 numeric REDs** — every one of them with **passing recall** (88.9% to 97.0%). That is
  the point of the second check: before it existed, all nine were reported clean. Each is
  adjudicated in `reports/audio-verify-decided.json` — 6 proven correct by `large-v3`
  transcribing the number exactly, 3 confirmed by human ear.

Six clips that no longer fail were moved to `reports/audio-verify-resolved.json` with
their reasons intact. Reasons are never regenerated: the sweep writes only
`reports/audio-verify-machine.json` (all 340, machine fields plus the ASR text), and
merging into the human file is a separate step, `scripts/items/reconcile-audio-verify.py`,
which supersedes rather than overwrites (older text kept in `superseded_reason`).

### GATE-BLIND, HUMAN-VERIFIED — watchlist of 1

**PIPER IS NOT DETERMINISTIC — which is why this list shrank.** Four renders of the same
sentence produce four different files (4/4 distinct md5), and a word comes back correct in
some draws and mangled in others. A clip failing the gate therefore often means *this
render* was a bad draw, not that the text is wrong. `scripts/items/synth-verify-retry.py`
renders, gates, and re-renders up to 8 times, keeping the first render that clears and
recording its md5 — "this clip passed" is only ever true of the exact bytes that passed.

| clip | keyed time | status |
|---|---|---|
| `Annonce à l'atelier` | `treize heures` | **GATE-BLIND, PROVEN** — 8 independent renders, every one transcribed "3 heures" by `medium` AND `large-v3`. Re-rolling is now demonstrated not to help. Accept-with-evidence stands, and it is now *characterised* rather than assumed. Same clip's `11h30` and `midi et demi` transcribe perfectly. |

**`Annonce à la gare : train supprimé` — GRADUATED 2026-07-28, off the watchlist.** It was
a BAD DRAW, not a blind spot: the retry loop found a clean render, so the clip is now
**gate-verified** rather than ear-accepted. The shipped file was replaced —
md5 `e27b65f568…`, previous render preserved in
`C:\Projects\_audio-backups\almi-swiss-ch-2026-07-27\`. Note the new render has NOT been
heard by a human; it passes the automated gate, which is stronger evidence for the keyed
number and weaker for everything an ear would catch. Revert from the backup if that trade
is not wanted.

**Any future regeneration of `atelier` still requires a human ear-check** — a green sweep
does not cover it. (`Annonce dans le train : quai` was never on this list: `large-v3` hears
`15h10` correctly after re-synthesis, so it is a `medium`-only miss.)

**Numbers are verified as spoken.** `words()` used to rewrite "22h" to "22" and the len>2
content filter then dropped it, so a keyed time could be garbled and still score 100%.
Numbers now count in the recall set AND get a separate assertion with its own RED,
independent of the aggregate. Coverage this sweep: **562/572 numbers asserted spoken across
252 clips carrying them.** Digit and spelled-out forms fold to the same integer in both
directions (`22h` = `vingt-deux heures`, `zweiundzwanzig` = `22`, Swiss `nonante` =
French-French `quatre-vingt-dix`), including `et demie`→30, `et quart`→15 and
`moins le quart`→ hour−1 :45. Time markers (`heures`/`heure`/`uhr`) end a numeral run and
are not themselves required content — making them content silently broke 101 clips.

**ONE deliberate exception to that.** A bare standalone "one"
— `un`, `une`, `ein`, `eine`, `einer` used as a quantity rather than inside a compound — is
NOT numerically asserted. Those five words appear 464 times in the bank and are the
indefinite article in nearly all of them, so asserting them would fail every correct clip
where "une voiture" is heard as "la voiture", and a check that fires on articles is a check
somebody switches off. They still count as ordinary content words, and "one" INSIDE a
number is asserted normally (`soixante et un` -> 61, `Mitteilung eins` -> 1). This is the
right trade, but it is an honest hole in "all numbers are verified": a clip that drops a
bare spoken "un" will not go red for it.

`public/audio/ch/` (411 MB) and `.piper-voices/` (242 MB) are gitignored — regenerable and
not repo content. **The files on disk are the only copy.** Do not `git clean -fdx` this
tree without re-rendering:

```
python scripts/items/synth-listening.py            # ~2h, local, free
python scripts/items/verify-listening-audio.py     # writes reports/audio-verify-machine.json ONLY
python scripts/items/reconcile-audio-verify.py     # dry run; --write to merge into the human file
```

The verify step deliberately does NOT write `audio-verify-failures.json`. That file holds
hand-written verdicts, and a sweep that regenerates it from scratch deletes every one of
them while still looking like a valid report.

Superseded pre-fix measurements are kept but renamed so they cannot be read as current:
`reports/SUPERSEDED-audio-verify-*`.
