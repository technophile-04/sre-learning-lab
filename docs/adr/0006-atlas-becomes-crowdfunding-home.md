# ADR-0006: The atlas becomes the crowdfunding home plate

- **Status:** Accepted
- **Date:** 2026-05-25
- **Deciders:** shiv

## Context

ADR-0004 moved the *taught content* from ERC-20/token-vendor to crowdfunding, and the deck at `/scenes/crowdfunding` was rebuilt accordingly. But the pivot stopped at the deck. Two surfaces were left in the old world:

1. **The home page (`/`)** was still the stock scaffold-eth-2 "Welcome to Scaffold-ETH 2" boilerplate. The front door led nowhere real.
2. **The atlas (`/scenes`, `app/scenes/page.tsx`)** was still "atlas of erc-20": a five-atom decomposition (crowdfunding bolted on as `i.`, then direct-authorization, delegated-authorization, supply-management, audit-trail) flowing toward a **uniswap** synthesis node ("a market made of these atoms"). Four of those five atoms and the destination are ERC-20-native concepts. The only finished scene in the whole repo is the crowdfunding deck, yet the map advertised a curriculum that doesn't exist and the auth atoms were `SCENE STUB`s.

So the map and the front door both contradicted the product's actual state. This ADR finishes the crowdfunding pivot by reshaping the atlas and promoting it to the landing page.

## Decision

1. **The atlas becomes the home page.** Its converted form is rendered at `/` (`app/page.tsx`); the scaffold-eth boilerplate is deleted. `/scenes` redirects to `/` so the existing back-links survive without per-file edits.

2. **The atlas decomposes crowdfunding, not ERC-20.** The node tree is rebuilt from the deck's own `type: "concept"` cards into a five-atom crowdfunding spine that maps 1:1 to `CrowdFund.sol`: *trustless funding* → *tracking who gave what* (balances + events) → *taking the money in* (`contribute`, payable) → *sending ETH safely* (`withdraw`/refund, the reentrancy beat) → *a contract is a state machine* (`deadline`, `threshold`, `execute`). The ERC-20 atoms (authorization ×2, supply-management, audit-trail) leave the atlas.

3. **One atom is the entry; the rest are a locked journey-map.** The first atom is `available` and links to `/scenes/crowdfunding`; the other four render with the atlas's existing `locked` treatment — visible so the decomposition (v0.1 bet #2) still reads, but not separately navigable. This matches reality: there is one deck, and the five "atoms" are sections inside it, not separate routes.

4. **No synthesis destination.** ERC-20 earned a Uniswap capstone because Uniswap is literally built from `transfer`/`approve`/`allowance`. Crowdfunding is the deliberate gentle on-ramp, so v0.1 drops the "leads to —" node entirely rather than force a capstone.

5. **Reskin to the Indigo Study Deck.** The cream editorial plate (`--paper:#F2EEE5`, ink, vermilion) is retired for this page in favour of the deck's palette (desk `#16141d`, bone cards `#f5f0e4`, saffron `#e0913a`, teal-for-correct `#4c9c8b`; Instrument Serif / Hanken Grotesk / JetBrains Mono, Devanagari watermarks) so the home plate and the deck are one continuous visual world.

## Alternatives considered

### A. Keep the cream plate, recontent only
Cheapest, and the plate aesthetic was intentional. Rejected because the home→deck walk would jump cream→indigo; we chose one visual world over the "frontispiece, then study desk" gear-change.

### B. Keep a synthesis node — Juicebox / ConstitutionDAO
Genuinely attractive: ConstitutionDAO (run on Juicebox) exercises *every* crowdfunding atom, including the refund path the deck spends its scariest card on — strangers pooled ~$47M, lost the auction, and the code refunded them all. Rejected for v0.1 to keep crowdfunding framed as the gentle on-ramp and the plate uncluttered. Worth revisiting when later atoms land.

### C. Single-concept landing (drop the tree)
A crowdfunding landing with one big CTA into the deck. Rejected: it discards the decomposition visual that is the atlas's whole reason to exist (v0.1 bet #2).

### D. Deep-link atlas nodes into specific deck cards
Pedagogically nicest, but requires card-entry support in `Deck.tsx` + the store — extra plumbing beyond "convert the atlas." Deferred.

## Consequences

**Positive:**
- The front door now leads to the one finished, real experience.
- The map matches the taught content; no phantom ERC-20 curriculum.
- Home and deck share a palette end-to-end.

**Negative / costs accepted:**
- The cream editorial-plate aesthetic is retired for this page (git history).
- The `direct-authorization` and `delegated-authorization` stub scenes are no longer linked from the atlas — they become orphaned routes (still reachable by URL). Left in place for now; cheap to delete later.
- The dropped Uniswap node and the supply/audit locked atoms leave the atlas; re-adding them is a content edit.

## Reversibility

Medium. The route topology (atlas-as-home, `/scenes` redirect) is trivial to revert. The reskin and the tree rebuild are real work but recoverable from git history. The synthesis node is trivially re-addable.
