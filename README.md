# SRE Learning Lab

A testbed for an AI-assisted way to learn Solidity. Instead of a chatbot bolted onto a tutorial, it teaches one concept (crowdfunding) as a deck of cards you walk through: read the idea, write the line yourself, get it graded, then run your own contract against a chain that lives in the browser. It's a scaffold-eth-2 fork, but almost everything that matters sits in `packages/nextjs`.

You're getting this to take it for a spin. The fast path to a running deck is right below. After that: the OpenRouter setup (that's what powers the grading), the routes worth visiting, and how the thing is put together.

## Quickstart

You need Node (>= v20.18.3), Yarn, and Git. That's it. There's no local chain to run and nothing to deploy, because the contract compiles and runs inside the browser.

```bash
git clone https://github.com/technophile-04/sre-learning-lab.git
cd sre-learning-lab
yarn install

# the grader needs an OpenRouter key (the next section says where to get one)
cp packages/nextjs/.env.example packages/nextjs/.env.local
# then open packages/nextjs/.env.local and set OPENROUTER_API_KEY=...

yarn start
```

`yarn start` boots the Next dev server. Open http://localhost:3000 and you land on the atlas. Click the one unlocked atom to drop into the deck.

Skip the key and the deck still loads, you can read and navigate every card, but the ones that ask you to write a line or answer a question will say "grader unreachable" when you submit, because there's nothing on the other end to grade against.

## The OpenRouter key

The cards where you write Solidity or answer in your own words are graded by a model, not by a string match. That call goes through OpenRouter, so you need a key.

Getting one takes a minute:

1. Sign up at https://openrouter.ai
2. Go to https://openrouter.ai/keys and create a key
3. Add a few dollars of credit. The default model is cheap, grading one card costs a fraction of a cent
4. Paste it into `packages/nextjs/.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-...
```

The key is server-side only. It's read in `app/api/grade/route.ts` and never reaches the browser, which is why it has no `NEXT_PUBLIC_` prefix.

By default the grader runs `deepseek/deepseek-v4-flash`, which is cheap and good enough for this. If you want to compare against a stronger grader, add one more line and restart:

```bash
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

Restart `yarn start` after any env change. Next only reads these at boot.

## The routes

Start at `/` and click through. The two that matter for a walkthrough are the home atlas and the crowdfunding deck.

- `/` is the atlas. It breaks crowdfunding into five atoms: track contributions, take money in, send ETH safely, the deadline/threshold state machine, and the trustless-funding root that ties them together. Only the first atom is unlocked right now, the other four are the journey map.
- `/scenes/crowdfunding` is the deck itself, 35 cards. This is the actual experience: concept, then write-the-line, then a question, then run it, then ship it.
- `/scenes` redirects to `/`. It used to hold the atlas before the atlas moved to the home page.
- `/lab` is a bare sandbox: type Solidity, it compiles in a worker and deploys to the in-browser chain. No styling, no AI. It exists to prove the runtime round-trips end to end.
- `/debug` and `/blockexplorer` are stock scaffold-eth screens, left in place.
- `/scenes/direct-authorization` and `/scenes/delegated-authorization` are leftover ERC-20 stubs from before the crowdfunding pivot. Reachable by URL, not linked from anywhere. You can ignore them.

## How it fits together

The one decision that explains the rest: the learner's contract compiles and runs entirely in the browser. solc runs in a web worker, the chain is tevm (an in-memory EVM), and both reset on reload. So there's no backend to stand up, no testnet, no deploy step. The only server-side code in the whole experience is the grader, and the only secret it needs is the OpenRouter key. That's why the quickstart is this short.

Everything lives in `packages/nextjs`:

- `lib/deck/` is the curriculum. `crowdfunding-deck.ts` is the card array, the actual lesson, authored in the sandgarden voice. `crowdfunding-contracts.ts` is the `CrowdFund.sol` skeleton with `__SLOT__` tokens where the learner writes, the canonical fill for each slot, and helpers (`fillSlot`, `isComplete`, `completedSources`) that thread the learner's code into the contract as they progress. `types.ts` is the card union (concept, code, your-turn, think, try-it, ship-it, recap).
- `lib/solc.ts` and `lib/solc-worker.ts` compile Solidity in the browser.
- `app/scenes/crowdfunding/_components/useChainRuntime.ts` deploys to tevm and drives contribute / execute / withdraw, plus an `advanceTime` that mines past the deadline.
- `services/store/deck-store.ts` keeps progress and the running source in localStorage. If you change the contract skeleton, bump its `version` so old saved source doesn't break the compile.
- `app/api/grade/route.ts` is the grader. It takes the learner's answer plus the reference, asks the model for a verdict and a line or two of feedback, and returns `{ verdict, feedback }`.
- `app/scenes/crowdfunding/_components/{Deck,cards,CodeBlock,CodeInput}.tsx` and `deck.css` are the UI. `CodeBlock` is the read-only viewer (Shiki, dimmed dark panel, the vocs-style focus effect), `CodeInput` is the editable box (CodeMirror with the Solidity grammar).

The why behind each choice is written up as ADRs in `docs/adr/`, and `CONTEXT.md` is the running source of truth. Start at its "Resume here" section if you want to pick up where the build left off.

## What a run feels like

Land on the atlas, click the unlocked atom, and you're in the deck. A concept card explains one idea, then the next card hands you a blank with that theory and asks you to write the line yourself. You write it, submit, and the grader tells you whether it holds up. Your line gets threaded into the contract either way, so a wrong answer doesn't strand you. A few cards in, the TRY IT cards deploy the contract you've been building and let you contribute, let the deadline pass, execute, and withdraw, all against the in-browser chain. SHIP IT deploys the finished thing and shows you the addresses.

## Built on scaffold-eth-2

This is a fork of [scaffold-eth-2](https://github.com/scaffold-eth/scaffold-eth-2), so the Hardhat workspace, the debug and block-explorer pages, and the rest of the SE-2 tooling are all still here. None of it is needed to run the deck, but if you want to add a real on-chain challenge later, the substrate is ready. SE-2 docs are at https://docs.scaffoldeth.io.
