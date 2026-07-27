# Synthesise every listening clip. Local, free, one model load per voice.
#
#   python scripts/items/synth-listening.py            (all)
#   python scripts/items/synth-listening.py --sample
#
# The first version shelled out to `python -m piper` once per TURN, which reloaded a
# 63 MB ONNX model every time — forty clips in ten minutes, and the model load was
# almost all of it. Here each voice is loaded once and every turn that needs it is
# synthesised in the same process.
#
# Turn-splitting follows the conventions measured across all 340 transcripts:
#   59  em-dash dialogue   "— Tu viens comment au travail ?"
#   57  colon-prefixed     "Mitteilung eins:" (a label, spoken) / "Herr Ndiaye:" (a name, not)
#  224  a single block
#
# A dialogue read in one voice is not a listening test — telling the speakers apart is
# the skill — so alternate voices per speaker. An enumerated label IS content and is
# spoken; a speaker's name is not.

import io
import json
import os
import re
import sys
import unicodedata
import wave

import numpy as np
from piper import PiperVoice

ITEMS = os.path.join("src", "data", "items")
VOICES_DIR = ".piper-voices"
OUT = os.path.join("public", "audio", "ch")
SAMPLE = "--sample" in sys.argv
# --mixed re-renders only clips whose turns use more than one voice. Those are the only
# ones the sample-rate bug could corrupt; a single-voice clip was written under its own
# header and is already correct, so re-rendering all 340 would burn an hour for nothing.
MIXED_ONLY = "--mixed" in sys.argv
# --only=<substring> renders a single clip, so a fix can be proved on the exact file that
# failed before it is spent on a hundred more.
ONLY = next((a[7:] for a in sys.argv if a.startswith("--only=")), None)
# --bundle=<substring> re-renders one source bundle. Needed after a TEXT correction: the
# telc/Goethe clips were voiced from transliterated German ("Einkaeufe"), so the audio is
# wrong even though the synthesis was fine.
BUNDLE = next((a[9:] for a in sys.argv if a.startswith("--bundle=")), None)
# --titles=<file> renders exactly the clips named in a file, one title per line. Used to
# re-render only what a fix actually changed rather than the whole bank.
_tf = next((a[9:] for a in sys.argv if a.startswith("--titles=")), None)
TITLES = set(io.open(_tf, encoding="utf8").read().splitlines()) if _tf else None

VOICES = {
    "DE": ["de_DE-thorsten-medium", "de_DE-kerstin-low"],
    "FR": ["fr_FR-tom-medium", "fr_FR-siwis-medium"],
}
SAMPLE_TITLES = {
    "Le prix au marché : nonante", "Septante, nonante — et huitante ?",
    "Deux collègues parlent du trajet", "Nachricht auf dem Anrufbeantworter",
    "Vier kurze Mitteilungen", "Un message de Sara",
}

ENUMERATED = re.compile(r"\b(\d+|eins|zwei|drei|vier|fünf|un|une|deux|trois|quatre|cinq)\s*$", re.I)
SPEAKER = re.compile(r"^([A-ZÄÖÜÉÈ][\w ÄÖÜäöüéèçà.'-]{0,24}?)\s*:\s*(.+)$")

# A colon does NOT mean a speaker label. "Information aux voyageurs:", "Nächster Halt:"
# and "Prochain arrêt:" all matched the pattern above and were deleted from the spoken
# audio — the Whisper check caught the station announcement because its opening phrase
# was simply not there. A stop announcement without "Nächster Halt" is missing the
# sentence the item is testing.
#
# So a prefix is only treated as a name when it LOOKS like one. The rule is deliberately
# asymmetric: speaking a label that turns out to be a name is a blemish, deleting a line
# that turns out to be content breaks the item. When unsure, speak it.
NAMEY = re.compile(
    r"^(?:(?:Herr|Frau|M\.|Mme|Monsieur|Madame|Dr\.?|Herrn)\s+[A-ZÄÖÜÉÈ][\wäöüßéèàç'-]+"
    r"|[A-ZÄÖÜÉÈ][a-zäöüßéèàç'-]+)$"
)
DASH = re.compile(r"^[—–-]\s*(.+)$")


def turns(transcript):
    out, speakers, dash_turn = [], [], 0
    for line in [l.strip() for l in transcript.split("\n") if l.strip()]:
        m = DASH.match(line)
        if m:
            out.append((dash_turn % 2, m.group(1)))
            dash_turn += 1
            continue
        m = SPEAKER.match(line)
        if m:
            who, rest = m.group(1), m.group(2)
            if NAMEY.match(who):
                if who not in speakers:
                    speakers.append(who)
                out.append((speakers.index(who) % 2, rest))
                continue
            if ENUMERATED.search(who):
                # "Mitteilung eins:", "Message deux:" — a numbered label. It is CONTENT and
                # is spoken, but it also still rotates the voice: four announcements read
                # in one voice run together, and telling them apart is the task. Dropping
                # the rotation here silently turned eight of these into single-voice reads.
                if who not in speakers:
                    speakers.append(who)
                out.append((speakers.index(who) % 2, line))
                continue
            # A content opening — "Nächster Halt:", "Information aux voyageurs:". Spoken,
            # on whichever voice is already talking.
            v = (speakers.index(speakers[-1]) % 2) if speakers else 0
            out.append((v, f"{who}. {rest}"))
            continue
        if out:
            out[-1] = (out[-1][0], out[-1][1] + " " + line)
        else:
            out.append((0, line))
    return out or [(0, transcript)]


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60]


targets = []
for f in sorted(os.listdir(ITEMS)):
    if "listening" not in f:
        continue
    if BUNDLE and BUNDLE not in f:
        continue
    for it in json.load(io.open(os.path.join(ITEMS, f), encoding="utf8")):
        t = (it.get("payload") or {}).get("transcript")
        if not t:
            continue
        if SAMPLE and it["title"] not in SAMPLE_TITLES:
            continue
        if MIXED_ONLY and len({v for v, _ in turns(t)}) < 2:
            continue
        if ONLY and ONLY.lower() not in it["title"].lower():
            continue
        if TITLES is not None and it["title"] not in TITLES:
            continue
        targets.append((it["language"], it["title"], t, f"{slug(f[:-5])}--{slug(it['title'])}"))

os.makedirs(OUT, exist_ok=True)
print(f"{len(targets)} clip(s) to synthesise", flush=True)

loaded = {}


def voice(name):
    if name not in loaded:
        print(f"  loading {name}", flush=True)
        loaded[name] = PiperVoice.load(os.path.join(VOICES_DIR, f"{name}.onnx"))
    return loaded[name]


done = 0
def resample(pcm, src_rate, dst_rate):
    """Linear-interpolate 16-bit mono PCM to another rate.

    The voices do not agree on a sample rate — kerstin 16000, thorsten and siwis 22050,
    tom 44100 — and the first version of this concatenation wrote every turn under the
    LAST turn's header. A 44.1 kHz turn played back at 22.05 kHz is half-speed mush, so
    in a two-voice dialogue one speaker came out garbled and the other came out clean.
    That is exactly what the Whisper check found on 61 French clips.

    Turns are always resampled UP to the highest rate in the clip. Downsampling by
    dropping samples would alias, and there is no reason to spend audio quality here.
    """
    if src_rate == dst_rate:
        return pcm
    a = np.frombuffer(pcm, dtype=np.int16)
    n = int(round(len(a) * dst_rate / src_rate))
    x = np.linspace(0, len(a) - 1, n)
    return np.interp(x, np.arange(len(a)), a).astype(np.int16).tobytes()


for lang, title, transcript, stem in targets:
    parts = turns(transcript)
    names = VOICES.get(lang, VOICES["DE"])
    rendered = []
    for v, text in parts:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            voice(names[v]).synthesize_wav(text, w)
        buf.seek(0)
        with wave.open(buf, "rb") as r:
            rendered.append((r.getparams(), r.readframes(r.getnframes())))

    rate = max(p.framerate for p, _ in rendered)
    widths = {p.sampwidth for p, _ in rendered}
    channels = {p.nchannels for p, _ in rendered}
    # Only 16-bit mono is handled above. Anything else would need different unpacking, and
    # silently writing it under the wrong header is the bug this function exists to fix.
    if widths != {2} or channels != {1}:
        raise SystemExit(f"{stem}: unexpected format widths={widths} channels={channels}")

    with wave.open(os.path.join(OUT, f"{stem}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        for p, fr in rendered:
            w.writeframes(resample(fr, p.framerate, rate))
    done += 1
    if done % 20 == 0 or done == len(targets):
        print(f"  {done}/{len(targets)}", flush=True)

print(f"\n{done} clip(s) written to {OUT}. Cost: nothing — Piper runs on this machine.")
