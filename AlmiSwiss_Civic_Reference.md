# AlmiSwiss — Canton-Civic Grounding & Provenance Reference

*The sourced verification of the 30 canton-civic KNOWLEDGE items (15 DE + 15 FR, item-for-item parallel). Audited by beta-g against official Swiss government sources on the FREE path (web research, no paid API), 2026-07-27. Purpose: (a) ground the "invented" civic track in real, current facts per the blueprint; (b) give the bank the provenance it currently lacks (no item carries a source field). **Outcome: every fact checks out — no content correction required.** The findings are traceability + a level-design question, not accuracy.*

---

## Verdict
All 15 topics (30 items) are **factually accurate, honestly framed, and not time-sensitive.** The two items that state "there is no single national civics test" (DE [5]/[15], FR [5]/[15]) match the official SEM position exactly. The MATCHING numbers item keys only correct pairings; "100 Mitglieder/membres" and "4 tribunaux fédéraux" are **unmatched distractors, not errors**. Nothing references current office-holders or a specific dated vote, so the module carries **no living-content rot risk** — it tests stable structural facts.

## The 15 topics, verified against source

| # | Topic | Keyed fact (verified correct) | Source |
|---|---|---|---|
| 1 | Three political levels | Confederation + 26 cantons + communes (~2,100) | ch.ch federalism ✓ sourced |
| 2 | National languages | German, French, Italian, **Romansh** (four, per Federal Constitution Art. 4) | admin.ch / Fed. Constitution — *pin to Art. 4* |
| 3 | Federal Council size | **7** members (True/False → True) | ch.ch parliament ✓ sourced |
| 4 | Health insurance deadline | Must take out mandatory insurance **within 3 months** of taking up residence | KVG/LAMal — *pin to official BAG/OFSP page* |
| 5 | National civics test? | **No** single national test (True/False → False) | SEM ordinary naturalisation ✓ sourced |
| 6 | Federal Presidency | Held **one year**, from among the 7 Federal Councillors, "primus inter pares," no powers over colleagues | admin.ch Federal Council — *pin* |
| 7 | Institution numbers (MATCHING) | National Council **200** · Council of States **46** · Federal Council **7** · Switzerland **26** cantons. (Distractors 100 / 4 federal courts unmatched.) | ch.ch parliament ✓ sourced |
| 8 | Popular initiative | **100,000** valid signatures within **18 months** | ch.ch popular-initiative ✓ sourced |
| 9 | Optional referendum | **50,000** valid signatures within **100 days** of publication | ch.ch referendum ✓ sourced |
| 10 | Bern | Switzerland has **no legal capital**; Bern is the "federal city" (Bundesstadt / ville fédérale), seat of government | admin.ch — *pin* |
| 11 | Voting frequency | Federal votes about **4 times per year** | ch.ch votes — *pin* |
| 12 | Who decides ordinary naturalisation | **Canton and commune** (may require more than the federal minimum) | SEM ✓ sourced |
| 13 | Facilitated vs ordinary | Facilitated (e.g. marriage to a Swiss) → **SEM** decides; ordinary → **canton + commune** | SEM ✓ sourced |
| 14 | Language of proof | In the language of **your canton/commune** (fact of domicile, not preference) | SEM / fide — consistent ✓ |
| 15 | What the module is | Practice only — **no national exam or pass-mark**; the commune decides (test / interview / nothing) | SEM ✓ sourced |

## Federal ground-truth (the anchors any Swiss civics content must match)
- Three levels: **Confederation · 26 cantons · ~2,100 communes**, organised by subsidiarity.
- Federal Assembly = National Council **200** + Council of States **46** = **246**. Federal Council = **7**.
- Naturalisation: **no national civics test** — federal bar is 10 years' residence (ages 8–18 count double, min 6 actual) + C permit; cantons/communes add 2–5 years + their own integration requirements, "governed by cantonal law." Standards vary by jurisdiction.

## Findings (traceability + design, NOT accuracy)
1. **No provenance in the bank.** None of the 30 items carries a source/citation field — every fact is correct but the bank doesn't record where it came from. This doc is the provenance record. Adding a per-item `source` field to the bank would be a **schema change** and must heed the `audioUrl` lesson: a payload key nothing reads (or the payload-key gate rejects) is worse than none. Recommend keeping provenance in this doc unless the product will actually render citations.
2. **`cefr = null` on all 30.** The 120-item CEFR pass covered getting-started only. But these are **KNOWLEDGE** items with a **difficulty** axis already (FOUNDATION / CORE / STRETCH); CEFR is a *language*-proficiency framework, and civic-knowledge questions aren't obviously a CEFR fit. **Design question for abba g:** should KNOWLEDGE items carry a CEFR level at all, or is difficulty the correct axis and `cefr = null` correct-by-design? Not a silent gap — a decision.

## Sources (official/primary)
- [ch.ch — Swiss federalism (three levels, 26 cantons, ~2,100 communes)](https://www.ch.ch/en/political-system/operation-and-organisation-of-switzerland/federalism/)
- [ch.ch — composition of the Swiss Parliament (National Council 200, Council of States 46, Federal Council 7)](https://www.ch.ch/en/demokratie/swiss-parliament/composition-of-the-swiss-parliament/)
- [ch.ch — popular initiative (100,000 / 18 months)](https://www.ch.ch/en/votes-and-elections/popular-initiative/)
- [ch.ch — optional referendum (50,000 / 100 days)](https://www.ch.ch/en/votes-and-elections/referendum/)
- [SEM — ordinary naturalisation (no national test; canton-governed; 10-year/C-permit federal bar)](https://www.sem.admin.ch/sem/en/home/integration-einbuergerung/schweizer-werden/ordentlich.html)
- *To pin if per-fact citation is wanted:* Federal Constitution Art. 4 (national languages); admin.ch Federal Council/Presidency; BAG/OFSP (3-month insurance deadline); admin.ch (Bern federal city); ch.ch votes (≈4×/year).
