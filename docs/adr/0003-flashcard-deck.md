# ADR-0003: Replace the line-anchored teacher with a slide-by-slide flashcard deck

- **Status:** Accepted
- **Date:** 2026-05-22
- **Deciders:** shiv
- **Supersedes:** ADR-0002 (the *form factor*; the underlying pedagogy bet — AI as question-curator running a guided, Socratic experience — carries forward)

## Context

ADR-0002 shipped *the marginalian*: a teacher anchored to the cursor line, walking the learner line-by-line through a single contract in a CodeMirror editor, with a manicule (☞) in the gutter and a `pointAtLine` deixis tool. It validated the shared-pointer idea, but running it surfaced three problems.

**Problem 1: too much on one screen.** `balance-ledger` put the editor, a live ledger table, the tutor panel, and the chat input all on the surface at once. The learner's attention had nowhere to rest. The deixis win of ADR-0002 was real, but it lived inside a dense workspace that felt cramped.

**Problem 2: the unit of progression was a line.** Everything was paced by "next line." But the things worth teaching aren't all lines. Some are concepts ("what is a mapping"), some are open questions ("why zero the balance before sending"), some are interactions ("watch the campaign refund"). Forcing all of them through a line-by-line editor walk flattened them into the same shape.

**Problem 3: code was the stage.** The whole experience orbited the editor. But the learning we actually care about is question-and-answer plus co-authoring plus seeing it run, with code as one ingredient rather than the centre of gravity.

## Decision

Replace the single-editor walkthrough with a **deck of typed cards** the learner advances one at a time, showing one thing per card. A challenge becomes an ordered array of cards of these types:

- **concept** (explain an idea), **code** (behold a snippet, surroundings dimmed), **your-turn** (write one line, AI-graded), **think** (open Socratic question, AI-graded), **try-it** (run your own code on the in-browser chain), **ship-it** (deploy), **recap** (the whole contract you assembled).

The shape lives in:

- **`lib/deck/types.ts`** — the `Card` discriminated union and the `Deck` model.
- **`app/scenes/crowdfunding/_components/{Deck,cards,CodeBlock}.tsx`** — the stack container (active card over ghost edges that hint at remaining depth), the seven card faces, and the vox-style read-only code viewer.
- **`app/scenes/crowdfunding/deck.css`** + `_components/fonts.ts` — the "Indigo Study Deck" aesthetic (bone cards on deep indigo, saffron accent, teal for correct; Instrument Serif + Hanken Grotesk + JetBrains Mono + Noto Serif Devanagari).

**Two-tier naming.** Each card type carries a plain English label (THE IDEA, THE CODE, YOUR TURN, THINK, TRY IT, SHIP IT, WHAT YOU BUILT) plus a faint Sanskrit word behind it (`sutra`, `darshan`, `lekhana`, `prashna`, `prayoga`, `prakashana`, `samhita`) and a Devanagari watermark per type (`_components/card-meta.ts`). The plain word does the work; the Sanskrit word adds history and soul without taxing anyone who skips it. The choice is rooted in how the Vedas were transmitted through guru-shishya dialogue; the full essay lives in Shiv's vault, not this repo.

**The manicule survives, repurposed.** The beloved pointing hand is now a saffron ☞ that hovers the focused code region (THE CODE cards) or the blank you're filling (YOUR TURN cards), instead of tracking a line-by-line cursor. The marginalian, `api/friend`, and the `pointAtLine` round-trip are retired from the learner path (the route is kept as reference). The deck's AI is now a **grader** (`api/grade`), not a line-walker.

## Alternatives considered

### A. Keep the marginalian, just declutter balance-ledger
Solves Problem 1 only. The unit of progression is still a line and code is still the stage, so Problems 2 and 3 remain. A tidier cramped screen is still the wrong shape.

### B. Composition — wrap the line-by-line walk as one card type inside a deck
The deck would contain a "code-walkthrough" card that runs the old marginalian machinery. Rejected: the dense editor walk is exactly what felt cramped, so folding it in preserves the problem rather than removing it. The deck replaces the walkthrough rather than nesting it. (We can always re-introduce a walkthrough card later if a challenge needs one.)

### C. A slide presentation without co-authoring
Slides that explain and quiz but don't have the learner write and deploy. Rejected: it loses the "you wrote it, you deployed it" payoff, which is the spine of the whole thing.

## Consequences

**Positive:**
- One thing per card. Each kind of learning (concept, code, question, interaction) gets a treatment built for it instead of being squeezed through an editor.
- The co-authoring spine is now explicit: the learner builds a real contract across the deck and deploys it.
- The hand the user loved survives as a focus pointer, decoupled from the line-by-line metaphor.
- A reusable, challenge-agnostic card framework (see ADR-0004) — adding a challenge is mostly content.

**Negative / costs accepted:**
- A whole new UI surface and state model (`deck-store`, the card components, the chain runtime). Larger than a tweak.
- `balance-ledger` is removed (preserved in git history). ADR-0002's `pointAtLine` agentic loop is now dormant; the patterns it established are unused until a future card revives them.
- CONTEXT.md's marginalian-era sections are now historical; the v0.4 Resume-here is the live state.

## Reversibility

Low–medium. The deck is a large surface; reverting to the marginalian means resurrecting `balance-ledger` and the friend route as the learner path. But the bet — one-thing-per-card plus co-authoring is the right vehicle — should be falsified by learner reactions to the deck, not reverted before it has run.
