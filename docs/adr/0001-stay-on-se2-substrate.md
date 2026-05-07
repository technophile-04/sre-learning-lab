# ADR-0001: Stay on the scaffold-eth-2 fork (Next.js) instead of forking remix-lite (Svelte)

- **Status:** Accepted
- **Date:** 2026-05-07
- **Deciders:** shiv (after grilling session with Claude)

## Context

The v0.1 needs three things in the browser:

1. A solidity editor (with sane DX — syntax highlighting, errors).
2. Compile-and-execute infrastructure (`solc.wasm` in a web-worker, an in-memory EVM).
3. An ABI → tinkering UI for calling functions on the compiled contract.

Two existing references already do (1)–(3) almost perfectly:

- **`tevm-monorepo/examples/vite/src/SolEditor.tsx`** — React reference for editor +
  solc + tevm wiring. Cited in the vault's [[remix-killer]] note.
- **`ByteAtATime/remix-lite`** — Svelte. A near-bullseye for the runtime: zero-setup
  in-browser solidity IDE on tevm, with monaco editor, web-worker compilation, and an
  auto-generated contract interaction UI. Open source, forkable.

The pedagogy layer this product needs on top of (1)–(3) — atom graph, scene drilldown,
popup AI friend, Socratic checks — is roughly **60% of the v0.1 build** and is all
React-native (we're already invested in Next.js for the SE-2 ecosystem and the team's
familiarity).

Working directory `sre-learning-lab/` is already an SE-2 fork
(Next.js + React + wagmi/viem + hardhat workspace).

## Decision

Stay on the SE-2 fork. Build the runtime (solc web-worker, tevm client, ABI→form UI)
in React/Next.js, lifting *patterns* — not code — from `tevm-monorepo`'s React
SolEditor example as the primary reference and from `remix-lite` as a behaviour
reference for the auto-generated interaction UI.

`packages/hardhat` becomes a build-time / canonical-reference workspace, not part of
the runtime. `packages/nextjs` hosts everything the learner sees.

## Alternatives considered

### A. Fork remix-lite (Svelte)

Skips ~1 week of runtime plumbing. Inherits a polished IDE: shareable URLs, account
selector, gas/event UI. Rejected because:

- Mixing Svelte runtime with a React pedagogy layer is worse than building both in
  one stack. A single-stack codebase is cheaper to maintain and faster to evolve.
- The carlos / boris narrative is sharper as "AI-pedagogy layer on top of the SE-2
  substrate" than "we forked a generic IDE." Brand alignment is load-bearing for v0.1
  reactions, not a nice-to-have.
- Reusing SE-2 components (wagmi hooks, address rendering, network helpers) on the
  scene UI is impossible across a stack boundary.

### B. Hybrid: remix-lite in an iframe inside the SE-2 Next.js shell

Rejected on complexity. Cross-frame messaging for every code change, every state
mutation, and every AI context handoff is a surface area we can't afford in v0.1.
Two deploy targets, two build pipelines, and the pedagogy layer can never cleanly
reach into the runtime when it needs to (e.g. for the atom-completion check, which
must read tevm state).

## Consequences

**Positive:**

- Single React/Next.js codebase end-to-end. Vercel deploy is unchanged from SE-2's
  default. No new tooling.
- The atom graph, scene UI, and popup AI friend can directly read tevm state and the
  current editor buffer without IPC.
- Existing SE-2 components (the `Address` component family, `useScaffoldReadContract`
  patterns, etc.) are reusable in scenes.

**Negative / costs accepted:**

- We are reimplementing what remix-lite already shipped in Svelte. Estimated cost:
  ~1 week of runtime work before the pedagogy layer can land. Mitigation: lift
  directly from `tevm-monorepo/examples/vite/src/SolEditor.tsx` (already React, same
  Vite-style import patterns work in a Next.js client component) rather than
  designing the wiring fresh.
- We are taking on direct dependency on `tevm` rather than letting remix-lite shield
  us. Tevm API changes will land on us.

## Reversibility

Low. Switching to Svelte mid-build means rewriting the pedagogy layer. The cost of
revisiting this decision later is high enough that we should commit fully and ship
v0.1 before reconsidering.
