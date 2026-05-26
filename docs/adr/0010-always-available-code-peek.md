# ADR-0010: Always-available code peek (see the contract you've been writing)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Deciders:** shiv (after carlos review on 2026-05-25)

## Context

The crowdfunding deck is *co-authoring a contract*. Every YOUR TURN fills a slot in `CrowdFund.sol`; the running source lives in `deck-store.sources`, threaded forward by `completeYourTurn` (canonical line if the learner missed, learner's line if it was graded equivalent). CODE cards show slices of that source anchored at specific lines.

But between cards the contract as a whole is invisible. The learner can be on THINK card #7 with no way to step back and read what they've written so far. Carlos's ask on 2026-05-25: a small affordance — an icon, a tab, something cheap — that opens the current state of the code on demand and lets the learner walk through it whenever, not only when a CODE card chooses to show it.

The data is in place. `useDeckStore.sources['CrowdFund.sol']` is the live source at any moment. The `shiki` highlighter (ADR-0006 / `highlighter.ts`) is already loaded for the deck's code blocks and renders `github-dark-dimmed` tokens.

## Decision

Add a **peek button** in the deck's top bar that opens a **right-side sheet** showing the current full source of `CrowdFund.sol`, syntax-highlighted by the existing shiki instance, scrollable.

**Affordance.** A small mono-text button reading `peek code` (and a `</>` glyph) in the top bar next to `reset` and `↩ atlas`. Same visual weight as those — small caps, faint, hover lifts. Keyboard shortcut: `c` toggles the sheet. (`r` was rejected; `reset` is destructive and the `r` shortcut would surprise.)

**Sheet content.**
- Header: filename (`CrowdFund.sol`), a `× close` button, and a faint count of slots filled so far (`3 / 6 lines threaded`).
- Body: the full `sources['CrowdFund.sol']` rendered via shiki, line-numbered, monospace. Slots not yet filled render with the skeleton's placeholder comments (`// TODO: track balances`, etc.) untouched — that is the genuine state of the contract right now, and lying about it would defeat the point.
- The shiki render reuses the singleton highlighter, no extra load cost.

**Anchor on open.** If the current card has an anchor into the source (CODE cards via `fromAnchor`/`toAnchor`, YOUR TURN cards via `slot`), the sheet scrolls that range into view on open and highlights it with the same dim-others / opacity 0.3 treatment from the deck's `CodeBlock`. Anchorless cards (CONCEPT / THINK / RECAP) open the sheet scrolled to the top — there is no current "focus" to honour.

**Sizing.** Half-width sheet on desktop (≥1024px); full-screen overlay below. Backdrop closes it. Esc closes it.

**Read-only.** The peek is for *seeing*, not editing. Editing happens on YOUR TURN cards' code inputs. ADR-0011 (future, if it ever lands) can revisit whether the peek itself becomes editable; not now.

## Alternatives considered

### A. Always-on side panel that mirrors the source
Most immersive — the contract grows in your peripheral vision as you walk the deck. Rejected for v0.6 because it competes with the journey panel from ADR-0009 for screen real-estate, and the deck card is already the focus. A sheet that opens *when asked* respects the deck's deliberate slide-by-slide rhythm. Reconsider if learner reports want it ambient.

### B. Inline expand under the current card
A "show full contract" disclosure on the card. Rejected: every card type would need to handle the expansion, and the contract reaches ~80 lines once filled, which would push the card chrome around badly.

### C. Modal centered over the card
Standard but feels heavy for a passive read. A right-side sheet keeps the deck partially visible in the peripheral, so the learner doesn't lose their place. Rejected.

### D. Open in a new tab
A `/scenes/crowdfunding/source` route. Rejected: the source is already in the store, opening a tab fetches it cold and loses the focus anchor on the current card.

## Consequences

- One new component (`CodePeekSheet.tsx`), small. Reuses the existing shiki highlighter so no new dependency, no second async load.
- A small top-bar button addition in `Deck.tsx`. Keyboard listener for `c` lives on the deck shell.
- Sheet open state can be local component state — no need to put it in `deck-store`, since it doesn't need to persist across reloads.
- The deck's existing CODE cards remain the primary mechanism for *teaching* code; the peek is for *referencing*. Different jobs.
- Accessibility: sheet is a `<dialog>`-like region with focus trap and an explicit close button (Esc + backdrop + button), so it works without keyboard surprises.

## Open items

- Whether the slot-fill count belongs in the sheet header or in the peek button itself (e.g. `peek code · 3/6`). Resolve in the frontend-design pass.
- Whether `c` is the right shortcut given that the deck's code inputs accept text — listener must ignore when an input is focused. Trivial guard; document it in the implementation.
