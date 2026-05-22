# ADR-0005: In-browser co-authoring runtime for the deck

- **Status:** Accepted
- **Date:** 2026-05-22
- **Deciders:** shiv

## Context

The deck's spine (ADR-0003) is "co-author a real contract across the cards, then deploy it and poke it in the browser." Making that work needs: the learner fills in pieces of a contract over many cards; an in-progress contract still compiles and deploys so interactive cards work; deploy and state-changing calls run against a real EVM in the browser; and the crowdfunding deadline can be crossed on demand. Three findings along the way were non-obvious enough to record.

**Problem 1: the slots are interdependent.** The learner fills `/*__SLOT__*/` tokens one card at a time, but crowdfunding's pieces reference each other (`execute` reads `deadline`, `withdraw` reads `openToWithdraw`). A half-filled contract won't compile, so an interactive card mid-deck would have nothing to deploy.

**Problem 2 (the surprising one): viem's `writeContract` deterministically reverts against the tevm memory client when the call follows two contract deploys in the same flow.** A token transfer that simulated fine reverted once mined, leaving balances at zero (`ERC20InsufficientBalance`). A repro pinned it: 4/4 reverts via `writeContract` versus 2/2 success via tevm's native action. balance-ledger never hit this because it only did one deploy before transferring; the deck's two-contract deploy flow exposes it.

**Problem 3: there is no time-travel RPC.** tevm rejects `evm_increaseTime` and `evm_setNextBlockTimestamp`. The crowdfunding deadline is `block.timestamp + 30 seconds`, so the failure and success paths can't be demonstrated without moving the clock.

## Decision

1. **Slot skeletons + `completedSources()`.** (`lib/deck/crowdfunding-contracts.ts`) YOUR TURN cards fill one slot each via `fillSlot`. The wrong-answer rule: the canonical reference line threads forward so later cards still compile, **unless** the AI grader judges the learner's line equivalent, in which case theirs is kept. At deploy time `completedSources()` fills any *remaining* slots with reference code, so an in-progress contract always runs while keeping whatever the learner has written. The store (`services/store/deck-store.ts`, zustand + persist) persists progress and the running source, but **not** the tevm deployment, which resets on reload.

2. **State-changing calls go through tevm's native `tevmContract({ createTransaction: true, addToBlockchain: true })`, not viem's `writeContract`.** (`app/scenes/crowdfunding/_components/useChainRuntime.ts`) Deploys still use `deployContract` (they work). This is the fix for Problem 2 and is load-bearing: reverting it re-introduces the silent revert.

3. **`advanceTime` mines blocks to cross the deadline.** tevm advances roughly one second per mined block, so `advanceTime` mines ~40 blocks to clear the 30s window. The "let the deadline pass" button literally mines time forward, which doubles as the lesson that a contract can't self-execute, someone has to move the chain and poke it.

4. **Multi-file compile.** (`lib/solc-worker.ts`, `lib/solc.ts`) The worker takes a sources map plus an import callback that resolves the relative `./FundingRecipient.sol`. OpenZeppelin v5 is vendored in `lib/oz-sources.ts` (regenerable via `scripts/gen-oz-sources.mjs`) for future OZ challenges; crowdfunding itself needs none. `solc.ts` exposes `compileContracts()` alongside the legacy single-file `compileSolidity()`.

5. **AI grading.** (`app/api/grade/route.ts`) `generateObject` returns `{ verdict, feedback }` in two modes: THINK answers graded against the challenge's rubric keywords, YOUR TURN lines graded for functional equivalence to the canonical. Reuses the OpenRouter wiring from `api/friend`.

## Alternatives considered

### A. Gate interactive cards on full deck completion instead of `completedSources()`
Forces a strict linear order and kills the "try it as you go" feel. `completedSources()` lets any in-progress state run while still reflecting the learner's own lines. Rejected.

### B. Keep `writeContract` and debug the revert
It's a deterministic incompatibility in the deploy-then-write flow against the memory client, not a flake. `tevmContract` is the supported native path and works. Not worth fighting. Rejected.

### C. Shrink the deadline or make the learner wait real seconds
Waiting 30s in a flashcard is bad UX; mining blocks is instant and turns the wait into a teachable beat. Rejected.

### D. Flatten OZ into the source / hand-write a minimal ERC20
We vendored the real OZ sources behind an import callback instead, so the learner sees real `import "@openzeppelin/..."` lines. Moot for crowdfunding (no OZ) but the path stays for future challenges. Rejected for the general case.

## Consequences

**Positive:**
- In-progress contracts always deploy; the learner's correct lines are theirs, the gaps fill invisibly.
- The time-travel button is a pedagogy beat, not just plumbing.
- The multi-file + vendored-OZ compile path is reusable for later challenges.

**Negative / costs accepted:**
- `completedSources()` means an interactive card may run partly-canonical code; the card copy has to stay honest about that ("we fill in what you haven't written yet").
- `tevmContract` is a tevm-specific dependency. A future migration off tevm reopens this decision.
- Problem 2 is invisible without this ADR. A future agent will reach for `writeContract` and hit the silent revert; this note is the breadcrumb.

## Reversibility

Medium. The runtime is localised to `useChainRuntime.ts`, the `solc` modules, and the contracts module. The `tevmContract`-over-`writeContract` choice in particular should not be reverted without re-hitting Problem 2.
