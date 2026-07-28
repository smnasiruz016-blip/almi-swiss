# RENDER-AND-VERIFY WITH RETRY. Synthesise a clip, run the content gate on it, and if it
# does not clear, render it again — up to N times — keeping the first render that passes.
#
#   python scripts/items/synth-verify-retry.py --bundle=<path.json> [--audio=<dir>]
#   python scripts/items/synth-verify-retry.py --only="Annonce à la gare" --write
#
# WHY THIS EXISTS. Piper is NOT deterministic. Four renders of the same Italian sentence
# produced four different files (4/4 distinct md5), and `parte` came back correct in two
# of them and mangled in the other two. The same draw that mangles a verb also produces
# "Valenzuolo" for Bellinzona and "9.14" for a quarter past nine. So a clip failing the
# gate does not mean the TEXT is wrong — it frequently means this particular render was a
# bad draw, and re-rolling fixes it with no content change at all.
#
# That is what was really happening on the Swiss French clips: re-synthesising
# `train : quai` fixed it while `gare` and `atelier` were unchanged. Those were three
# draws, not evidence about three texts.
#
# THE N-CAP IS THE DIAGNOSTIC, and it is the reason this is not just "retry until green".
# At the observed ~50% per-render pass rate, 8 attempts clear ~99.6% of the time. So a
# clip that survives 8 failures is almost certainly NOT a bad draw — it is a genuine
# defect or something the gate cannot see. Those are flagged for review, never shipped
# silently. Retrying without a cap would convert every real defect into a green.
#
# The accepted render's md5 is recorded, because "this clip passed" is only meaningful
# about the exact bytes that passed — the next render is a different file.

import argparse
import hashlib
import io
import json
import os
import re
import sys
import tempfile
import unicodedata
import wave

import numpy as np
from piper import PiperVoice
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("--bundle", action="append", help="bundle json (repeatable). Default: every listening bundle in src/data/items")
ap.add_argument("--audio", default=os.path.join("public", "audio", "ch"), help="where accepted clips go")
ap.add_argument("--only", default=None, help="substring of the item title")
ap.add_argument("--attempts", type=int, default=8)
ap.add_argument("--report", default=None, help="write a json report here")
ap.add_argument("--write", action="store_true", help="actually place accepted renders in --audio")
args = ap.parse_args()

VOICES_DIR = ".piper-voices"
THRESHOLD = float(os.environ.get("WHISPER_THRESHOLD", "0.85"))
CONFIRM = os.environ.get("WHISPER_CONFIRM", "medium")

# The gate and the turn-splitter, taken from the real scripts so this cannot drift from
# what the sweep actually enforces.
_v = io.open(os.path.join("scripts", "items", "verify-listening-audio.py"), encoding="utf8").read()
_vns = {"__name__": "__retry__"}
exec(_v.split("files = sorted(")[0], _vns)
# score_pair, not a local re-derivation: the recall half and the numeric half must
# forgive the same digit-grouping, and an inline copy here silently did not — this loop
# reported 40% recall on a clip whose numbers had just passed.
score_pair = _vns["score_pair"]

_s = io.open(os.path.join("scripts", "items", "synth-listening.py"), encoding="utf8").read()
_sns = {}
exec(_s.split("targets = []")[0].replace("from piper import PiperVoice", "").replace("import numpy as np", "")
     .replace('_tf = next((a[9:] for a in sys.argv if a.startswith("--titles=")), None)', "_tf = None")
     .replace('TITLES = set(io.open(_tf, encoding="utf8").read().splitlines()) if _tf else None', "TITLES = None"), _sns)
turns, VOICES = _sns["turns"], _sns["VOICES"]


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60]


def resample(pcm, src_rate, dst_rate):
    """Mirrors synth-listening.py. Voices disagree on sample rate; a turn written under
    another turn's header is half-speed mush."""
    if src_rate == dst_rate:
        return pcm
    a = np.frombuffer(pcm, dtype=np.int16)
    n = int(round(len(a) * dst_rate / src_rate))
    x = np.linspace(0, len(a) - 1, n)
    return np.interp(x, np.arange(len(a)), a).astype(np.int16).tobytes()


_loaded = {}
def voice_of(name):
    if name not in _loaded:
        print(f"  … loading voice {name}", flush=True)
        _loaded[name] = PiperVoice.load(os.path.join(VOICES_DIR, f"{name}.onnx"))
    return _loaded[name]


def render(lang, transcript, path):
    if lang not in VOICES:
        raise SystemExit(f"no voice configured for {lang!r} — refusing to substitute another language")
    names = VOICES[lang]
    rendered = []
    for v, text in turns(transcript):
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            voice_of(names[v]).synthesize_wav(text, w)
        buf.seek(0)
        with wave.open(buf, "rb") as r:
            rendered.append((r.getparams(), r.readframes(r.getnframes())))
    rate = max(p.framerate for p, _ in rendered)
    if {p.sampwidth for p, _ in rendered} != {2} or {p.nchannels for p, _ in rendered} != {1}:
        raise SystemExit("unexpected sample format")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        for p, fr in rendered:
            w.writeframes(resample(fr, p.framerate, rate))


# ── targets ──────────────────────────────────────────────────────────────────
bundles = args.bundle or [os.path.join("src", "data", "items", f)
                          for f in sorted(os.listdir(os.path.join("src", "data", "items"))) if "listening" in f]
targets = []
for b in bundles:
    stem_base = slug(os.path.basename(b)[:-5])
    for it in json.load(io.open(b, encoding="utf8")):
        t = (it.get("payload") or {}).get("transcript")
        if not t:
            continue
        if args.only and args.only.lower() not in it["title"].lower():
            continue
        spoken = " ".join(s for _, s in turns(t))
        targets.append((it["language"], it["title"], spoken, f"{stem_base}--{slug(it['title'])}"))

print(f"{len(targets)} clip(s) · up to {args.attempts} render(s) each · gate: recall >= {THRESHOLD} AND every number heard")
print(f"confirm model {CONFIRM}   accepted renders {'-> ' + args.audio if args.write else 'NOT written (dry run)'}\n")
asr = WhisperModel(CONFIRM, device="cpu", compute_type="int8")
tmp = tempfile.mkdtemp(prefix="retry-")
os.makedirs(args.audio, exist_ok=True)

rows = []
for lang, title, spoken, stem in targets:
    best = None
    accepted = None
    for attempt in range(1, args.attempts + 1):
        p = os.path.join(tmp, f"{stem}-{attempt}.wav")
        render(lang, spoken, p)
        segs, _ = asr.transcribe(p, language=lang.lower(), beam_size=1)
        heard = " ".join(s.text for s in segs).strip()
        recall, missing, nm = score_pair(spoken, heard, lang)
        md5 = hashlib.md5(io.open(p, "rb").read()).hexdigest()
        if best is None or recall > best["recall"]:
            best = {"attempt": attempt, "recall": recall, "missing": missing, "numbers_missing": nm, "heard": heard, "md5": md5, "path": p}
        if recall >= THRESHOLD and not nm:
            accepted = {"attempt": attempt, "recall": recall, "heard": heard, "md5": md5, "path": p}
            break

    if accepted:
        print(f"  CLEAR  roll {accepted['attempt']}/{args.attempts}  {accepted['recall'] * 100:5.1f}%  {lang}  {title}   md5 {accepted['md5'][:10]}")
        if args.write:
            with io.open(accepted["path"], "rb") as fh_in, io.open(os.path.join(args.audio, f"{stem}.wav"), "wb") as fh_out:
                fh_out.write(fh_in.read())
    else:
        print(f"  N-CAP  {args.attempts} render(s), none cleared  {lang}  {title}")
        print(f"         best {best['recall'] * 100:.1f}% on roll {best['attempt']}   numbers missing {best['numbers_missing']}")
        print(f"         said : {spoken}")
        print(f"         heard: {best['heard']}")
    rows.append({"stem": stem, "lang": lang, "title": title, "cleared": bool(accepted),
                 "rolls": (accepted or best)["attempt"], "recall": round((accepted or best)["recall"], 3),
                 "md5": (accepted or best)["md5"], "numbers_missing": (accepted or best).get("numbers_missing", []),
                 "heard": (accepted or best)["heard"]})

clear = [r for r in rows if r["cleared"]]
cap = [r for r in rows if not r["cleared"]]
print(f"\n{'=' * 70}")
print(f"cleared: {len(clear)}/{len(rows)}   N-cap (flagged for review): {len(cap)}")
if clear:
    rolls = [r["rolls"] for r in clear]
    print(f"rolls needed: min {min(rolls)}  max {max(rolls)}  mean {sum(rolls) / len(rolls):.2f}")
    print(f"cleared on the FIRST roll: {sum(1 for r in clear if r['rolls'] == 1)}/{len(clear)}")
for r in cap:
    print(f"  REVIEW  {r['lang']}  {r['title']}  best {r['recall'] * 100:.1f}%  numbers missing {r['numbers_missing']}")
if args.report:
    json.dump(rows, io.open(args.report, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"\nreport -> {args.report}")
if not args.write:
    print("\nDRY — no accepted render was placed. Pass --write to keep them.")
sys.exit(1 if cap else 0)
