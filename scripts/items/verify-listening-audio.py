# CONTENT CHECK for generated listening audio. Local, free, no account.
#
#   python scripts/items/verify-listening-audio.py
#
# Rendering audio proves a file exists. It does not prove the file says what the
# transcript says — a dropped turn, a silent chunk, a voice reading the wrong part or a
# synth that truncated at a character limit all produce a perfectly valid WAV.
#
# So each clip is transcribed back with Whisper, running on this machine, and compared
# with its source. The comparison is on CONTENT WORDS, not characters: a speech-to-text
# pass will differ on punctuation, casing and digits ("14 Uhr" heard as "vierzehn Uhr")
# without anything being wrong with the audio. What it must not differ on is which words
# were spoken.

import io
import json
import os
import re
import sys
import unicodedata

from faster_whisper import WhisperModel

ITEMS = os.path.join("src", "data", "items")
AUDIO = os.path.join("public", "audio", "ch")

NUMBERS = {
    "null": "0", "eins": "1", "ein": "1", "eine": "1", "zwei": "2", "drei": "3", "vier": "4",
    "fünf": "5", "sechs": "6", "sieben": "7", "acht": "8", "neun": "9", "zehn": "10",
    "elf": "11", "zwölf": "12", "dreizehn": "13", "vierzehn": "14", "achtzehn": "18",
    "zwanzig": "20", "dreissig": "30", "dreißig": "30",
    "onze": "11", "zwoelf": "12", "fuenfzehn": "15", "fünfzehn": "15", "sechzehn": "16",
    "siebzehn": "17", "neunzehn": "19", "dreissig": "30", "vierzig": "40", "fünfzig": "50",
    "fuenfzig": "50", "sechzig": "60",
    "un": "1", "une": "1", "deux": "2", "trois": "3", "quatre": "4", "cinq": "5",
    "six": "6", "sept": "7", "huit": "8", "neuf": "9", "dix": "10", "vingt": "20",
    "septante": "70", "huitante": "80", "nonante": "90",
    "onze": "11", "douze": "12", "treize": "13", "quatorze": "14", "quinze": "15",
    "seize": "16", "trente": "30", "quarante": "40", "cinquante": "50", "soixante": "60",
    "cent": "100", "heures": "h", "heure": "h", "uhr": "h",
}


def words(text):
    t = unicodedata.normalize("NFC", text.lower())
    # SWISS ORTHOGRAPHY. Swiss Standard German has no ß — the bank correctly writes
    # Strasse, geschlossen, dreissig. Whisper's German model is trained on German German
    # and writes Straße, so every ss-word in a correct clip was being scored as a miss.
    # That is the check disagreeing with the country, not the audio being wrong.
    t = t.replace("ß", "ss")
    # CLOCK TIMES. The bank writes "16h20" and "10.30 Uhr"; the audio says "seize heures
    # vingt" and Whisper writes it back however it likes. Split the written form into its
    # numbers so both sides meet in the same place.
    t = re.sub(r"(\d{1,2})\s*[h:.]\s*(\d{2})", r"\1 \2", t)
    t = re.sub(r"(\d{1,2})\s*h\b", r"\1", t)
    t = re.sub(r"[^\w\s]", " ", t)
    out = []
    for w in t.split():
        out.append(NUMBERS.get(w, w))
    return out


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60]


# COMPARE AGAINST WHAT WAS MEANT TO BE SPOKEN, not against the raw transcript.
#
# A transcript line reads "Herr Meier: Guten Tag." The synthesiser deliberately does not
# voice "Herr Meier" — the name is a stage direction for the reader, and speaking it would
# be wrong. But the check was scoring against the raw transcript, so Meier, Costa, Nowak,
# Diallo, herr and frau all counted as content the audio had lost. Every dialogue with
# named speakers was penalised for behaving correctly, which is why the German Gespräch
# items clustered below the line.
#
# This does NOT weaken the check into "compare the audio with itself": what the splitter
# drops is separately constrained to speaker names only, and a companion assertion proves
# no other word is ever lost. Two checks, one job each — rather than one check that
# conflates "the synth dropped something" with "the synth dropped a name on purpose".
sys.path.insert(0, os.path.join("scripts", "items"))
_synth = io.open(os.path.join("scripts", "items", "synth-listening.py"), encoding="utf8").read()
_ns = {}
exec(_synth.split("targets = []")[0].replace("from piper import PiperVoice", "").replace("import numpy as np", "")
     .replace('_tf = next((a[9:] for a in sys.argv if a.startswith("--titles=")), None)', "_tf = None")
     .replace('TITLES = set(io.open(_tf, encoding="utf8").read().splitlines()) if _tf else None', "TITLES = None"), _ns)
spoken_turns = _ns["turns"]

transcripts = {}
for f in os.listdir(ITEMS):
    if "listening" not in f:
        continue
    for it in json.load(open(os.path.join(ITEMS, f), encoding="utf8")):
        t = (it.get("payload") or {}).get("transcript")
        if t:
            spoken = " ".join(s for _, s in spoken_turns(t))
            transcripts[f"{slug(f[:-5])}--{slug(it['title'])}"] = (it["language"], it["title"], spoken)

files = sorted(x for x in os.listdir(AUDIO) if x.endswith(".wav"))
if not files:
    print("no audio to check")
    sys.exit(0)

# TWO PASSES. `base` sweeps all 340 — what this hunts is GARBLED audio, and a garbled
# clip scores near zero on any model, so recall matters far more than nuance. Anything it
# flags is re-checked with `small`, which mishears fewer numerals and proper nouns, so a
# clip is only reported as failing if the careful model agrees.
SCAN = os.environ.get("WHISPER_SCAN", "base")
CONFIRM = os.environ.get("WHISPER_CONFIRM", "small")
THRESHOLD = float(os.environ.get("WHISPER_THRESHOLD", "0.85"))

print(f"transcribing {len(files)} clip(s) locally — {SCAN}, then {CONFIRM} on anything flagged\n")
model = WhisperModel(SCAN, device="cpu", compute_type="int8")
confirmer = None

bad = 0
failures = []
# Every score is kept, not just the failing ones. Whether a cluster of French clips sitting
# at 78-85% is damage or just a threshold that does not suit French elision is a question
# about the DISTRIBUTION, and it cannot be answered from a list of failures alone.
scores = []
# Progress, because the first full run printed nothing for two hours: it only spoke on
# failure, so "still working" and "hung" looked identical from outside.
for n, fn in enumerate(files, 1):
    key = fn[:-4]
    if key not in transcripts:
        print(f"  ?  {fn} — no source transcript found for this file")
        bad += 1
        continue
    lang, title, source = transcripts[key]
    segments, _ = model.transcribe(os.path.join(AUDIO, fn), language=lang.lower(), beam_size=1)
    heard = " ".join(s.text for s in segments)

    src, got = set(words(source)), set(words(heard))
    # Content words only: a one- or two-letter token is an article, and Whisper's
    # handling of those says nothing about whether the audio is right.
    src = {w for w in src if len(w) > 2}
    got = {w for w in got if len(w) > 2}
    missing = sorted(src - got)
    recall = 1 - len(missing) / max(1, len(src))

    if recall < THRESHOLD:
        # Second opinion before calling a file bad.
        if confirmer is None:
            print(f"  … loading {CONFIRM} to confirm", flush=True)
            confirmer = WhisperModel(CONFIRM, device="cpu", compute_type="int8")
        segments, _ = confirmer.transcribe(os.path.join(AUDIO, fn), language=lang.lower(), beam_size=1)
        heard = " ".join(s.text for s in segments)
        got = {w for w in words(heard) if len(w) > 2}
        missing = sorted(src - got)
        recall = 1 - len(missing) / max(1, len(src))

    ok = recall >= THRESHOLD
    if not ok:
        bad += 1
        failures.append({"stem": key, "lang": lang, "title": title, "recall": round(recall, 3), "missing": missing[:10]})
        print(f"  FAIL {recall * 100:5.1f}%  {lang}  {title}", flush=True)
        print(f"           not heard: {', '.join(missing[:8])}", flush=True)

    scores.append((recall, key, lang, title))
    if n % 20 == 0 or n == len(files):
        print(f"  … {n}/{len(files)} checked, {bad} failing", flush=True)

print(f"\n{len(files) - bad}/{len(files)} clip(s) match their transcript")

# ── the distribution, per language ───────────────────────────────────────────
# A German clip and a French clip are not measured on the same scale by this check:
# French elides and liaises, so a correct clip loses content words a German one does not.
# Comparing the two distributions is what says whether a near-line French score means the
# audio is wrong or the line is in the wrong place for French.
print("\nRECALL DISTRIBUTION")
print(f"  {'lang':<6}{'n':>5}{'min':>8}{'p10':>8}{'median':>8}{'mean':>8}   below 85%   in 75-85%")
for lg in sorted({s[2] for s in scores}):
    v = sorted(s[0] for s in scores if s[2] == lg)
    if not v:
        continue
    p10 = v[max(0, int(len(v) * 0.10) - 1)]
    med = v[len(v) // 2]
    under = sum(1 for x in v if x < THRESHOLD)
    band = sum(1 for x in v if 0.75 <= x < THRESHOLD)
    print(f"  {lg:<6}{len(v):>5}{v[0] * 100:>7.1f}%{p10 * 100:>7.1f}%{med * 100:>7.1f}%{sum(v) / len(v) * 100:>7.1f}%{under:>12}{band:>12}")
os.makedirs("reports", exist_ok=True)
with io.open("reports/audio-verify-failures.json", "w", encoding="utf8") as fh:
    json.dump(failures, fh, ensure_ascii=False, indent=1)
print(f"failures → reports/audio-verify-failures.json ({len(failures)})")
sys.exit(1 if bad else 0)
