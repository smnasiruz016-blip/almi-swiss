# RESUME — AlmiSwiss content batch

Save point 2026-07-27. Branch `ch-degame-hardened`. **Nothing deployed, nothing pushed.**

## Open tomorrow

1. **Re-author `Annonce dans le parking`** (`src/data/items/fide-french-listening.json`) — the line
   `Merci de sortir votre voiture avant cette heure.` Two independent Whisper models hear
   *avant cette heure* as **avant sept heures**. The audio is faithful; the text is
   phonetically ambiguous, and in an announcement about a closing time a candidate could
   mishear it as a different time. Suggested: `avant 22h` or `avant la fermeture`. Then
   `python scripts/items/synth-listening.py --only="Annonce dans le parking"` and re-verify
   that one clip.
2. **Nasir's decision: promote the Whisper confirm model from `small` to `medium`** across
   all 340. `medium` demonstrably transcribes correctly what `small` mis-heard on at least
   two clips, so it would legitimately raise 332/340 — but it also clears failures, so it
   is a decision to take deliberately rather than a re-measurement to slip in. Cost is
   local CPU time only. Set via `WHISPER_CONFIRM=medium`.

## What IS applied to the bank in this commit

- **Umlaut restoration** — 239 occurrences across the 4 telc/Goethe German bundles, from
  the reviewed list in `reports/umlaut-decided.json`. `Goethe`, `Betreuerin`, `einbauen`
  left as written; `Grüezi` hand-typed.
- **7 binary re-authorings** — 4 in `FIDE::CITIZENSHIP::DE::LISTENING` (8/17 → 12/13, 68% → 52%),
  1 in `TELC_GOETHE::DE::LISTENING` and 2 in `TELC_GOETHE::DE::READING` (both 67% → 50%).
  In all three pools an absolute word no longer predicts the key.

## What is STAGED BUT NOT APPLIED — dry-run scripts, nothing written to the bank

Each refuses rather than half-applying. Run with `--write` when the batch is triggered.

| | script | state |
|---|---|---|
| 37 de-gamed structural keys | `scripts/items/degame-structural.mts` | proven by `verify-degame.mts`, **not written** |
| 120 getting-started CEFR levels | `scripts/items/apply-cefr.mts` | reads `reports/getting-started-cefr-decided.json`, **not written** |
| listening `audioUrl` wiring | `scripts/items/wire-listening-audio.mts` | **refuses** — 8 items would have no audio |

CV5: the false positives were a fault in the audit check itself (`almi-audit`), not in this
bank. No change was required here, and none was made.

## Audio

340 clips, **332 match their transcript**. The 8 below the 85% line are classified in
`reports/audio-verify-failures.json`: 7 accepted-below-threshold with evidence, 1 needing
the authoring fix above, **0 needing re-recording**. The threshold was not moved.

`public/audio/ch/` (411 MB) and `.piper-voices/` (242 MB) are gitignored — regenerable and
not repo content. **The files on disk are the only copy.** Do not `git clean -fdx` this
tree without re-rendering:

```
python scripts/items/synth-listening.py       # ~2h, local, free
python scripts/items/verify-listening-audio.py
```

Superseded pre-fix measurements are kept but renamed so they cannot be read as current:
`reports/SUPERSEDED-audio-verify-*`.
