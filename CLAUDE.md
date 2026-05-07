# CLAUDE.md

@AGENTS.md

This repository keeps agent guidance in `AGENTS.md` to avoid duplication. Please refer to `AGENTS.md` for the full instructions.

---

## Project-specific guidance — read this FIRST

This repo is **not** a vanilla scaffold-eth-2 fork. It hosts the v0.1 of an AI-assisted ERC-20 learning experience. The canonical source of truth for what we're building, why, where the build is, and what to do next lives in **[`CONTEXT.md`](./CONTEXT.md)** at the repo root. Read it before any other file in this repo.

Quick orientation:
- **`CONTEXT.md`** — design decisions, glossary, build progress log, and a `Resume Here` pointer at the top.
- **`docs/adr/0001-stay-on-se2-substrate.md`** — why this is a Next.js fork rather than a Svelte fork of remix-lite.
- **`packages/nextjs/app/scenes/`** — where the learner-facing pages live (atlas + per-atom scenes).
- **`packages/nextjs/lib/solc.ts`** + `solc-worker.ts` — solc-in-browser web-worker (the runtime is real solidity, not a JS sim).
- **`packages/nextjs/app/lab/page.tsx`** — throwaway plumbing page that proves the runtime round-trip works.

Before writing any frontend code, **invoke the `/frontend-design` skill** — see the rule in `CONTEXT.md` under *frontend work — always go through the `/frontend-design` skill*.
