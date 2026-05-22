# ADR-0004: Teach crowdfunding, not token-vendor, as the first deck

- **Status:** Accepted
- **Date:** 2026-05-22
- **Deciders:** shiv

## Context

The deck (ADR-0003) needs a real SRE challenge to teach. The product idea is that the deck is a *second path* through an existing SpeedRunEthereum challenge: a learner can read the challenge README linearly on speedrunethereum.com, or do it interactively here. So the deck has to track an actual challenge and pull from its README + `CONCEPTS.yaml`.

We first built the deck on **token-vendor** (ERC-20 plus a Vendor contract that buys and sells the token for ETH). Building and testing it surfaced a mismatch.

**Problem: token-vendor assumes prior knowledge.** It leans on the ERC-20 standard and the `approve` → `transferFrom` pattern, which a learner only carries if they've already done the earlier challenges. For someone arriving cold at the deck, token-vendor leaps. Shiv flagged it directly: we were "jumping to challenge three directly," assuming concepts the learner probably doesn't have yet. The deck's whole point is to not make the learner leap.

## Decision

Teach **crowdfunding** (an earlier SRE challenge) instead. It starts from zero and builds up: mappings, events, `payable` and `msg.sender`/`msg.value`, sending ETH safely (reentrancy and the checks-effects-interactions ordering), and modeling a contract as a state machine. Its README is written as gentle, one-line-at-a-time steps, which is exactly the cadence the deck wants to mirror, and its contracts (`CrowdFund.sol` + `FundingRecipient.sol`) use no OpenZeppelin, so the in-browser compile path is simpler.

- Content lives in **`lib/deck/crowdfunding-deck.ts`** (the card array, authored from the challenge README + `CONCEPTS.yaml`) and **`lib/deck/crowdfunding-contracts.ts`** (the skeletons + reference solutions).
- The curriculum is re-authored in the **sandgarden voice** (lead with the situation, explain-then-test, small steps, no slop, no em dashes) rather than lifting `CONCEPTS.yaml` prose verbatim, which read flat.
- The deck framework is challenge-agnostic; swapping the taught challenge is a content change, not an architecture change. The token-vendor deck was an intermediate build, now removed (git history).

## Alternatives considered

### A. Keep token-vendor, add a preamble teaching ERC-20 + approve
Re-teaching two earlier challenges' worth of prerequisites inside one deck is a bigger leap, not a smaller one, and it duplicates what those challenges already do well. Rejected.

### B. Tokenization (NFTs) as the first deck
Tokenization is ERC-721, mostly inheritance boilerplate with roughly one custom function, too thin on code for the write-a-line cards. Its mental model (each token unique) also doesn't match the balance/transfer intuitions we want a learner to build early. Rejected.

### C. A custom toy contract, not from SRE
Rejected on principle: the deck is meant to be an alternate path through the *real* SRE challenges, so it has to track an actual challenge and its authored material, not a contrivance.

## Consequences

**Positive:**
- No assumed knowledge; a genuinely gentle gradient for a cold learner.
- A richer code surface (`contribute` / `withdraw` / `execute` / `receive` / `timeLeft`, a modifier, and a real reentrancy lesson) gives the write-a-line cards more to work with than token-vendor did.
- No OpenZeppelin in the compile path for this challenge.
- Crowdfunding's deadline gives a natural, concrete lesson that contracts can't self-execute (see ADR-0005's time-travel beat).

**Negative / costs accepted:**
- We threw away the token-vendor deck content and its buy/approve/sell runtime (git history).
- Crowdfunding's contract pieces are interdependent (one slot reads another's state), which forced the `completedSources()` mechanism in ADR-0005.

## Reversibility

High. Challenge content is decoupled from the deck framework; swapping back to token-vendor, or adding more challenges alongside crowdfunding, is a content edit, not a rebuild.
