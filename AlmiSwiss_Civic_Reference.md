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

---

## Appendix — re-pinned citations (independent re-verification, 2026-07-28)

*Added by Claude Code below beta-g's original audit, which is unchanged above. Beta-g's
verdict and findings stand exactly as written; this appendix only replaces citations that
no longer resolve.*

**Why.** Four of the five source URLs in the section above — every `ch.ch` link — return
**404**. The facts they were cited for are correct and were re-confirmed against live
official pages, but a citation that does not resolve cannot be used to re-check anything,
which is the whole purpose of a provenance record.

**Every URL below was fetched and seen to return real content on 2026-07-28**, with the
quoted sentence read off the page. None is a plausible-looking guess — guessing is how the
four dead links got there.

| Facts covered | Source (verified live) |
|---|---|
| Three political levels; 26 cantons; National Council 200; Council of States 46; Federal Council 7; votes per year | [EDA/FDFA — The political system](https://www.aboutswitzerland.eda.admin.ch/en/political-system) |
| Federal Assembly composition (200 / 46 / 246) | [EDA/FDFA — The Federal Assembly (Parliament)](https://www.aboutswitzerland.eda.admin.ch/en/the-federal-assembly-parliament) |
| Popular initiative 100,000 / 18 months; optional referendum 50,000 / 100 days | [EDA/FDFA — Direct democracy](https://www.aboutswitzerland.eda.admin.ch/en/direct-democracy) |
| No national civics test; naturalisation governed by cantonal law; canton + commune decide | [SEM — Ordinary naturalisation](https://www.sem.admin.ch/sem/en/home/integration-einbuergerung/schweizer-werden/ordentlich.html) (the one original link that is still live) |

Verbatim, as read from those pages:

- *"Three political levels share power in Switzerland: the Confederation, the 26 cantons and 2,110 communes."*
- *"The Swiss Parliament (Federal Assembly) has a total of 246 members, who are directly elected by the people. Switzerland has a bicameral parliament consisting of the National Council (200 members) and the Council of States (46 members)."*
- *"The Swiss federal government, (the Federal Council), is made up of seven members, who are elected by Parliament."*
- *"Every year there are between three and four popular votes in which the electorate can have their say on a particular issue."*
- *"For such an initiative to come about, the signatures of 100,000 voters who support the proposal must be collected within 18 months."*
- *"In order to bring about a national referendum, 50,000 valid signatures must be collected within 100 days of publication of the new legislation."*
- *"The procedure in the canton and in the commune is governed by cantonal law."* — and *"The canton may also stipulate additional integration requirements."*

**Note on item 11 (voting frequency).** The bank's keyed answer is *"about four times a
year"*; the EDA/FDFA page says *"between three and four popular votes"* per year. These
agree — "about four" sits inside "three to four" — but the source is the looser statement
of the two. Not a correction; recorded so nobody re-derives it as a mismatch.

### Facts NOT covered by the pages above — authority named, URL deliberately omitted

No URL is given for these because none was fetched and verified. A plausible-looking
unverified link is the defect being repaired here, not something to add more of. Cite the
authority, and pin a URL only after fetching it.

| Fact | Authority to consult |
|---|---|
| Four national languages: German, French, Italian, Romansh | **Federal Constitution, Art. 4** (`fedlex.admin.ch`; the site is JavaScript-only and could not be fetched) |
| Federal Presidency — one year, from among the seven, *primus inter pares* | **admin.ch — Federal Council / Presidency** |
| Bern is the "federal city", Switzerland has no legal capital | **admin.ch** |
| Health insurance must be taken out within three months of taking up residence | **KVG/LAMal; BAG/OFSP** |

These four facts were verified by beta-g and are not in doubt — what is missing is a
fetched URL, not the fact.
