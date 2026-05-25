# ADR-0007: Pare the deck to an in-browser concepts workshop

- **Status:** Accepted
- **Date:** 2026-05-25
- **Deciders:** shiv

## Context

The crowdfunding deck (ADR-0003/0004) was built to mirror the full SpeedRunEthereum challenge, which assumes a real deployment target: a frontend listening for events, a separate `FundingRecipient` contract that the funds flow to. But this deck is **not** a deployment. It's an in-browser concepts workshop — the only "frontend" is the deck itself reading state directly off the tevm chain, and nothing off-chain is listening. Two pieces of the challenge were teaching infrastructure the learner can't see or use here, which is a leap away from "no assumed knowledge."

Shiv called two of them out directly while walking the deck:

1. **Events.** The "Telling the outside world" card taught `emit Contribution(...)` so a frontend could hear it. In a workshop with no listener, that's a concept with no payoff on screen.
2. **The `FundingRecipient` contract.** The success path forwarded ETH to a second contract and flipped its `completed` flag. The learner never edits it, and a whole second contract (plus an `import`, plus a multi-file compile) is ceremony around what is conceptually "send the money to an address."

## Decision

Strip the deck to the concepts that actually run in-browser.

1. **Remove events entirely.** Dropped the `events-idea` + `event` cards, the `/// Events` section and `__EVENT__` slot from the skeleton, `__EVENT__` from `CANONICAL`, and the `emit` line from `__CONTRIBUTE__`. `contribute()` is now one honest line: `balances[msg.sender] += msg.value;`.

2. **Remove the `FundingRecipient` contract.** `fundingRecipient` is now a plain `address`, not a contract instance. The success flag (`completed`) lives on `CrowdFund` itself. `execute()` does effects-before-interactions — `completed = true;` then forwards via `fundingRecipient.call{value: address(this).balance}("")` — and the `notCompleted` modifier checks `completed` instead of `fundingRecipient.completed()`. The error `WithdrawTransferFailed` was renamed `TransferFailed` since both `withdraw` and `execute` now use it. `CrowdFund.sol` is the only file; the multi-file compile path and `FUNDING_RECIPIENT_SOURCE` are gone. The runtime (`useChainRuntime`) deploys one contract, passing a prefunded EOA (`PREFUNDED_ACCOUNTS[2]`) as the recipient address, and reads `completed` off `CrowdFund`.

## Alternatives considered

### A. Keep events, just explain there's no listener here
Teaching a mechanism whose effect the learner can't observe is exactly the kind of leap the deck exists to avoid. If a later, deployable challenge needs events, that's where they belong. Rejected.

### B. Keep `FundingRecipient` as a "you don't edit this" given contract
It was already given, but it still forced a second file, an `import`, the multi-file solc import-callback, and a deploy-order dance — all surface area for a concept (forward the money) that an `address` expresses cleanly. Rejected.

## Consequences

**Positive:**
- `contribute()` is a single line; the contract is one self-contained file.
- Moving `completed` onto `CrowdFund` made `execute()` a cleaner checks-effects-interactions example (set the flag, then send), reinforcing the reentrancy lesson the deck already teaches.
- Simpler compile: single-file, no OpenZeppelin, no import callback needed for this challenge (the OZ scaffolding in `lib/oz-sources.ts` stays for future challenges).

**Negative / costs accepted:**
- The deck no longer matches the full SRE challenge one-to-one (events + recipient contract are part of the real challenge). That's fine: this is a concepts workshop, not the canonical challenge.

**Gotchas worth remembering:**
- `.call{value: ...}("")` works on a plain `address` (it's a low-level member of `address`, not just `address payable` — only `.transfer`/`.send` require `payable`). That's why dropping the contract wrapper and keeping `fundingRecipient` as `address` compiles and forwards funds fine. Verified with a headless `solc 0.8.x` compile of the fully-filled contract (0 errors, 0 warnings).
- **Changing the skeleton broke already-open browsers.** `deck-store` persists the running `sources` in `localStorage`, so a client that had loaded the old skeleton kept the old `CrowdFund.sol` — `import "./FundingRecipient.sol";` and all — and the in-browser compile reverted with `Source "FundingRecipient.sol" not found`. The code was correct; the persisted state was stale. Fix: the store now carries a `version` (bumped to 1) with a `migrate` that re-seeds `sources` from the current skeleton, so any skeleton change discards incompatible persisted source instead of feeding a dead import to solc. **Bump the version whenever the skeleton changes shape.**

## Reversibility

High. Events and a recipient contract are additive content + a slot or two; re-introducing them for a future deployable challenge is a content edit plus a runtime tweak, not a rebuild. The deck framework is challenge-agnostic (ADR-0004).
