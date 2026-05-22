# CLAUDE.md

@AGENTS.md

This repository keeps agent guidance in `AGENTS.md` to avoid duplication. Please refer to `AGENTS.md` for the full instructions.

---

## Project-specific guidance — read this FIRST

This repo is **not** a vanilla scaffold-eth-2 fork. It hosts the v0.1 of an AI-assisted ERC-20 learning experience. The canonical source of truth for what we're building, why, where the build is, and what to do next lives in **[`CONTEXT.md`](./CONTEXT.md)** at the repo root. Read it before any other file in this repo.

Quick orientation:
- **`CONTEXT.md`** — design decisions, glossary, build progress log, and a `Resume Here` pointer at the top.
- **`docs/adr/0001-stay-on-se2-substrate.md`** — why this is a Next.js fork rather than a Svelte fork of remix-lite.
- **`docs/adr/0002-line-anchored-teacher.md`** — the line-anchored *teacher* (the marginalian) with a `pointAtLine` deixis tool. **Superseded by ADR-0003** (kept as historical record).
- **`docs/adr/0003-flashcard-deck.md`** — the v0.4 pivot: the line-by-line teacher is replaced by a slide-by-slide **deck of typed cards** (concept / code / your-turn / think / try-it / ship-it / recap) with two-tier Sanskrit naming. Read before touching anything under `scenes/crowdfunding/`.
- **`docs/adr/0004-teach-crowdfunding.md`** — why the deck teaches **crowdfunding** rather than token-vendor (no assumed knowledge for a cold learner).
- **`docs/adr/0005-in-browser-coauthoring-runtime.md`** — the runtime: slot skeletons + `completedSources()`, **`tevmContract` over viem `writeContract`** (the latter silently reverts after deploys — read this before writing chain calls), `tevmMine` time-travel, and the canonical-threading wrong-answer rule.
- **`packages/nextjs/app/scenes/`** — learner-facing pages. `scenes/page.tsx` is the React Flow atlas (topology-as-data); **`scenes/crowdfunding/`** is the fully-built deck (the reference for everything new). `scenes/balance-ledger/` was removed in v0.4 (git history).
- **`packages/nextjs/lib/deck/`** — the deck content + model: `types.ts` (card union), `crowdfunding-deck.ts` (the card array), `crowdfunding-contracts.ts` (slot skeletons + reference solutions + `completedSources`).
- **`packages/nextjs/app/scenes/crowdfunding/_components/useChainRuntime.ts`** — the in-browser chain (tevm deploy + contribute/execute/withdraw + `advanceTime`). The behaviour contract for chain interaction lives here.
- **`packages/nextjs/app/api/grade/route.ts`** — the deck's grader (`{verdict, feedback}` for THINK + YOUR TURN). `api/friend/route.ts` (the marginalian) is now dormant.
- **`packages/nextjs/lib/solc.ts`** + `solc-worker.ts` — solc-in-browser web-worker, now multi-file (`compileContracts()` + an import callback; vendored OZ in `lib/oz-sources.ts`). Real solidity, not a JS sim.
- **`packages/nextjs/app/lab/page.tsx`** — throwaway plumbing page that proves the runtime round-trip works.

Before writing any frontend code, **invoke the `/frontend-design` skill** — see the rule in `CONTEXT.md` under *frontend work — always go through the `/frontend-design` skill*.
