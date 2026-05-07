# sre-learning-lab — context

A scaffold-eth-2 fork that hosts the v0.1 testbed for the AI-assisted solidity learning experience.
Lives at `~/Desktop/github/sre-learning-lab/` locally, `technophile-04/sre-learning-lab` on GitHub.
The product hypothesis being tested here is **not** "AI chatbot wrapped around a tutorial" —
that already exists in the SRE site. This product tests three orthogonal bets, baked together,
on a single concept (ERC-20) curated from three canonical sources.

## Resume here (next session)

**Where we are (as of 2026-05-07).** The structural shell is shipped and visible.
The runtime round-trip is green. **What is missing is the part that makes this product
*smart* rather than just typeset:** the AI behavior layer. That is the explicit focus
of the next session.

**To verify current state in ~60 seconds:**

```bash
cd ~/Desktop/github/sre-learning-lab
yarn workspace @se-2/nextjs dev
```

Then visit, in order:
1. `http://localhost:3000/scenes` — the atlas (frontispiece plate). 5 atoms + Uniswap synthesis. i. is completed (wax-seal cross). ii. and iii. are clickable. iv. and v. are locked.
2. `http://localhost:3000/scenes/balance-ledger` — the only fully-built atom. Editor on left, ledger on right, sentence-form transfer composer ("send N from A to B"). Click *deploy contract*, then send a transfer. Vermilion arrow draws across the table. Audit trail slides in. The inkwell popup (bottom-right) is a static shell — input is disabled, label says "v0.2 — actual answers."
3. `http://localhost:3000/lab` — throwaway plumbing page. Proves solc + tevm round-trip without any pedagogy on top.

If any of those pages don't render, type-check first (`yarn workspace @se-2/nextjs check-types`) and inspect the browser console.

**The pivot for the next session: build the AI behavior layer.** Three concrete first
steps, in order:

1. **`packages/nextjs/app/api/friend/route.ts`** — Next.js route handler. POST endpoint
   that accepts `{ messages, context: { atomId, source, balances, recentTransfers } }`
   and streams an OpenRouter response. Use the Vercel AI SDK (`ai` + `@ai-sdk/openai`)
   wired to OpenRouter's OpenAI-compatible endpoint. Key held server-side via
   `OPENROUTER_API_KEY` env var. Streaming response back to the client. Invoke the
   `claude-api`-equivalent or the `vercel:ai-sdk` skill before writing the handler.

2. **Wire the popup in `app/scenes/balance-ledger/page.tsx`** — the `FriendInkwell`
   sub-component near the bottom of that file already has a disabled input and a
   greeting message. Add `messages` state, enable the input, post-and-stream to
   `/api/friend`, render assistant chunks into a new bubble. Pass current scene
   context (the source string, the balances dict, the recent transfers array) as the
   `context` field of the request body. **Before any visual changes**, invoke
   `/frontend-design` per the rule below.

3. **Atom-completion detector + Socratic prompt.** In `app/scenes/balance-ledger/page.tsx`,
   detect the canonical "you've got it" event: a successful transfer where the sender's
   balance decremented and the receiver's incremented (we already track both). On that
   event, mark the atom complete via `localStorage.setItem("atom:balance-ledger", "completed")`,
   then auto-open the friend popup with **one canned Socratic question** (hardcoded for
   v0.1; AI-generated in v0.2). Suggested question: *"Why does the contract update both
   balances atomically? What happens if the second update fails?"* The atlas page
   should read `localStorage` on mount so the wax-seal cross reflects what the learner
   has actually done.

**What's intentionally still deferred** (do not build these next session):
- Voice / cursor-pointing for the friend (clicky's signature features)
- Atoms iv. and v. — they're locked on the atlas; the form factor is proven, the
  content can wait
- The Uniswap synthesis door
- Cross-session memory (the friend resets each page-load — fine for v0.1)
- The Address-from-scaffold-eth refactor [[shiv]] flagged ("for another conversation")

**Files to read in this order if a fresh Claude (or fresh-Shiv) is picking this up cold:**
1. `CONTEXT.md` (this file) — the whole `## Glossary` section.
2. `docs/adr/0001-stay-on-se2-substrate.md` — why we did NOT fork remix-lite.
3. `packages/nextjs/app/scenes/balance-ledger/page.tsx` — the reference scene with
   the editorial aesthetic baked in. Any new scene/component should match this voice.
4. `packages/nextjs/app/scenes/page.tsx` — the atlas, to see how navigation hangs together.
5. The grilling transcript that produced this design lives in conversation memory
   only — not the repo. Sandgarden update for [[carlos]] at
   `2. Areas/sandgarden/updates/2026-05-07-learning-platform-v01-plan.md` in the
   vault has the highlights.

The build-progress log lower in this file (`### build progress`) has the running
chronological record of what's landed, with dates.

## Glossary

### v0.1 bet
The three claims this v0.1 is trying to falsify, baked into one experience:
1. **Visual tinkering** — code on one side, live state visualization on the other; mutating
   code drives the visual; mutating the visual is a way of asking questions about the code.
2. **Building-blocks decomposition** — present a concept as a tree of sub-atoms first, let
   the learner internalise each atom, then synthesize. (See **decomposition unit** below.)
3. **Socratic evaluation** — open-ended questions graded by AI, used to confirm understanding
   before the learner advances. Pattern: a passing test ≠ understanding.

Conversational scaffolding (the chat-with-the-page experience) is **out of scope** —
the SRE site already does that.

### content sources (canonical, for ERC-20)
1. OpenZeppelin ERC-20 docs / contracts.
2. ethereum.org ERC-20 tutorial.
3. speedrun-ethereum ERC-20 challenge.

These are the only sources curated for v0.1. No new curriculum is being authored from scratch.

### decomposition unit
**Concept-level atoms with function-level drilldown.** ERC-20 is presented as a small set
of conceptual atoms; each atom can be zoomed into a function-level view when the learner
wants to see the code. Atoms (proposed):

1. **Balance ledger** — the contract is a database of "who owns how much"; transfers
   atomically update two rows.
2. **Direct authorization** (`transfer`) — you can move your own tokens.
3. **Delegated authorization** (`approve` + `transferFrom`) — grant a third party
   permission to pull from you, capped and revocable. The Uniswap-bridge atom; also the
   source of every infinite-approval exploit.
4. **Supply management** (`mint` / `burn`) — where tokens come from / go to.
5. **Audit trail** (events) — `Transfer` / `Approval` logs are how block explorers and
   indexers reconstruct history.

Storage-level decomposition (mappings, slots, packing) is intentionally **not** the spine —
it's a follow-on lens for learners who want to look under the floor.

### form factor
Three layers, nested:

1. **Atom graph (top level).** A force-directed graph of the 5 atoms with dependency edges,
   modeled on obsidian's graph view. Untouched atoms are dimmed; completed atoms light up;
   synthesis nodes (e.g. "Uniswap") are visible-but-locked, signalling the road ahead. The
   graph IS the progress indicator.

2. **Scene (per atom).** A split-panel work surface for the atom the learner clicked into:
   - **Left:** minimal solidity editor showing only the code that matters for this atom.
   - **Right:** a visual tinkering panel — the live state the code mutates (e.g. for the
     balance ledger atom: a table of holders + animated transfer arrows).
   - **Corner:** a local-graph mini-map showing this atom's neighborhood so the learner
     never loses the macro context.

3. **AI friend (overlay).** A small summonable popup — *not* a persistent sidebar. The
   metaphor is "tap a friend on the shoulder" rather than "chat panel that's always
   visible." Summoned by shortcut or icon. Inspired by clicky's overlay vibe (lives on top
   of the work surface), but no voice and no cursor-pointing in v0.1 — those are deferred
   so we can validate the *pedagogy* before investing in the *delivery*.

What's deferred to v0.2+ (explicit non-goals):
- Voice input/output.
- Cursor-pointing / clicky-style screen annotation.
- Synthesis nodes that actually open (Uniswap remains hint-only).
- Cross-atom memory of the learner across sessions (single-session state for v0.1).

### execution model
**Real solidity, browser-only, no backend.**

- `solc.wasm` runs in a web-worker and compiles user code on each save. Working
  reference snippet already lives in the [[remix-killer]] note in the vault — port it.
- [tevm](https://github.com/evmts/tevm-monorepo) hosts the in-browser EVM. Compiled
  bytecode is deployed to a tevm client; state mutations are read back from tevm and
  drive the visualization panel.
- `packages/hardhat` becomes a build-time / reference-contract workspace, **not** a
  runtime dependency. No localhost node is started for v0.1.
- `packages/nextjs` hosts the atom graph, the scene UI, the solc web-worker wrapper,
  and the tevm client.
- Each scene exposes UI "knobs" (sliders / pickers / inputs) that wrap function-call
  arguments — fast tinker loop without lying about what's executing.
- Reference prior art to study before building: `ByteAtATime/remix-lite`.

Why tevm over `@ethereumjs/vm` directly: viem-compatible API matches what the SE-2
frontend already uses; the tevm team maintains a SolEditor reference cited in the
remix-killer note; one less glue layer.

Static deploy on vercel — no server runtime needed for code execution.

### substrate
Stay on the SE-2 fork at this repo's root (Next.js + React + wagmi/viem). Do **not** fork
`ByteAtATime/remix-lite` even though it is closer to the runtime we want — the pedagogy
layer is the majority of the build and is React-native, and the SE-2 brand alignment is
load-bearing for the carlos / boris narrative. See `docs/adr/0001-stay-on-se2-substrate.md`.

Reference repos to lift patterns from (not fork):
- `tevm-monorepo/examples/vite/src/SolEditor.tsx` — React reference for editor + solc + tevm.
- `ByteAtATime/remix-lite` — Svelte reference for ABI→form auto-generated interaction UI.

Models: routed through OpenRouter (per the original brief). AI calls go through a thin
server route in the Next.js app; client never holds the OpenRouter key.

### AI friend behaviour (v0.1)
**Mostly summoned, occasionally Socratic at atom-completion beats.**

- Default mode: silent. The popup is closed. The friend does not interrupt while the
  learner is mid-tinker.
- Summoned mode: learner opens the popup (icon or shortcut). The friend has full context
  — current atom, current code in the editor, recent state mutations from tevm, what the
  learner has already tried.
- Proactive mode: at *atom-completion beats* — defined as (a) the canonical "you've got
  it" condition for the atom is met (e.g. for balance ledger: a successful transfer that
  decremented sender and incremented recipient), and (b) the learner has been idle ~30s —
  the friend surfaces ONE Socratic question. The learner can answer or dismiss. Answering
  is what unlocks the next atom on the graph.
- The friend's tone is peer-to-peer, not teacher-to-student. Casual, honest, short. Not
  hype. Not "great question!" cheerleading. (See the sandgarden writing style for voice.)
- Adaptation: the friend reads the learner's prior answers and code edits within the
  current session and adjusts depth. No cross-session memory in v0.1.

Fully out of scope for v0.1: voice, cursor-pointing on screen, always-watching mode.

### v0.1 scope decisions
- **One atom shipped end-to-end first**: balance ledger. Reasoning: simplest visualization
  (a holders×balances table with animated transfers), exercises the entire stack (editor +
  web-worker solc + tevm + scene UI + popup friend + atom-completion check + graph
  unlock), and has no dependencies on the harder atoms. If balance ledger doesn't feel
  right, the entire v0.1 thesis is wrong — fail fast.
- **No worktree-based parallel iterations.** Single focused build of one v0.1, ship,
  collect reactions per the carlos "ship v0.1, don't pitch ideas" rule, then branch.
- **Synthesis nodes** (Uniswap, lending, etc.) are *visible-but-locked* placeholders on
  the graph. They exist only to motivate; clicking does nothing in v0.1.

### tevm runtime API (the shape we'll write against)

```ts
import { createMemoryClient, PREFUNDED_ACCOUNTS } from "tevm";

const client = createMemoryClient();

// "deploy" by setting code at an arbitrary address — we get bytecode from solc-worker
await client.setCode({ address: "0x...", bytecode: deployedBytecode });

// call functions using viem's familiar contract API
await client.writeContract({
  account: PREFUNDED_ACCOUNTS[0],
  address: "0x...",
  abi,
  functionName: "transfer",
  args: ["0xRecipient", 100n],
});
await client.tevmMine();

// read state with viem readContract
const balance = await client.readContract({ address, abi, functionName: "balanceOf", args: [holder] });
```

We do **not** use the tevm bundler plugin — that's for build-time `.sol` imports. Our
solidity is user-typed, so compilation happens at runtime in a web-worker via solc.wasm.

### editor
`@uiw/react-codemirror` (CodeMirror 6 React wrapper) + `@replit/codemirror-lang-solidity`
for syntax + a curated theme (`@uiw/codemirror-theme-github` dark or material). Chosen
over Monaco for bundle size, aesthetic control, and fit-for-purpose ("scene editor", not
"VS Code in a browser").

### frontend work — always go through the `/frontend-design` skill

Any time we build, refactor, or polish a UI surface in this repo — pages, components,
scenes, the atom graph, the popup AI friend, error states, anything visible — invoke the
`frontend-design:frontend-design` skill **before** writing the component code. This is a
hard rule, not a suggestion.

Why: the v0.1 week-1 lab page was deliberately rough (inline styles, no daisyUI, no
craft) to prove the runtime, but that aesthetic floor is **not** acceptable for any
learner-facing surface. The skill's purpose is to avoid generic-AI frontend output and
push toward distinctive, production-grade design — which is exactly what this product
needs to land with [[carlos]] / [[boris]] / [[faris]] reactions.

How to apply:
- Building a new page or component → invoke the skill first, then implement.
- Touching the lab page once it stops being "throwaway plumbing" (i.e. the moment it
  becomes anything a learner sees) → invoke the skill before that touch.
- Tweaking copy, microcopy, error states, empty states → still goes through the skill,
  because those are part of the perceived quality of the product.
- The only exception: pure runtime / non-visual code (workers, EVM wiring, AI route
  handlers). No skill needed for those.

### build progress (running log)

Append-only checklist of what's actually shipped, paired with the matching CONTEXT entries.
Update this section every time a meaningful chunk lands or a decision changes.

- [x] **2026-05-07** — design grilling complete; CONTEXT.md drafted; ADR-0001 (substrate)
      written; vault logged ([[remix-killer]] note refreshed, sandgarden update for
      [[carlos]] filed, today's journal todos ticked).
- [x] **2026-05-07 (same day) — week 1 runtime round-trip GREEN.** solc-wasm in
      web-worker compiles user-typed solidity (3023-byte bytecode for the starter
      MiniERC20); tevm `createMemoryClient({ miningConfig: { type: "auto" } })` deploys
      via viem's `deployContract` to the canonical CREATE address; `writeContract` +
      auto-mine + `readContract` complete the call/state cycle. `transfer 100 A → B`
      verified: balances flip from 1000000/0 → 999900/100 as expected. Lives at
      `packages/nextjs/app/lab/page.tsx` (intentionally unstyled — "throwaway plumbing"
      per the frontend-design exemption).
      Two bugs surfaced & resolved while landing this:
      1. tevm needs `createTransaction: true` OR `miningConfig: { type: "auto" }` —
         otherwise viem actions silently degrade to `eth_call`. Auto-mine is the
         simpler default; we'll only override in scenes that need batching.
      2. `account` must be a real `Account` object (e.g. `PREFUNDED_ACCOUNTS[0]`), not
         a hex string. Hex-as-account works on JSON-RPC nodes with unlocked accounts,
         not on tevm.
- [x] **2026-05-07 — atlas (the zoom-out view) + two stub scenes landed.** After
      [[shiv]] flagged that we'd been over-investing in structural shell while the
      AI-behavior bet remained un-tested, we shipped the *navigation skeleton* the AI
      will eventually hook into:
      - `app/scenes/page.tsx` — atlas / frontispiece plate. Hand-coded SVG diagram
        (1180×600) with 5 atoms + 1 synthesis node (Uniswap as illuminated drop-cap).
        Edges labelled with words ("extends", "implies", "leads to —"). Page-load
        orchestrated entrance: title → frame → atoms (staggered) → edges
        (stroke-dashoffset) → editor's note. Atom hover lights up connected edges in
        vermilion. Locked atoms (iv, v) dimmed with caption "completes after i".
      - `app/scenes/direct-authorization/page.tsx` and `.../delegated-authorization/page.tsx` —
        scene stubs in the same editorial aesthetic. Honest "fig. ø — sketched" banner;
        teaser of what the full scene will explore.
      - "↩ atlas · pl. i." marginalia added to the existing balance-ledger scene
        (and to both stubs) — small, top-right-of-header, with a vermilion underline
        that draws in on hover. Completes the zoom-in/zoom-out cycle.
      Type-check clean. Pivot decision: the structural shell is now visible enough to
      validate the form factor; further structural work (atoms iv, v; the synthesis
      door) is paused until the AI behavior layer ships and we can see whether
      Socratic checks + adaptive depth are pulling weight.
- [~] **week 2 — balance ledger scene (in progress).** First pass landed at
      `packages/nextjs/app/scenes/balance-ledger/page.tsx` after invoking the
      `/frontend-design` skill. Aesthetic: scholar's reading room — paper background,
      vermilion + olive-gold accents, Fraunces (display) + DM Mono (code) via
      `next/font/google`. Light theme; CodeMirror uses `githubLight`. Notable choices:
      transfer composed as a sentence ("send N from A to B"), animated count-up on
      every balance change (`AnimatedNumber` sub-component, used 5×), vermilion SVG
      arrow draws across the ledger on transfer (fades in 1.5s), audit trail slides
      in from the right, Roman numeral "atom i. of v." marginalia. AI friend renders
      as an inkwell-style toggle in the bottom-right corner — UI shell only for v0.1
      (no model wired yet, input disabled, honest "v0.2 — actual answers" footer).
      Type-check clean. Still TODO this week: atom-completion check (the canonical
      "you've got it" trigger that unlocks the next atom on the graph), and live
      verification at `yarn dev`.
- [ ] **week 3 — graph + Socratic** — atom graph homepage; one Socratic question; vercel deploy
</content>
</invoke>