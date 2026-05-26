# ADR-0009: Non-linear lesson index (the deck stops being a one-way walk)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** shiv (after carlos review on 2026-05-25)

## Context

The crowdfunding deck shipped as a 35-card stack walked with `prev` / `next`. The only progress signal is a thin rail at the bottom showing `12 / 35 · YOUR TURN`. From inside the deck the learner cannot see:

- the shape of the curriculum — what sections exist, how long the journey is,
- where they are within that shape,
- where to jump if they want to re-read a card or peek ahead.

Carlos flagged this on 2026-05-25 right after the v0.5 review. His ask: a panel that lists the cards, marks the current one, and lets the learner click any of them to jump. The deck stops being a linear walk and becomes table-of-contents-driven.

The data is already in place. `CROWDFUNDING_DECK.cards` has `id`, `type`, `tier1`, `tier2`, `title` per card. `useDeckStore` already exposes `goTo(index)`, currently unused, and tracks `progress[cardId].verdict` for every YOUR TURN / THINK card. None of this needs a schema change.

## Decision

Add a left-side **journey panel** that renders the deck as a grouped list and drives `goTo()` on click.

**Grouping.** The list groups consecutive cards into *chapters* by the IDEA → CODE → YOUR TURN → ... pedagogical arc, not by raw card type. The deck is authored as a sequence of small explain-then-test loops (concept → code → derive → reveal → think), so the natural unit is "the cluster that teaches one atom" — e.g. *Tracking who gave what* groups `tracking` (THE IDEA), `balances` (YOUR TURN), `balances-added` (THE CODE). Chapter title is the first concept card's `title` in that cluster.

Within each chapter, every card renders as a row: a tiny type chip (the Devanagari glyph from `card-meta.ts` — सूत्र / दर्शन / लेखन / प्रश्न / प्रयोग / प्रकाशन / संहिता), the tier-1 label in mono, and the card title. The current card is marked. Cards with a recorded `verdict` show a state mark: ✓ pass, ◐ partial, no mark for unanswered or non-graded.

**Placement.** Fixed left rail on wide viewports (≥1024px), collapses to a top-of-page sheet under that. The deck's existing center column stays exactly where it is — the index is a parallel surface, not a replacement for the deck stack or the progress rail.

**Behaviour.** Click a row → `goTo(index)`. Free navigation, no locking: any card can be jumped to at any time. The bottom rail and prev/next stay, they still work, the index is additive.

## Alternatives considered

### A. Flat numbered list (1..35)
Reads as a checklist, loses the structure that makes the deck a curriculum. Rejected — Carlos's point was about seeing the *shape* of the journey, and a flat list flattens it.

### B. Group by card type
Sections of CONCEPT / YOUR TURN / THINK / TRY IT. Easy to render but breaks the explain-then-test arc — you'd see "all concepts," "all your-turns," etc. as separate sections, in their original index order, which makes the dependencies between them illegible. Rejected.

### C. Open-by-default modal / drawer (no fixed rail)
Saves screen real estate but makes the index a *thing you open* rather than a *thing you live in*. The deck is meant to feel like a guided walk; the journey panel reinforces that by being always-visible on desktop. Mobile / narrow viewports do collapse it.

### D. Lock cards until prerequisites met
Was considered, rejected the same way ADR-0003 rejected gating elsewhere: the deck's non-blocking grading philosophy applies here too. The learner can jump anywhere. If they jump to a TRY IT card without filling in slots, the runtime falls back to `completedSources` (canonical fills) so the chain still deploys. The cost of a wrong jump is small, the value of trust is large.

## Consequences

- One new component (`JourneyPanel.tsx`) in `_components/`, one CSS block (`deck.css`).
- No schema changes; no migration; `goTo` already exists on the store.
- The chapter grouping is **derived in the panel**, not authored on cards — a `chapterId` field on cards was rejected to avoid coupling content shape to UI shape. The grouping function (`groupIntoChapters`) lives next to the panel and reads `card.type` runs.
- Verdict marks make the index a soft progress map. A future v0.7 interview (parked, see vault `2026-05-26-learning-platform-v06-plan.md`) that pre-fills certain cards as "skipped" can extend the same verdict vocabulary.
- The deck's existing thin progress rail is preserved — it's still the cleanest *position* signal during a forward walk. The journey panel is the *map*; the rail is the *odometer*. They're not redundant.

## Refinements landed during implementation

- **Chapter starters were rendering redundant titles.** Initial pass had a separate `<header>` per chapter PLUS a row for the starter card, so the chapter heading title duplicated the first row's title (the chapter title IS the starter's title by construction). Resolved by making the chapter heading itself the clickable starter row — Roman numeral on the left, serif italic title, optional verdict — and indenting supporting rows beneath it with a faint vertical thread linking them visually.
- **TRY IT was opening its own one-card chapters.** Two adjacent TRY ITs (`fail` / `succeed`) produced two single-card chapters back-to-back, which fragmented the index. Refined: only CONCEPT / SHIP IT / RECAP open chapters; TRY IT belongs to the preceding concept's hands-on beat. 12 chapters → 9, no fragmentation.
- **The English tier-1 label was redundant alongside the Devanagari.** Original rows showed both the sanskrit glyph (e.g. प्रश्न) AND the English tier-1 ("THINK"). Removed the English label — the Devanagari is now the sole type chip in the index, leaning fully into the sanskrit naming philosophy (see [[sre-learning-lab-naming-philosophy]] in the vault). The English tier-1 surfaces as a `title` tooltip + `aria-label` for accessibility. Learners absorb the mapping from every deck card's two-tier header. The glyph was bumped 11px → 13px and given more contrast (opacity 0.7 → 0.78, saffron-deep) to carry the weight on its own.
- **The panel is collapsible.** A chevron (`‹`) in the panel header collapses the rail (width + opacity transition over 280ms via `cubic-bezier(0.22, 1, 0.36, 1)`); a `☰ the path · NN / 35` button appears in the top-left of the deck area to expand. State persists across reloads via `localStorage` key `deck:panel-collapsed`. The collapsed-on-desktop and the always-on-mobile affordances share the same button component (`.deck-nav-opener`), with a `.deck-nav-opener-desktop` modifier that makes it visible on wide viewports when the panel is collapsed.
- **CSS Grid + absolute-positioned children gotcha.** First row layout had `grid-template-columns: 18px 18px auto 1fr auto` (5 columns) with the marker and hand as `position: absolute`. Per spec, absolute children are removed from grid auto-placement, so the in-flow children landed in columns 1-N instead of 3-N, causing the tier-1 label and the title to render in the same cell. Resolved by sizing the grid template to the count of in-flow children only (now `28px 1fr auto`); marker + hand overlay via the row's `position: relative` reference frame.

## Open items

- Whether the chapter inference is stable enough or whether `chapterId` becomes worth authoring explicitly when we add a second deck (token-vendor, etc.). Defer until the second deck.
- Mobile drawer interaction (swipe to close? button only?). Currently button + backdrop tap close it; could revisit if learner feedback wants swipe.
