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
#
# ─────────────────────────────────────────────────────────────────────────────
# 2026-07-27 — TWO DELIBERATE INSTRUMENT CHANGES. Both approved by Nasir, both change
# what this script measures, so scores produced after this date are NOT comparable
# clip-for-clip with scores produced before it. The threshold was NOT touched: 0.85,
# same as every run before.
#
# (1) CONFIRM MODEL PROMOTED small -> medium. `medium` demonstrably transcribes
#     correctly what `small` mis-heard on at least two clips already in the failure
#     report, so promoting it legitimately raises the pass count — which is exactly why
#     it is recorded here as a decision rather than slipped in as a re-measurement. Both
#     numbers are kept per clip (`recall_small`, `recall_medium`) so the effect of the
#     instrument change is auditable and reversible: set WHISPER_CONFIRM=small to get
#     the old behaviour back.
#
# (2) NUMBERS ARE NOW VERIFIED AS SPOKEN. Until today they were invisible. `words()`
#     rewrote "22h" to "22", and the len>2 content-word filter then dropped it along
#     with `de`, `et`, `la`, `le`. So the one fact an item like "Annonce dans le
#     parking" is keyed on — the closing time — was never checked at all: a clip whose
#     time came out garbled could still score 100%. A keyed number must never be able to
#     hide under a passing percentage, so numbers now count twice:
#       - they stay in the recall set (any token carrying a digit is content), and
#       - they get their own separate assertion with its own RED, independent of the
#         aggregate. A clip can pass on recall and still fail on numbers.
#
#     This is the whole point of the second check: aggregate recall is a similarity
#     score, and a similarity score will always let one wrong token through when the
#     other forty are right. The number IS the item.
# ─────────────────────────────────────────────────────────────────────────────
#
# This script no longer writes reports/audio-verify-failures.json. It writes a purely
# machine-generated record to reports/audio-verify-machine.json instead. The failure
# report carries hand-written `classification` and `reason` fields — the evidence for
# every accepted-below-threshold clip — and a sweep that regenerates it from scratch
# silently destroys all of them. Reconciling machine output into that human file is a
# separate, explicit step: scripts/items/reconcile-audio-verify.py.

import io
import json
import os
import re
import sys
import unicodedata

from faster_whisper import WhisperModel

ITEMS = os.path.join("src", "data", "items")
AUDIO = os.path.join("public", "audio", "ch")
MACHINE_REPORT = os.path.join("reports", "audio-verify-machine.json")

# ── numerals ─────────────────────────────────────────────────────────────────
# Both sides of the comparison are folded to the same canonical form, because the
# written bank and the ASR do not agree on how to spell a number and neither of them is
# wrong. The bank writes "22h"; Piper says it; Whisper writes back "22H", "22 heures" or
# "vingt-deux heures" depending on the model and the day. All four are the same fact.

DE_SIMPLE = {
    "null": 0, "eins": 1, "zwei": 2, "drei": 3, "vier": 4, "fuenf": 5, "fünf": 5,
    "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10, "elf": 11,
    "zwoelf": 12, "zwölf": 12, "dreizehn": 13, "vierzehn": 14, "fuenfzehn": 15,
    "fünfzehn": 15, "sechzehn": 16, "siebzehn": 17, "achtzehn": 18, "neunzehn": 19,
    "zwanzig": 20, "dreissig": 30, "dreißig": 30, "vierzig": 40, "fuenfzig": 50,
    "fünfzig": 50, "sechzig": 60, "siebzig": 70, "achtzig": 80, "neunzig": 90,
    "hundert": 100, "tausend": 1000,
}
FR_SIMPLE = {
    "zero": 0, "zéro": 0, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6,
    "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11, "douze": 12, "treize": 13,
    "quatorze": 14, "quinze": 15, "seize": 16, "vingt": 20, "vingts": 20, "trente": 30,
    "quarante": 40, "cinquante": 50, "soixante": 60,
    # Swiss French. The bank is Swiss and writes septante/huitante/nonante, but Whisper
    # is trained on French French and hands back "quatre-vingt-dix" for a clip that
    # plainly says "nonante". Both spellings must land on the same integer or the Swiss
    # items would fail for being Swiss.
    "septante": 70, "huitante": 80, "octante": 80, "nonante": 90,
    "cent": 100, "cents": 100, "mille": 1000, "milles": 1000,
    # Noon and midnight are clock times spoken as words. "entre 8h et midi" and "entre 8h
    # et 12h" are the same announcement. `après-midi` is NOT midi and is protected in
    # _prep before hyphens become spaces — 16 occurrences in the bank, every one of which
    # would otherwise demand a spoken "12" that is not there.
    "midi": 12, "minuit": 0,
}
# Italian. Routed through its OWN parser, not the German one — Italian writes 21–99 solid
# like German but in the opposite order (tens THEN unit: ventidue = 20+2, where German is
# unit-und-tens: zweiundzwanzig). Sending Italian through parse_de_compound returned None
# for every spelled-out number, which is how `numerals("alle dieci", "IT")` came back
# empty and the gate reported "every number spoken" while checking nothing.
IT_SIMPLE = {
    "zero": 0, "due": 2, "tre": 3, "tré": 3, "quattro": 4, "cinque": 5, "sei": 6,
    "sette": 7, "otto": 8, "nove": 9, "dieci": 10, "undici": 11, "dodici": 12,
    "tredici": 13, "quattordici": 14, "quindici": 15, "sedici": 16, "diciassette": 17,
    "diciotto": 18, "diciannove": 19, "venti": 20, "trenta": 30, "quaranta": 40,
    "cinquanta": 50, "sessanta": 60, "settanta": 70, "ottanta": 80, "novanta": 90,
    "cento": 100, "mille": 1000,
    # Noon and midnight spoken as words, as for FR midi/minuit.
    "mezzogiorno": 12, "mezzanotte": 0,
}
# Tens as they appear glued to a unit. The elided stems are not optional spelling: Italian
# DROPS the tens' final vowel before uno and otto — ventuno (21), ventotto (28),
# quarantotto (48), novantotto (98) — so a parser that only knows "venti" misses every
# number ending in 1 or 8.
IT_TENS_FULL = {"venti": 20, "trenta": 30, "quaranta": 40, "cinquanta": 50,
                "sessanta": 60, "settanta": 70, "ottanta": 80, "novanta": 90}
IT_TENS_ELIDED = {"vent": 20, "trent": 30, "quarant": 40, "cinquant": 50,
                  "sessant": 60, "settant": 70, "ottant": 80, "novant": 90}
IT_UNITS = {"uno": 1, "due": 2, "tre": 3, "tré": 3, "quattro": 4, "cinque": 5,
            "sei": 6, "sette": 7, "otto": 8, "nove": 9}
# Spoken time markers. These were mapped to "h" and dropped by the old check, and folding
# numerals initially lost that — which quietly made `heures`/`uhr` REQUIRED content words
# in 101 of 340 clips. A correct "six heures et demie" transcribed "6h30" then failed for
# not containing the literal word "heures". Restored: they end a numeral run and are not
# themselves content.
MARKERS = {"heures", "heure", "uhr",
           # Italian: "le nove" — `le` is the feminine-plural article standing in for
           # "le ore", not a number. Same job as heures/uhr: end the numeral run, carry
           # no content of its own.
           "le", "ore", "ora"}
# "un", "une", "ein", "eine", "einer" are the indefinite article far more often than they
# are the number one — 464 occurrences across the bank, nearly all of them "une voiture",
# "ein Zimmer". Counting them as numbers would make "une voiture" heard as "la voiture" a
# numeric failure, and a check that fires on articles is a check somebody turns off.
#
# So they only count as ONE when they are already inside a number being built:
# "soixante et un" -> 61, but a bare "une" is an article and is skipped.
AMBIGUOUS_ONE = {"un", "une", "ein", "eine", "einer", "einen", "einem",
                 # Italian: "un caffè", "una casa" — the article, overwhelmingly.
                 "uno", "una"}
# "et"/"und" join a numeral only in one narrow shape each, and letting them join freely
# is wrong in a way that is easy to miss: the item "Septante, nonante — et huitante ?"
# teaches the Swiss number words by LISTING them, and a greedy fold read that list as one
# arithmetic expression and demanded the clip say "160". A list of numbers is not a
# compound number. So:
#   FR — "et" bridges only before un/une/onze  (soixante et un, vingt et une)
#   DE — "und" bridges only unit-before-tens   (zwei und zwanzig), the written-apart form
#        of a compound parse_de_compound already handles when it arrives as one word
BRIDGE_FR_NEXT = {"un", "une", "onze"}
TENS = {20, 30, 40, 50, 60, 70, 80, 90}
SCALES = {100, 1000}


def parse_de_compound(w):
    """Decompose a written-together German numeral: zweiundzwanzig -> 22.

    German writes a whole number as one word, so a dictionary lookup finds nothing and
    the numeral silently disappears from the comparison. Order matters: tausend and
    hundert bind before und, and "hundert" itself contains the letters "und", so a naive
    und-split would shred it.
    """
    if w in DE_SIMPLE:
        return DE_SIMPLE[w]
    for scale_word, scale in (("tausend", 1000), ("hundert", 100)):
        i = w.find(scale_word)
        if i >= 0:
            left, right = w[:i], w[i + len(scale_word):]
            lv = 1 if not left else parse_de_compound(left)
            rv = 0 if not right else parse_de_compound(right)
            if lv is None or rv is None:
                continue
            return lv * scale + rv
    # "einundzwanzig" = 1 + 20. Try every und-split and take the first where both halves
    # are numerals, rather than assuming there is only one.
    for i in range(len(w) - 3):
        if w[i:i + 3] == "und":
            left, right = w[:i], w[i + 3:]
            if not left or not right:
                continue
            lv = DE_SIMPLE.get(left, 1 if left in AMBIGUOUS_ONE else None)
            rv = parse_de_compound(right)
            if lv is not None and rv is not None:
                return lv + rv
    return None


def parse_it_compound(w):
    """Decompose a written-together Italian numeral: ventidue -> 22, ventotto -> 28.

    Italian glues 21–99 into one word as tens-THEN-unit, the opposite order to German,
    and elides the tens' final vowel before uno and otto. `tre` takes an accent as a
    final unit (ventitré). Hundreds and thousands prefix without elision:
    centoventuno = 121, duecentocinquanta = 250, milleduecento = 1200.
    """
    if w in IT_SIMPLE:
        return IT_SIMPLE[w]
    # A sub-part of a compound may be a bare unit including `uno` — centouno = 101. `uno`
    # is deliberately absent from IT_SIMPLE so that a STANDALONE "uno" stays an article
    # ("uno studente"), which is the whole point of AMBIGUOUS_ONE. Inside a number it
    # counts; alone it does not.
    def part(s, default):
        if not s:
            return default
        v = parse_it_compound(s)
        return IT_UNITS.get(s) if v is None else v

    for scale_word, scale in (("mila", 1000), ("mille", 1000)):
        i = w.find(scale_word)
        if i >= 0:
            lv, rv = part(w[:i], 1), part(w[i + len(scale_word):], 0)
            if lv is None or rv is None:
                continue
            return lv * scale + rv
    i = w.find("cento")
    if i >= 0:
        lv, rv = part(w[:i], 1), part(w[i + len("cento"):], 0)
        if lv is not None and rv is not None:
            return lv * 100 + rv
    # Full tens first (ventidue = venti + due), then the elided stem (ventuno, ventotto).
    for table in (IT_TENS_FULL, IT_TENS_ELIDED):
        for stem, val in table.items():
            if w.startswith(stem) and len(w) > len(stem):
                unit = IT_UNITS.get(w[len(stem):])
                if unit is not None:
                    return val + unit
    return None


def word_value(tok, lang):
    if lang == "FR":
        return FR_SIMPLE.get(tok)
    if lang == "IT":
        return parse_it_compound(tok)
    return parse_de_compound(tok)


def can_add(cur, v, lang):
    """May `v` complete the number already being built, or does it start a new one?

    "Smaller than what came before" is NOT the rule — nonante(90) then huitante(80) is
    descending and still two separate numbers, which is how the Swiss-numbers teaching
    item ended up demanding 170. A part only attaches in the shapes a numeral actually
    has: units complete tens, teens complete soixante/quatre-vingt, anything under a
    hundred completes a hundred, and after a scale (mille) the slot is empty again.
    """
    if cur == 0:
        return True
    if cur >= 100:
        return v < 100
    if cur in TENS:
        if v < 10:
            return True
        return lang == "FR" and cur in (60, 80) and 10 <= v <= 19
    # dix-sept / dix-huit / dix-neuf, when the ASR writes them apart.
    return lang == "FR" and cur == 10 and 7 <= v <= 9


def _prep(text):
    t = unicodedata.normalize("NFC", text.lower()).replace("ß", "ss")
    # BEFORE hyphens become spaces: "après-midi" is one word meaning afternoon, and
    # splitting it hands the folder a bare "midi" that would assert noon 16 times over.
    t = re.sub(r"apr[eè]s[\s-]+midi", " apresmidi ", t)
    # A whole clock time or price collapses into its two numbers, so "16h20", "18.30"
    # and "12,50" meet "seize heures vingt" / "achtzehn Uhr dreissig" in the same place.
    # ":00" minutes are dropped, not emitted as a mandatory zero — "16.00 Uhr" is spoken
    # "sechzehn Uhr", and demanding a spoken "null null" would fail every correct clip.
    t = re.sub(r"(\d{1,2})\s*[h:.,]\s*00\b", r" \1 ", t)
    t = re.sub(r"(\d{1,2})\s*[h:.,]\s*(\d{2})\b", r" \1 \2 ", t)
    t = re.sub(r"(\d{1,2})\s*h\b", r" \1 ", t)
    t = re.sub(r"[^\w\s]", " ", t)
    # A letter glued to a digit hides the digit: the audio says "porte B sept" and the ASR
    # writes "porte B7", so the 7 was scored as never spoken. Split the boundary both ways
    # ("b7" -> "b 7", "lx402" -> "lx 402") AFTER the clock rules have consumed 16h20.
    t = re.sub(r"(?<=[a-zà-öø-ÿ])(?=\d)", " ", t)
    return re.sub(r"(?<=\d)(?=[a-zà-öø-ÿ])", " ", t)


def canon_tokens(text, lang):
    """Tokens with numeral runs folded to a single digit string.

    "vingt-deux" and "22" both become "22"; "viertausendvierhundertsiebenundfünfzig" and
    "4457" both become "4457". Digits are atomic and never fold into their neighbours —
    "14h12" is two numbers, not twenty-six.
    """
    toks = _prep(text).split()
    out, i = [], 0
    total, cur, seen, bridge = 0, 0, False, False

    def flush():
        nonlocal total, cur, seen, bridge
        if seen:
            out.append(str(total + cur))
        total, cur, seen, bridge = 0, 0, False, False

    def nxt(k):
        return toks[k + 1] if k + 1 < len(toks) else ""

    while i < len(toks):
        tok = toks[i]
        if tok.isdigit():
            flush()
            out.append(str(int(tok)))
            i += 1
            continue
        # "quatre-vingt(s)" is 80, not 4 + 20. Swiss French says huitante, but the ASR is
        # French French and will hand back quatre-vingts for a clip that said huitante.
        if lang == "FR" and tok == "quatre" and nxt(i) in ("vingt", "vingts"):
            if seen and not can_add(cur, 80, lang):
                flush()
            cur, seen = cur + 80, True
            i += 2
            continue
        # Fractions of an hour are spoken times and must fold to the same minutes the ASR
        # writes as digits: "six heures et demie" == "6h30". Matched as WHOLE TOKENS, so
        # "quartier" (16 in the bank) and "demi-heures" cannot trigger them — the demi/
        # quart rules additionally require a preceding "et", which "toutes les demi-heures"
        # does not have.
        if lang == "FR" and tok == "et" and nxt(i) in ("demie", "demi", "quart"):
            flush()
            out.append("30" if nxt(i) in ("demie", "demi") else "15")
            i += 2
            continue
        # "sept heures moins le quart" is 6:45, NOT 7:45. Emitting the spoken hour
        # unchanged would demand a 7 that an ASR writing "6h45" never produces — the
        # phantom this rule exists to avoid, not create.
        if lang == "FR" and tok == "moins" and nxt(i) == "le" and (toks[i + 2] if i + 2 < len(toks) else "") == "quart":
            flush()
            if out and out[-1].isdigit():
                out[-1] = str((int(out[-1]) - 1) % 24)
            out.append("45")
            i += 3
            continue
        # Italian fractions of an hour. Same shape and the same guard as the French rules
        # above: matched as WHOLE tokens and only after "e", so `quartiere` and a bare
        # `mezzo` (means/middle) can never trigger them.
        if lang == "IT" and tok == "e" and seen:
            n1, n2 = nxt(i), (toks[i + 2] if i + 2 < len(toks) else "")
            if n1 in ("mezzo", "mezza"):
                flush(); out.append("30"); i += 2; continue
            if n1 == "quarto":
                flush(); out.append("15"); i += 2; continue
            if n1 in ("un", "uno") and n2 == "quarto":
                flush(); out.append("15"); i += 3; continue
            if n1 == "tre" and n2 == "quarti":
                flush(); out.append("45"); i += 3; continue
        # "le dieci meno un quarto" is 9:45, not 10:45 — the hour decrements, exactly as
        # French "moins le quart". Emitting the spoken hour unchanged would demand a 10
        # that an ASR writing "9:45" never produces.
        if lang == "IT" and tok == "meno":
            n1, n2 = nxt(i), (toks[i + 2] if i + 2 < len(toks) else "")
            step = 2 if n1 == "quarto" else (3 if n1 in ("un", "uno") and n2 == "quarto" else 0)
            if step:
                flush()
                if out and out[-1].isdigit():
                    out[-1] = str((int(out[-1]) - 1) % 24)
                out.append("45")
                i += step
                continue
        if tok in MARKERS:
            flush()
            i += 1
            continue
        if tok == "et" and lang == "FR" and seen and nxt(i) in BRIDGE_FR_NEXT:
            bridge = True
            i += 1
            continue
        if tok == "und" and lang == "DE" and seen and 0 < cur < 10 and (word_value(nxt(i), "DE") in TENS):
            bridge = True
            i += 1
            continue
        v = word_value(tok, lang)
        if v is None and seen and tok in AMBIGUOUS_ONE:
            v = 1
        if v is None:
            flush()
            out.append(tok)
            i += 1
            continue
        if v in SCALES:
            if v == 1000:
                total += (cur or 1) * 1000
                cur = 0
            else:
                cur = (cur or 1) * 100
            seen = True
        elif not seen or bridge or can_add(cur, v, lang):
            cur += v
            seen, bridge = True, False
        else:
            flush()
            cur, seen = v, True
        i += 1
    flush()
    return out


def words(text, lang):
    """The content set for recall.

    Content words only: a one- or two-letter token is an article, and Whisper's handling
    of those says nothing about whether the audio is right. A token carrying a DIGIT is
    exempt from that rule — "22" is two characters and is the entire point of the item.
    """
    return [w for w in canon_tokens(text, lang) if len(w) > 2 or any(c.isdigit() for c in w)]


def numerals(text, lang):
    return [t for t in canon_tokens(text, lang) if t.isdigit()]


def numeric_missing(src, asr):
    """Which source numbers are not present in what was heard.

    Exact match first, then a grouping fallback: a reference number read as "44 57" and
    written 4457 is the same number said the same way, and failing it would be the check
    disagreeing with itself about digit grouping rather than finding a defect.
    """
    pool = list(asr)
    missing = []
    for n in src:
        if n in pool:
            pool.remove(n)
            continue
        joined = False
        for i in range(len(asr)):
            acc = ""
            for j in range(i, min(i + 4, len(asr))):
                acc += asr[j]
                if acc == n:
                    joined = True
                    break
                if len(acc) > len(n):
                    break
            if joined:
                break
        if not joined:
            missing.append(n)
    return missing


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


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60]


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
# flags is re-checked with the confirm model, which mishears fewer numerals and proper
# nouns, so a clip is only reported as failing if the careful model agrees.
#
# ESCALATION IS UNIFORM. Every one of the 340 gets the same rule: escalate if aggregate
# recall is below the line OR if any source number is missing. Escalating on a numeric
# miss is new — a clip can now be word-perfect on aggregate and still be pulled in for a
# second opinion because it got a time wrong. What is deliberately NOT done is running
# the sharp model only on the clips already known to fail: a better instrument pointed
# only at the failures is fitting to the data, and it would "clear" them by construction.
SCAN = os.environ.get("WHISPER_SCAN", "base")
CONFIRM = os.environ.get("WHISPER_CONFIRM", "medium")
BASELINE = os.environ.get("WHISPER_BASELINE", "small")
THRESHOLD = float(os.environ.get("WHISPER_THRESHOLD", "0.85"))

print(f"transcribing {len(files)} clip(s) locally — {SCAN}, then {BASELINE}+{CONFIRM} on anything flagged")
print(f"threshold {THRESHOLD:.2f} (unchanged) · confirm model {CONFIRM} (promoted from {BASELINE}, Nasir 2026-07-27)\n")
model = WhisperModel(SCAN, device="cpu", compute_type="int8")
loaded = {}


def transcribe(name, path, lang):
    if name not in loaded:
        print(f"  … loading {name}", flush=True)
        loaded[name] = WhisperModel(name, device="cpu", compute_type="int8")
    segments, _ = loaded[name].transcribe(path, language=lang.lower(), beam_size=1)
    return " ".join(s.text for s in segments)


def score(source, heard, lang):
    src = {w for w in words(source, lang)}
    got = {w for w in words(heard, lang)}
    missing = sorted(src - got)
    recall = 1 - len(missing) / max(1, len(src))
    num_missing = numeric_missing(numerals(source, lang), numerals(heard, lang))
    return recall, missing, num_missing


bad = 0
records = []
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
    path = os.path.join(AUDIO, fn)

    heard = transcribe(SCAN, path, lang)
    recall, missing, num_missing = score(source, heard, lang)
    rec = {
        "stem": key, "lang": lang, "title": title,
        "recall_scan": round(recall, 3), "recall_small": None, "recall_medium": None,
        "numbers_expected": numerals(source, lang),
        # The ASR text is kept for EVERY clip, not just failures. Without it a question
        # like "did my normalizer change break these, or is the audio wrong?" cannot be
        # answered without re-transcribing all 340 — which is exactly the bind the first
        # run of this script left behind. Storing it makes diagnosis offline and free.
        "spoken_source": source,
        "heard_scan": heard.strip(),
        "heard_confirm": None,
    }

    if recall < THRESHOLD or num_missing:
        r_base, m_base, n_base = score(source, transcribe(BASELINE, path, lang), lang)
        rec["recall_small"] = round(r_base, 3)
        heard = transcribe(CONFIRM, path, lang)
        rec["heard_confirm"] = heard.strip()
        recall, missing, num_missing = score(source, heard, lang)
        rec["recall_medium"] = round(recall, 3)

    rec["recall"] = round(recall, 3)
    rec["missing"] = missing[:10]
    rec["numbers_missing"] = num_missing
    rec["recall_ok"] = recall >= THRESHOLD
    rec["numbers_ok"] = not num_missing
    records.append(rec)

    if not rec["numbers_ok"]:
        bad += 1
        print(f"  NUMBER {lang}  {title}", flush=True)
        print(f"           expected spoken: {', '.join(rec['numbers_expected'])}", flush=True)
        print(f"           NOT heard: {', '.join(num_missing)}   (recall {recall * 100:.1f}%)", flush=True)
    elif not rec["recall_ok"]:
        bad += 1
        print(f"  FAIL {recall * 100:5.1f}%  {lang}  {title}", flush=True)
        print(f"           not heard: {', '.join(missing[:8])}", flush=True)

    scores.append((recall, key, lang, title))
    if n % 20 == 0 or n == len(files):
        print(f"  … {n}/{len(files)} checked, {bad} failing", flush=True)

recall_fail = [r for r in records if not r["recall_ok"]]
number_fail = [r for r in records if not r["numbers_ok"]]
clean = [r for r in records if r["recall_ok"] and r["numbers_ok"]]
print(f"\n{len(clean)}/{len(files)} clip(s) match their transcript")
print(f"  recall below {THRESHOLD:.2f}: {len(recall_fail)}")
print(f"  numbers not spoken:  {len(number_fail)}   <- own RED, independent of recall")

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

# ── numeric coverage ─────────────────────────────────────────────────────────
tot_nums = sum(len(r["numbers_expected"]) for r in records)
miss_nums = sum(len(r["numbers_missing"]) for r in records)
with_nums = sum(1 for r in records if r["numbers_expected"])
print("\nNUMERIC COVERAGE")
print(f"  clips carrying at least one number: {with_nums}/{len(records)}")
print(f"  numbers asserted spoken: {tot_nums - miss_nums}/{tot_nums}")
print(f"  clips with a number not heard: {len(number_fail)}")

# ── instrument-change audit ──────────────────────────────────────────────────
escalated = [r for r in records if r["recall_small"] is not None]
moved = [r for r in escalated if r["recall_medium"] > r["recall_small"]]
print(f"\nCONFIRM MODEL {BASELINE} -> {CONFIRM}: {len(escalated)} clip(s) escalated, {len(moved)} scored higher on {CONFIRM}")
for r in sorted(escalated, key=lambda x: x["recall_medium"]):
    d = r["recall_medium"] - r["recall_small"]
    print(f"  {r['recall_small'] * 100:5.1f}% -> {r['recall_medium'] * 100:5.1f}%  ({d * 100:+5.1f})  {r['lang']}  {r['title'][:44]}")

os.makedirs("reports", exist_ok=True)
with io.open(MACHINE_REPORT, "w", encoding="utf8") as fh:
    json.dump({
        "scan_model": SCAN, "baseline_model": BASELINE, "confirm_model": CONFIRM,
        "threshold": THRESHOLD, "clips": len(files),
        "records": records,
    }, fh, ensure_ascii=False, indent=1)
print(f"\nmachine record → {MACHINE_REPORT} ({len(records)} clips, all of them, not just failures)")
print("reports/audio-verify-failures.json NOT touched — reconcile with")
print("  python scripts/items/reconcile-audio-verify.py")
sys.exit(1 if bad else 0)
