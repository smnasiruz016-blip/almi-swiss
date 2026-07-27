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

### GATE-BLIND, HUMAN-VERIFIED — watchlist of 2

**No model in either render hears the keyed time in these two clips.** The audio was
confirmed correct by human ear (Nasir (abba g), 2026-07-27) and both are ACCEPTED, but the numeric
gate cannot verify them and a future genuine break would look identical to today's
accepted state.

| clip | keyed time the gate cannot see | evidence |
|---|---|---|
| `Annonce à la gare : train supprimé` | `16h20` / `16h50` | `medium` and `large-v3` both transcribe "CH20"/"CH50"; re-synthesised once, hour still unheard |
| `Annonce à l'atelier` | `treize heures` | both models transcribe "3 heures"; re-synthesised once, no change. Same clip's `11h30` and `midi et demi` transcribe perfectly |

**Any future regeneration of these two requires a human ear-check.** A green sweep does not
cover them. (`Annonce dans le train : quai` is NOT on this list — `large-v3` hears
`15h10` correctly after re-synthesis, so it is a `medium`-only miss, not a blind spot.)

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
