# sre-learning-lab — context

A scaffold-eth-2 fork that hosts the v0.1 testbed for the AI-assisted solidity learning experience.
Lives at `~/Desktop/github/sre-learning-lab/` locally, `technophile-04/sre-learning-lab` on GitHub.
The product hypothesis being tested here is **not** "AI chatbot wrapped around a tutorial" —
that already exists in the SRE site. This product tests three orthogonal bets, baked together,
on a single concept (ERC-20) curated from three canonical sources.

## Resume here (next session)

**LANDED (2026-05-26) — v0.6: the deck is non-linear, the contract is always one click away, and the index leans fully into the sanskrit naming.**
Two additions from the [[carlos]] review on 2026-05-25, both in `app/scenes/crowdfunding/_components/`.
**(1) Lesson index (ADR-0009).** A new `JourneyPanel.tsx` sits in the left margin (288px,
sticky, max-height 100vh) and is **collapsible** (chevron in the panel header collapses; a
`☰ the path · NN / 35` button in the deck area expands; preference persisted to
`localStorage` under `deck:panel-collapsed`). Only CONCEPT / SHIP IT / RECAP cards open
chapters; TRY IT folds under its parent concept's hands-on beat (9 chapters total, not
fragmented). Each chapter heading IS the starter card's clickable row — Roman numeral on
the left, serif italic title — so there's no redundant title duplication. Supporting cards
indent below with a faint vertical thread linking them. Each supporting row is
**Devanagari glyph + title only** — no English tier-1 label alongside the sanskrit. The
sanskrit IS the type chip (the philosophy from [[sre-learning-lab-naming-philosophy]]
applied in earnest); learners absorb the mapping from every deck card's header. Hovering a
glyph surfaces the English tier-1 as a `title` tooltip for accessibility. Current row
carries the saffron edge marker + bobbing `☞` (the same hand the code gutter uses). Verdict
glyphs after the title (`✓` teal pass, `◐` saffron-deep partial, `◌` faint miss) come from
`deck-store.progress`. Below 1024px the panel folds into a top-down sheet opened by the
same `☰ the path` button.
**(2) Code peek (ADR-0010).** A new `CodePeekSheet.tsx` slides in from the right
(`width: min(560px, 100vw)`, 420ms ease) over a blurred backdrop. The body renders
`sources['CrowdFund.sol']` through the existing `CodeBlock` — same shiki render, same vox
dim+hover-reveal, same `☞` — so no new interaction language. If the current card has an
anchor into the source (CODE: `fromAnchor`/`toAnchor`, YOUR TURN: the `slot` token while
unfilled, or the canonical line head after fill), the focused range is highlighted and
scrolled into view on open. Opened from a `peek code` button in the top bar (between
`reset` and `↩ atlas`) or the `c` shortcut (guarded against `<input>` / `<textarea>` /
CodeMirror focus). `Esc` and backdrop click close it. Peek open-state is local component
state in `Deck.tsx`, NOT persisted — UI state doesn't belong in `deck-store`.
**Shell.** `Deck.tsx` now wraps the existing center column in a `.deck-shell` flex container
with the journey panel on the left and the deck centered in the remaining space. No changes
to `useChainRuntime`, the card content, the grader, or the persisted store schema.

**Verified (2026-05-26):** `check-types` clean throughout; `/scenes/crowdfunding` compiles
and serves 200; no new compile errors (only the pre-existing wagmi/ox tempo warnings).
**NOT yet browser-verified:** the panel's visual polish, chapter grouping legibility, the
peek sheet's scroll-into-view on open for YOUR TURN slot anchors after the slot has been
filled, mobile sheet interactions below 1024px. **Top of the next session:** open
`/scenes/crowdfunding` in a real browser, walk the deck via the panel, peek the source
from a few cards (concept, mid-flow YOUR TURN, late TRY IT), test `c` toggle + `Esc` close.

**Deferred to v0.7 (per [[carlos]] 2026-05-25):** the skill-level interview — a short
conversation up front that figures out which atoms the learner already knows and skips
them, landing them mid-deck with contrast scaffolding. Bigger lift: a new pre-deck
surface, a structured-output model call to map "yes I know mappings" → "skip cards 4-6",
a prerequisite graph between cards (the deck is currently a flat array), and a contrast
beat at the entry card. Likely wraps in the explain → justify → apply tier framing from
the [[jeffrey-scholz]] meet (2026-05-08). Vault plan: `2026-05-26-learning-platform-v06-plan.md`.

---

**LANDED (2026-05-25) — v0.5: the atlas is now the crowdfunding home plate.**
The crowdfunding pivot (ADR-0004) had reached the deck but not the front door;
`docs/adr/0006` finished it. The atlas now lives at the home page (`app/page.tsx`),
reskinned from the cream editorial plate to the Indigo Study Deck palette
(Instrument Serif / Hanken Grotesk / JetBrains Mono, bone cards on the `#16141d`
desk, saffron edges, teal for the entry atom). Its node tree was rebuilt from the
old ERC-20 decomposition (→ uniswap) into a five-atom *crowdfunding* spine derived
from the deck's concept cards: trustless funding → tracking contributions → taking
money in (`contribute`) → sending ETH safely (`withdraw`/refund) → state machine
(`deadline`/`threshold`/`execute`). Only the first atom is `available`
(→ `/scenes/crowdfunding`); the other four are a locked journey-map. The uniswap
synthesis node is gone. `app/scenes/page.tsx` is now a server-component redirect to
`/`; the scaffold-eth boilerplate is deleted; the four `/scenes` back-links
(`Deck.tsx` ×2, both auth stubs) point to `/`; Header nav unchanged (Home → `/`
already lands on the atlas). The `direct-/delegated-authorization` stub scenes are
orphaned routes (reachable by URL, no longer linked) — left in place per ADR-0006.

**Verified (2026-05-25):** `check-types` clean; `/` serves "atlas of crowdfunding"
and no longer the scaffold-eth boilerplate; `/scenes` → 307 to `/`;
`/scenes/crowdfunding` still 200. See ADR-0006 for trade-offs (incl. the rejected
Juicebox/ConstitutionDAO capstone). NOT yet checked in a real browser: the
reskinned atlas's visual polish + the cream→indigo continuity into the deck.

**Also landed (2026-05-25) — deck pared + made Socratic, code viewer on shiki.**
Two more chunks (`docs/adr/0007`, `docs/adr/0008`). The crowdfunding deck was pared to
an in-browser concepts workshop: events removed, and the `FundingRecipient` contract
removed (`fundingRecipient` is now a plain `address`, `completed` lives on `CrowdFund`,
single-file compile). Every YOUR TURN card became a **derive→reveal pair** — a derive
card showing theory + a code input + a reasoning (`explain`) input and NO code block
(the `!card.explain` gate), then a reveal `CodeCard` showing the line in the contract.
THINK rubrics moved from keywords to idea-phrases and `who-enforces` was rewritten so it
can't be answered by parroting. Separately, the deck's code viewer (`CodeBlock.tsx` +
`deck.css`) got the vocs code-focus behaviour (dim non-focused lines + pure-CSS
hover-reveal) and real syntax colours via **shiki ^4** with `github-dark-dimmed` (dark
`#22272e` panel), replacing the hand-rolled tokenizer. Deck is now 35 cards. New hard
rule (the *content framing* section below + `CLAUDE.md`): all learner-facing copy goes
through the sandgarden style guide. Full detail + gotchas in the build-log entry at the
bottom of this file.

**Where we are (as of 2026-05-22) — v0.4: the flashcard deck, taught on
crowdfunding.** The line-by-line marginalian era (balance-ledger) is retired.
Within this same pivot the deck was first built on token-vendor and then swapped to
crowdfunding: token-vendor assumed ERC-20/approval knowledge from earlier
challenges, so it leapt too far for a learner arriving cold. The deck now teaches
**crowdfunding** (an earlier, gentler SRE challenge) as a slide-by-slide **deck of
cards** — concept → code → write-a-line → question → interactive → ship.
Curriculum is re-authored in the sandgarden voice (see
`3. Resources/sandgarden-blog-writing-style.md` in the vault) with small,
explain-then-test steps and no assumed knowledge.

The decisions behind this pivot are recorded in three ADRs: `docs/adr/0003`
(deck supersedes the line-anchored teacher + two-tier naming), `docs/adr/0004`
(teach crowdfunding, not token-vendor), `docs/adr/0005` (the in-browser
co-authoring runtime). ADR-0002 (the marginalian) is superseded by 0003.

The deck (~28 cards) lives at `/scenes/crowdfunding`. Two-tier card names (plain
TIER-1 label + faint Sanskrit TIER-2: sutra/darshan/lekhana/prashna/prayoga/
prakashana/samhita) + a Devanagari watermark per type. Aesthetic: "Indigo Study
Deck" — bone cards on a deep indigo desk, saffron accent, teal for correct,
Instrument Serif + Hanken Grotesk + JetBrains Mono.

Key pieces:
- Content: `lib/deck/` — `types.ts` (card union), `crowdfunding-contracts.ts`
  (CrowdFund + FundingRecipient skeletons with `__SLOT__` tokens, canonical fills,
  `fillSlot`, `isComplete`, and `completedSources` which fills gaps with reference
  code so an in-progress contract still deploys), `crowdfunding-deck.ts` (the card
  array, authored from the challenge README + CONCEPTS.yaml).
- Compile: `lib/solc-worker.ts` is multi-file with an import callback (resolves the
  relative `./FundingRecipient.sol`; crowdfunding needs no OpenZeppelin, but
  `lib/oz-sources.ts` + `scripts/gen-oz-sources.mjs` remain for future OZ challenges).
  `lib/solc.ts` exposes `compileContracts()`.
- Chain: `app/scenes/crowdfunding/_components/useChainRuntime.ts` — tevm deploy of
  FundingRecipient→CrowdFund, contribute/execute/withdraw, and `advanceTime` (tevm
  has no evm_increaseTime; mining ~40 blocks via `tevmMine` clears the 30s deadline,
  ~1s/block). State changes go through `tevmContract` (native action), NOT viem
  `writeContract` — the latter deterministically reverts a call following deploys.
- Store: `services/store/deck-store.ts` — persisted progress + running source
  (wrong-answer rule: canonical threads forward, learner's kept only if graded
  equivalent). NOT persisted: the tevm deployment (chain resets on reload).
- Grading: `app/api/grade/route.ts` — `generateObject` → `{verdict, feedback}`.
- UI: `app/scenes/crowdfunding/_components/{Deck,cards,CodeBlock}.tsx` + `deck.css`.

**Verified (2026-05-22):** `check-types` clean; `/scenes` + `/scenes/crowdfunding`
return 200; a node repro of the shipped skeleton+canonical compiles and runs the
full chain flow (contribute → mine past deadline → execute forwards funds +
recipient.completed=true; failure path opens withdrawals and refunds).

**NOT yet verified in a browser:** the in-browser worker compile + tevm deploy /
contribute / execute / withdraw on the TRY IT / SHIP IT cards, and AI grading on
YOUR TURN / THINK (needs `OPENROUTER_API_KEY` in `packages/nextjs/.env.local`).

```bash
cd ~/Desktop/github/sre-learning-lab && yarn workspace @se-2/nextjs dev
```
Visit `/scenes/crowdfunding`, walk the deck, write the lines, then on the TRY IT
cards contribute, "let the deadline pass", execute, and withdraw.

**Known unverified, top of the list for next session:**
- The `pointAtLine` client-tool round-trip end-to-end against
  `deepseek/deepseek-v4-flash` (the new default). If tool adherence is shaky,
  override via `OPENROUTER_MODEL=anthropic/claude-sonnet-4.5` to isolate model
  vs code. The route uses `stepCountIs(8)` and a `sendAutomaticallyWhen` resume
  step on tool result; if the teacher stalls after pointing, that's where to look.
- The kickoff auto-greet (teacher speaks first on mount, lands on line 1).
- Pre-existing: the deployer-row overlap in the ledger panel — not from this
  build, not blocking.

**The pivot for the next session: close the learning loop.** Two concrete steps,
in order:

1. **Verify the marginalian at runtime.** Boot the app with a real
   `OPENROUTER_API_KEY`, open balance-ledger, confirm: (a) the auto-greet fires
   on mount and lands on line 1, (b) every assistant turn calls `pointAtLine`
   before speaking, (c) the gutter manicule + cursor + panel anchor stay in
   sync, (d) the resume-on-tool-result step works (no stalling). File any
   bugs as a short list — don't ship more layers on top until this is green.

2. **Atom-completion → graph unlock.** In
   `app/scenes/balance-ledger/page.tsx`, detect the canonical "you've got it"
   event: a successful transfer that decremented the sender and incremented
   the recipient (both already tracked). Mark via
   `localStorage.setItem("atom:balance-ledger", "completed")`. The atlas
   already reads node states from a topology spec — wire that spec to read
   `localStorage` on mount so the wax-seal `completed` state on the React Flow
   node reflects what the learner actually did. v0.1 unlock semantics:
   completing i. flips ii./iii. from `unlocked` to `inviting` (small visual
   nudge); iv./v. remain locked.

**What's intentionally still deferred** (do not build these next session):
- Voice / cursor-pointing on screen (clicky's signature features).
- Atoms iv. and v. — locked on the atlas; the form factor is proven, the
  content can wait.
- The Uniswap synthesis door.
- Cross-session memory (the marginalian resets each page-load — fine for v0.1).
- The Address-from-scaffold-eth refactor [[shiv]] flagged ("for another conversation").
- Dynamic question generation along the explain → justify → apply tier gradient —
  the v0.1 teacher walks the script in the system prompt; v0.2 generates.

**Files to read in this order if a fresh Claude (or fresh-Shiv) is picking this up cold:**
1. `CLAUDE.md` — the one-screen orientation pointer.
2. `CONTEXT.md` (this file) — the whole `## Glossary` section.
3. `docs/adr/0001-stay-on-se2-substrate.md` — why we did NOT fork remix-lite.
4. `docs/adr/0002-line-anchored-teacher.md` — why the friend became the marginalian
   and what changed in the interaction model.
5. `packages/nextjs/app/api/friend/route.ts` — the teacher's system prompt and
   the `pointAtLine` client-forwarded tool. The behaviour contract lives here.
6. `packages/nextjs/app/scenes/balance-ledger/page.tsx` — the reference scene
   with the manicule gutter, the marginalian panel, and the tool round-trip.
   Any new scene should match this aesthetic.
7. `packages/nextjs/app/scenes/page.tsx` — the React Flow atlas. The topology
   spec at the top of the file is the source of truth for what the graph shows.
8. The vault entries for [[carlos]] reactions and the Carlos × Jeffrey/RareSkills
   meet — at `2. Areas/sandgarden/updates/2026-05-07-learning-platform-v01-plan.md`
   and `2026-05-08-carlos-jeffrey-ai-education-meet.md` — provide the strategic
   framing the repo doesn't carry.

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
wants to see the code.

**Depth tiers per atom.** Each atom carries a depth tier from Jeffrey Scholz's
*explain → justify → apply* progression (Carlos × Jeffrey/RareSkills meet, 2026-05-08;
recap in vault at `2. Areas/sandgarden/updates/2026-05-08-carlos-jeffrey-ai-education-meet.md`):
*explain* = the learner can follow what's happening; *justify* = they can defend why it's done
this way; *apply* = they integrate it with other knowledge unprompted. Tiers give the
dependency edges semantic weight beyond "B requires A" — they encode cognitive depth, and
the atom graph's edges should eventually render as tier transitions (E→J, J→A) rather than
flat prereq arrows. The AI friend's question gradient (v0.2) follows the same tiers: ask
explain-tier checkpoints first, escalate only after the learner answers solidly.

Atoms (proposed; tiers in parens, refine as scenes land):

1. **Balance ledger** *(explain)* — the contract is a database of "who owns how much";
   transfers atomically update two rows.
2. **Direct authorization** (`transfer`) *(explain)* — you can move your own tokens.
3. **Delegated authorization** (`approve` + `transferFrom`) *(justify)* — grant a third
   party permission to pull from you, capped and revocable. The Uniswap-bridge atom; also
   the source of every infinite-approval exploit. Justify-tier because the learner has to
   argue *why* the dance exists at all rather than just transfer-to-an-intermediary.
4. **Supply management** (`mint` / `burn`) *(justify)* — where tokens come from / go to;
   why caps exist, why minting dilutes everyone, why burn isn't transfer-to-zero.
5. **Audit trail** (events) *(justify)* — `Transfer` / `Approval` logs are how block
   explorers and indexers reconstruct history; why have events at all rather than reading
   storage.

Synthesis nodes (Uniswap, lending) are *apply* tier — the learner integrates multiple
atoms unprompted to predict behaviour. Visible-but-locked on the atom graph in v0.1.

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

### AI behaviour (v0.1) — *the marginalian*, the line-anchored teacher

The original v0.1 plan was a *friend* — a summonable corner popup the learner tapped
on the shoulder. That shipped (ADR-0002) and got replaced. The current shape is a
**teacher** anchored to a specific line of the contract, with a pointing hand. See
`docs/adr/0002-line-anchored-teacher.md` for the full rationale; the short version
is below.

- **Persona: teacher, not chat partner.** Warm, exacting, concise, plain. The system
  prompt enforces one line of code (or one tight logical group) per turn, with
  exactly one question at the end, no walls of text, no hype, no em dashes. The
  understanding-bearing *why* and *what if* always stay as questions — never
  pre-empt a question with its answer.
- **Anchored to a line, not a corner.** The marginalian panel lives beside the
  editor and re-anchors to whichever line the learner's cursor is on. A manicule
  (☞) in the CodeMirror gutter tracks the same line natively, so the teacher's
  pointing finger and the learner's cursor are always the same thing.
- **Deixis via the `pointAtLine` tool.** Client-forwarded tool (no server `execute`).
  Every assistant turn calls `pointAtLine(line)` first to move the cursor + manicule,
  *then* speaks. The client runs the tool, replies with `addToolResult`, and
  `sendAutomaticallyWhen` on the server resumes the step so the teacher keeps
  talking. `stepCountIs(8)` bounds the loop. If the teacher stalls after pointing,
  the resume step is where to look.
- **First turn (auto-greet, unverified at runtime as of this writing).** On mount,
  the teacher calls `pointAtLine(1)`, greets in one sentence, explains line 1,
  and ends with one question that nudges the learner to predict line 2.
- **Atom-completion beat (still TODO).** The canonical "you've got it" condition
  (for balance-ledger: a successful transfer that decremented sender and
  incremented recipient) is detected client-side, persisted to `localStorage`,
  and the React Flow atlas reads it on mount to flip the node state. v0.1 ships
  with the *script* of the teacher's explain-tier walkthrough baked into the
  system prompt; v0.2 generates questions dynamically along the explain →
  justify → apply gradient (`### decomposition unit`).
- **Context the teacher sees.** Current atom id, the source string of the
  contract, the balances dict, the recent transfers array, and the
  `cursorLine: { number, text }` the learner is currently on. No cross-session
  memory in v0.1 — the marginalian resets each page-load.

**Model.** Default `deepseek/deepseek-v4-flash` (fast, cheap, 1M context — the
walkthrough leans on the model calling `pointAtLine` every turn, so tool adherence
matters more than reasoning depth). Override via `OPENROUTER_MODEL` (e.g.
`anthropic/claude-sonnet-4.5`) to isolate model vs code if behaviour is shaky.

Fully out of scope for v0.1: voice, cursor-pointing on the *visualization* side
of the scene (the table/arrows), always-watching mode, cross-session memory.

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

### content framing — always go through the sandgarden style guide

Before writing or editing ANY learner-facing copy in this repo — deck card concept
prose, YOUR TURN prompts, THINK questions, hints, reveal notes, recap text, microcopy,
error states — read the sandgarden writing style guide first:
`/Users/shivbhonde/Documents/shiv/3. Resources/sandgarden-blog-writing-style.md` (it
lives in Shiv's Obsidian vault, a separate tree from this repo). It is the canonical
voice reference. This is a hard rule, not a suggestion — also recorded in `CLAUDE.md`.

The bar (full content rules in ADR-0008):
- Senior-dev-to-junior voice. Lead with the situation, not the definition. No hype, no
  em dashes, no bold-label paragraphs, no punchline endings.
- **Derive, don't dictate.** A YOUR TURN prompt poses the problem and gives an analogy;
  it never states the answer or shows the code. Derive cards render NO code block (the
  `!card.explain` gate); the code appears only on the following reveal card. Placeholders
  leave the actual insight blank, e.g. `mapping(/* key? */ => /* value? */) public balances;`.
- **Questions must test.** A THINK or `explain` question that can be answered by
  parroting the previous card is a bug. Rubrics are full idea-phrases, not keywords.

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
- [x] **2026-05-07 (evening) — friend route handler shipped + repo pushed.** First chunk
      of the AI behavior layer landed at `packages/nextjs/app/api/friend/route.ts`. POST
      endpoint, accepts `{ messages, context }`, streams via the Vercel AI SDK
      (`streamText` + `toUIMessageStreamResponse`) against OpenRouter's OpenAI-compatible
      endpoint. Scene context (atomId, source, balances, recentTransfers) bakes into the
      system prompt so the friend has awareness without tool calls in v0.1. Default model
      `anthropic/claude-sonnet-4.5`, env override via `OPENROUTER_MODEL`. Two stack notes:
      1. `createOpenAI({ baseURL: "https://openrouter.ai/api/v1" })` for the wiring; had
         to force `.chat(modelId)` because AI SDK v6 defaults to the OpenAI Responses API
         and OpenRouter only speaks chat-completions.
      2. `convertToModelMessages` is async in v6 (returns `Promise<ModelMessage[]>`); the
         canonical Next.js App Router example in `node_modules/ai/docs/` shows the
         `await`. Type-check caught the regression — exactly why the bundled-docs
         discipline matters.
      Repo also pushed to GitHub as `technophile-04/sre-learning-lab` (public). Local
      folder renamed from `learning-with-ai-speedrunethereum/` to match. Three references
      chased down (this file's title + Resume here `cd` line, ADR-0001 working-dir note).
- [x] **2026-05-08 — Carlos × Jeffrey/RareSkills meet sharpens the framing.**
      Independent arrival at "AI's value-add in education is question curation, not
      explanation" validates the v0.1 Socratic bet. Folded Jeffrey's *explain → justify →
      apply* progression into `### decomposition unit`; the 5 atoms now carry depth tiers,
      and the AI friend's v0.1 hardcoded question is reframed as the *explain-tier
      checkpoint* for balance-ledger (v0.2 walks the gradient dynamically). No
      build-sequence change — week 2 still ships balance-ledger end-to-end. Strategic
      reads (90/10 AI-to-human split for v0.2+, June Uniswap V3 boot camp as a deployment
      surface, foundational-over-trending validation for the ERC-20 testbed pick) live
      in vault at `2. Areas/sandgarden/updates/2026-05-08-carlos-jeffrey-ai-education-meet.md`.
- [x] **2026-05-20 — React Flow atlas + the marginalian (line-anchored teacher).**
      Two pivots landed on `v03-atlas-reactflow`. **(1)** The atlas migrated from
      hand-coded SVG (manual bezier math, every node + edge positioned by hand)
      to **React Flow** (`@xyflow/react` ^12.10.2). Topology is now a small data
      spec at the top of `app/scenes/page.tsx` — nodes carry a `state`
      (`locked` / `unlocked` / `completed`), edges + arrowheads + visual state
      derive from that spec. Adding an atom is a data edit, not a layout
      session. The state field is the hook the atom-completion → graph-unlock
      loop will read from `localStorage`. **(2)** The corner inkwell popup got
      replaced by **the marginalian**, a line-anchored teacher (see ADR-0002):
      a CodeMirror gutter manicule (☞, `ManiculeMarker` + `teacherGutter`)
      tracks the cursor line natively, the marginalian panel re-anchors to the
      same line, and the AI persona pivoted from "friend you tap on the
      shoulder" to "teacher walking you line by line." The route handler at
      `app/api/friend/route.ts` now ships a `pointAtLine` client-forwarded
      tool — the teacher calls it every turn to move the learner's cursor;
      the client runs it, replies via `addToolResult`, and
      `sendAutomaticallyWhen` on the server resumes the step so the teacher
      keeps speaking. `stepCountIs(8)` bounds the loop. Default model flipped
      to `deepseek/deepseek-v4-flash` (cheap, fast, 1M context — the
      walkthrough leans on tool adherence over reasoning depth);
      `OPENROUTER_MODEL` override documented inline.
      **Known unverified at commit time (top of next session):** the
      `pointAtLine` tool round-trip end-to-end and the kickoff auto-greet
      both need runtime confirmation against `OPENROUTER_API_KEY`. The
      deployer-row overlap in the ledger panel is pre-existing, not from
      this build.
- [ ] **week 3 — verify + close the loop** — runtime-verify the marginalian
      (tool round-trip + auto-greet), wire atom-completion → `localStorage` →
      React Flow node state, vercel deploy.
- [x] **2026-05-25 — v0.5: atlas → home, vocs-style code focus, deck pared to a
      concepts workshop + Socratic derive→reveal.** Three chunks landed (ADRs 0006 / 0007 / 0008):
      **(1) Atlas is the home page** (ADR-0006). `app/scenes/page.tsx` reskinned cream →
      Indigo Study Deck and rebuilt from the ERC-20 tree (→ uniswap) into a 5-atom
      *crowdfunding* spine; promoted to `app/page.tsx`, boilerplate deleted, `/scenes` → `/`
      redirect, back-links + Header repointed, uniswap synthesis node dropped.
      **(2) Vocs-style code focus + real syntax colours.** The deck CodeBlock already dimmed
      non-focused lines; added the missing pure-CSS hover-reveal (`.vox:hover`, matching
      vocs). Then swapped the hand-rolled tokenizer for **shiki ^4** with `github-dark-dimmed`
      (the theme vocs ships) — colours now inline from the library, the seven `.cb-*` colour
      classes deleted, code panel went dark (`#22272e` slate inset in the bone card). A
      module-scope singleton highlighter keeps tokenizing synchronous after first load (no
      flash, no hydration mismatch). Write-cards now dim too (hover reveals full context).
      Gotcha: vocs' "blur" is actually `opacity: 0.3`, not `filter: blur`. Vault research at
      `3. Resources/vocs-code-focus-effect.md`.
      **(3) Deck pared + made Socratic** (ADR-0007, ADR-0008). Dropped events and the
      `FundingRecipient` contract — `fundingRecipient` is a plain `address`, `completed` lives
      on `CrowdFund`, single-file compile (gotcha: `.call{value:}` works on a plain `address`,
      not just `payable`). Reworked every YOUR TURN into a derive→reveal pair: the derive card
      shows theory + a code input + a reasoning input and NO code block (`!card.explain` gate);
      the reveal card shows the line in the contract. THINK rubrics tightened from keywords to
      idea-phrases; `who-enforces` rewritten so it can't be answered by parroting the prior
      card. Deck 27 → 35 cards. New standing rule (this file + `CLAUDE.md`): all learner-facing
      copy goes through the sandgarden style guide.
      **Verified:** `check-types` clean throughout; a headless `solc 0.8.x` compile of the
      fully-filled contract = 0 errors / 0 warnings; `/`, `/scenes` (→ 307 `/`), and
      `/scenes/crowdfunding` all serve 200. **Not yet browser-verified:** the reskinned atlas
      visuals, the in-browser compile/deploy of the simplified contract, and AI grading on the
      new derive `explain` boxes + sharpened THINK cards (needs `OPENROUTER_API_KEY`).
      Also fixed pre-existing EOF corruption (stray `</content></invoke>` tags).
      **Runtime follow-up:** browser TRY IT reverted with `Source "FundingRecipient.sol"
      not found` — `deck-store` persists `sources` in localStorage, so open clients kept
      the old skeleton (with the dead import). Added `version: 1` + a `migrate` that
      re-seeds `sources` from the current skeleton; bump the version on any future
      skeleton change. (See ADR-0007 gotchas.)
- [x] **2026-05-26 — v0.6: non-linear lesson index + always-available code peek.**
      Two additions from the carlos review on 2026-05-25 (ADR-0009, ADR-0010), both in
      `app/scenes/crowdfunding/_components/`. Three new things touched the codebase:
      **(1) `JourneyPanel.tsx`** — a left-margin lesson index, **collapsible** (chevron
      collapses; a `☰ the path · NN / 35` button expands; pref persists to `localStorage`
      under `deck:panel-collapsed`). Groups the 35 cards into 9 chapters (CONCEPT / SHIP IT
      / RECAP open chapters — TRY IT folds under its parent concept's hands-on beat, so two
      adjacent TRY ITs don't fragment the index). Grouping logic lives in the panel, no
      `chapterId` field on cards. The chapter heading IS the starter card's clickable row
      (Roman numeral + serif italic title) — supporting cards (CODE / YOUR TURN / THINK /
      TRY IT) indent below with a faint vertical thread. Supporting rows are
      **Devanagari glyph + title only** — no English tier-1 label, the sanskrit is the
      sole type chip (the philosophy from `sre-learning-lab-naming-philosophy.md` in the
      vault applied in earnest). Hover surfaces the English tier-1 as a `title` tooltip.
      Current row: saffron edge + the same bobbing `☞` manicule the code gutter uses. Verdict
      glyphs after the title (`✓` teal, `◐` saffron-deep, `◌` faint). Click → `goTo()`.
      Below 1024px folds into a top-down sheet opened by the same `☰ the path` button. **(2) `CodePeekSheet.tsx`** — a right-side sheet (`width: min(560px,
      100vw)`, 420ms slide, blurred backdrop). Renders `sources['CrowdFund.sol']` through
      the existing `CodeBlock`, so the shiki render, vox dim+hover-reveal, and manicule
      all carry into the peek with zero new visual language. Anchors-for-current-card:
      CODE uses `fromAnchor`/`toAnchor` directly; YOUR TURN uses the slot token while
      unfilled and falls back to the first 20 chars of the canonical line head after the
      slot has been filled (slot tokens disappear after `fillSlot`); CONCEPT / THINK /
      RECAP open the sheet scrolled to the top. On open: focus moves to the close button
      and `requestAnimationFrame` scrolls the focused range into view with `block:
      "center"`. `Esc` and backdrop click close. Body scroll is locked while open. UI
      open-state is local component state in `Deck.tsx`, NOT in `deck-store` — UI state
      doesn't belong in the persisted learning store. **(3) `Deck.tsx` shell rewrite +
      `deck.css` additions.** The center column is now wrapped in a `.deck-shell` flex
      container with the panel on the left and the deck centered in the remaining width
      (so the deck doesn't shift sideways when the panel mounts). New top-bar button
      `peek code` with the `c` kbd hint (sits between `reset` and `↩ atlas`). Keyboard
      shortcut: `c` toggles the peek, guarded against `<input>` / `<textarea>` / `.cm-content`
      focus so it doesn't fire while typing. **Aesthetic anchors:** all new chrome reuses
      Indigo Study Deck variables (`--saffron`, `--ink-faint`, `--card`, etc.), the
      existing `handBob` keyframe, the same `cubic-bezier(0.22, 1, 0.36, 1)` motion
      curve, and the `cm-focus-rule` highlight style. No new design primitives.
      **Verified:** `check-types` clean; `/scenes/crowdfunding` compiles + serves 200;
      no new compile errors. **NOT yet browser-verified:** panel's visual polish,
      chapter grouping legibility, the peek's slot-anchor fallback after the learner
      has filled a slot, mobile sheet ergonomics below 1024px.
      **Deferred per ADR-0011-to-come:** the skill-level interview — a pre-deck
      conversation that lets the learner skip atoms they already know. Bigger lift
      (new surface, structured-output model call, prerequisite graph between cards
      that doesn't exist today, contrast scaffolding at the entry card). Vault plan:
      `2. Areas/sandgarden/updates/2026-05-26-learning-platform-v06-plan.md`.