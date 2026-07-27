# Reconcile machine audio-verify output into the HUMAN failure report.
#
#   python scripts/items/reconcile-audio-verify.py            (dry run, prints the plan)
#   python scripts/items/reconcile-audio-verify.py --write    (applies it)
#
# reports/audio-verify-failures.json is not a machine artefact. Each entry carries a
# hand-written `classification` and `reason` — the evidence that a below-threshold clip
# was listened to and judged, which is the difference between "8 failures" and "8
# failures we understand". Regenerating that file from a sweep silently deletes all of
# it, and the deletion is invisible: the file still looks like a valid report.
#
# So the sweep writes only reports/audio-verify-machine.json, and this script merges:
#   - a clip that still fails KEEPS its classification and reason
#   - a clip whose evidence no longer matches what was measured is kept but flagged
#     `recheck`, because a reason written about the small model's mishearing is not
#     automatically true of the medium model's
#   - a clip that now passes is REMOVED from failures and written to
#     reports/audio-verify-resolved.json — moved, not shredded, so the reasoning behind
#     an accepted clip survives the clip ceasing to fail
#   - a clip failing for the first time gets classification UNCLASSIFIED, which is a
#     to-do for a human, not a verdict

import io
import json
import os
import sys

MACHINE = os.path.join("reports", "audio-verify-machine.json")
FAILURES = os.path.join("reports", "audio-verify-failures.json")
RESOLVED = os.path.join("reports", "audio-verify-resolved.json")
# Human verdicts, same convention as reports/umlaut-decided.json. Kept OUT of this script
# so that adjudicating a clip is an edit to a data file a person can read and diff, not an
# edit to code. A decided verdict supersedes an older reason — a reason written about a
# recall miss does not automatically cover a numeric red raised later — but the older text
# is preserved in `superseded_reason` rather than dropped.
DECIDED = os.path.join("reports", "audio-verify-decided.json")
WRITE = "--write" in sys.argv

if not os.path.exists(MACHINE):
    raise SystemExit(f"{MACHINE} not found — run verify-listening-audio.py first")

machine = json.load(io.open(MACHINE, encoding="utf8"))
records = machine["records"]
prior = {e["stem"]: e for e in json.load(io.open(FAILURES, encoding="utf8"))} if os.path.exists(FAILURES) else {}

failing = [r for r in records if not r["recall_ok"] or not r["numbers_ok"]]
failing_stems = {r["stem"] for r in failing}

decided = {}
if os.path.exists(DECIDED):
    decided = json.load(io.open(DECIDED, encoding="utf8"))["verdicts"]

out, fresh, carried, flagged = [], [], [], []
adjudicated, superseded = [], []
for r in sorted(failing, key=lambda x: x["recall"]):
    e = {
        "stem": r["stem"], "lang": r["lang"], "title": r["title"],
        "recall": r["recall"], "missing": r["missing"],
    }
    if not r["numbers_ok"]:
        # A numeric failure is a different animal from a low aggregate and must not be
        # filed as one: it names a specific spoken fact that is not in the audio.
        e["numbers_expected"] = r["numbers_expected"]
        e["numbers_missing"] = r["numbers_missing"]
        e["recall_ok"] = r["recall_ok"]
    p = prior.get(r["stem"])
    d = decided.get(r["stem"])
    if d:
        e["classification"] = d["classification"]
        e["reason"] = d["reason"]
        if p and p.get("reason") and p["reason"] != d["reason"]:
            e["superseded_reason"] = p["reason"]
            superseded.append(r["stem"])
        adjudicated.append(r["stem"])
    elif p and p.get("classification"):
        e["classification"] = p["classification"]
        e["reason"] = p["reason"]
        if p.get("missing") != r["missing"] or not r["numbers_ok"]:
            e["recheck"] = (
                f"measured again under confirm={machine['confirm_model']}; "
                f"prior recall {p.get('recall')} on missing {p.get('missing')}. "
                "Re-read the reason against the new evidence before trusting it."
            )
            flagged.append(r["stem"])
        else:
            carried.append(r["stem"])
    else:
        e["classification"] = "UNCLASSIFIED"
        e["reason"] = ""
        fresh.append(r["stem"])
    out.append(e)

resolved = [dict(prior[s], resolved_note=f"no longer failing under confirm={machine['confirm_model']}")
            for s in prior if s not in failing_stems]

print(f"machine record: {len(records)} clips, confirm model {machine['confirm_model']}, threshold {machine['threshold']}")
print(f"still failing:  {len(out)}")
print(f"  adjudicated from {DECIDED}: {len(adjudicated)}")
print(f"    of which superseded an older reason (kept in superseded_reason): {len(superseded)}  {superseded}")
print(f"  reason carried forward unchanged: {len(carried)}")
print(f"  reason carried but FLAGGED recheck: {len(flagged)}  {flagged}")
print(f"  new, needs a human verdict:        {len(fresh)}  {fresh}")
print(f"resolved (moved to {RESOLVED}): {len(resolved)}  {[r['stem'] for r in resolved]}")

kept_reasons = sum(1 for e in out if e.get("reason"))
print(f"\nhuman reasons preserved: {kept_reasons} in failures + {len(resolved)} in resolved "
      f"= {kept_reasons + len(resolved)} (was {sum(1 for p in prior.values() if p.get('reason'))})")

if not WRITE:
    print("\nDRY RUN — nothing written. Re-run with --write to apply.")
    sys.exit(0)

with io.open(FAILURES, "w", encoding="utf8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
if resolved:
    with io.open(RESOLVED, "w", encoding="utf8") as fh:
        json.dump(resolved, fh, ensure_ascii=False, indent=1)
print(f"\nwrote {FAILURES} ({len(out)}) and {RESOLVED} ({len(resolved)})")
