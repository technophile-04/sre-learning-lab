# ADR-0008: Socratic derive→reveal cards (make the learner work the answer out)

- **Status:** Accepted
- **Date:** 2026-05-25
- **Deciders:** shiv

## Context

The deck's whole reason to exist is v0.1 bet #3: Socratic evaluation — confirm understanding by making the learner produce something, not recognise it. The first build missed that bar in two ways Shiv caught:

1. **YOUR TURN cards handed over the answer.** The prompt said "add a mapping from `address` to `uint256` called `balances`," the placeholder spelled out the structure, and the contract was shown right there. The learner transcribed; they didn't derive.
2. **THINK questions were vague recall.** "What stops the rules from changing?" came right after a card that said the rules can't change — so any "smart contract, it's immutable" passed. The rubrics were single keywords (`"reentrancy"`, `"drain"`), so a buzzword cleared the grader. As Shiv put it, we had questions "just to have them," not to test knowledge.

## Decision

Rework the interactive cards so the learner derives the solution from the concept alone, then meets the code.

**The derive→reveal pair.** Each YOUR TURN concept is now two cards:

1. **Derive card** — the theory (lead with the situation, often an analogy: e.g. `mapping(uint256 => address) tokenOwner` to set up the balances mapping), then **two inputs and no code block**: a code box where they write the line from the theory, and a prose box where they explain their reasoning. The code grades against the canonical and threads forward as before; the reasoning grades Socratically (reuses the `think` grader mode), **non-blocking** — feedback only, it never stops progress.
2. **Reveal card** — a `CodeCard` anchored on the line(s) they just wrote, so right after deriving it they see it sitting in the contract.

**No code on derive cards.** The code block is suppressed whenever a YOUR TURN card carries an `explain` box (`!card.explain` gate in the renderer). The learner writes blind from the theory; the code appears on the reveal card, never before. This is a hard rule for derive cards.

**Implementation.** `YourTurnCard` gained an optional `explain: { prompt; rubricConcepts }`. No new card type, no store-schema change — the reasoning answer persists under a derived id `${card.id}__explain`. The reveal is a plain `CodeCard`.

**Sharper THINK cards.** Questions must test, not echo the previous card. `who-enforces` was rewritten to put the learner in the creator's seat ("a contributor worries *you'll* change the rules — what can you honestly tell them about your power once it's live?"), which can't be answered by repeating "it's immutable." All THINK rubrics moved from keyword lists to full *idea phrases* so the grader judges whether the answer captures the mechanism, not whether it dropped a word.

**Standing content rules** (the bar all future cards meet):
- **Voice:** every line of learner-facing copy goes through the sandgarden style guide *before* it's written — `/Users/shivbhonde/Documents/shiv/3. Resources/sandgarden-blog-writing-style.md` (also recorded as a hard rule in `CLAUDE.md`). Situation-first, plain, no em dashes, no bold-label paragraphs, no punchline endings.
- **Derive, don't dictate:** prompts pose the problem and give an analogy; they do not state the answer or show the code. Placeholders leave the actual insight blank (e.g. `mapping(/* key? */ => /* value? */) public balances;`).
- **Reasoning is non-blocking:** a learner is never stuck on prose; only the code threads forward.
- **Questions must test:** a THINK (or `explain`) question that can be answered by parroting the prior card is a bug.

## Alternatives considered

### A. Keep one YOUR TURN card, just reword the prompt
Rewording alone still left the code on screen, so the learner reads the answer out of the contract. Splitting derive (no code) from reveal (code) is what forces the derivation. Rejected.

### B. A dedicated `derive` card type
Cleaner on paper, but it duplicates everything `YourTurnCard` already does (slot, canonical, grading, threading). An optional `explain` field is additive and keeps one renderer. Rejected.

### C. Block progress on a wrong explanation
Gating on prose grading punishes a learner who understood the code but worded the why poorly, and the AI grader on reasoning is fuzzier than on code. Kept it feedback-only. Rejected.

## Consequences

**Positive:**
- The deck now actually exercises bet #3 — the learner produces the structure and articulates why, twice per concept.
- The reveal beat ("here's what you just added, in the contract") reinforces without a separate teaching card.
- One card type, one renderer, no store migration.

**Negative / costs accepted:**
- The deck roughly doubled its interactive footprint (≈9 derive→reveal pairs), growing from ~27 to 35 cards. Acceptable — the rhythm is "write blind → see it land."
- Two AI grade calls per derive card (code + reasoning) instead of one. Acceptable for a learning tool.

**Gotchas worth remembering:**
- Reveal-card anchors must match the *filled* canonical line (e.g. `fromAnchor: "balances[msg.sender] += msg.value"`), not the slot token. If the learner skips submitting, the slot stays a token and the reveal simply shows the region unfocused.
- The no-code behaviour is coupled to `card.explain` presence by design (documented in the renderer). A future card that wants both code-in-view *and* a reasoning box would need an explicit flag instead.

## Reversibility

High. `explain` is optional and additive; reveal cards are ordinary content. Reverting any card to the old single-card style is a content edit.
