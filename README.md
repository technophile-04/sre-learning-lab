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

One bet shapes the whole thing: the learner's contract compiles and runs in the browser. solc runs in a web worker, the chain is tevm (an in-memory EVM), and both reset on reload. So the only server-side code is the grader, and the only secret it needs is the OpenRouter key.

Everything we built lives in `packages/nextjs`. If you open just two files: `lib/deck/crowdfunding-deck.ts` is the entire lesson (every prompt and card), and `_components/cards.tsx` is what renders each card.

```
packages/nextjs/
├── app/
│   ├── page.tsx                      # home: the atlas (crowdfunding split into 5 atoms)
│   ├── lab/page.tsx                  # sandbox: type Solidity, compile, deploy. proves the runtime
│   ├── scenes/crowdfunding/          # the deck (the actual experience)
│   │   ├── page.tsx                  # route entry, mounts <Deck/>
│   │   ├── deck.css                  # all deck styling (bone cards, dark code panels, palette)
│   │   └── _components/
│   │       ├── Deck.tsx              # deck shell: paging, progress bar, back/next
│   │       ├── cards.tsx             # the 7 card faces + grading hook  <- the card components
│   │       ├── CodeBlock.tsx         # read-only code viewer (Shiki, dark panel, focus effect)
│   │       ├── CodeInput.tsx         # editable code box (CodeMirror + Solidity, the ✎ editor tab)
│   │       ├── useChainRuntime.ts    # in-browser chain (tevm): deploy, contribute/execute/withdraw
│   │       ├── highlighter.ts        # Shiki singleton (github-dark-dimmed)
│   │       ├── card-meta.ts          # per-card-type metadata (Devanagari watermark, naming)
│   │       └── fonts.ts              # Instrument Serif / Hanken Grotesk / JetBrains Mono
│   └── api/grade/route.ts            # the grader (OpenRouter): answer + reference -> {verdict, feedback}
├── lib/
│   ├── deck/                         # the lesson + the contract it builds
│   │   ├── crowdfunding-deck.ts      # THE LESSON: all 35 cards, every prompt lives here
│   │   ├── crowdfunding-contracts.ts # CrowdFund.sol skeleton with __SLOT__ blanks + canonical fills
│   │   └── types.ts                  # the card union (fields per card type)
│   ├── solc.ts                       # compile API the UI calls
│   ├── solc-worker.ts                # runs solc off the main thread (web worker)
│   └── oz-sources.ts                 # OpenZeppelin sources, kept for future challenges
└── services/store/
    └── deck-store.ts                 # persisted progress + running contract source (zustand)
```

The reasoning behind each choice is in `docs/adr/`, and `CONTEXT.md` is the running source of truth.

## What a run feels like

Land on the atlas, click the unlocked atom, and you're in the deck. A concept card explains one idea, then the next card hands you a blank with that theory and asks you to write the line yourself. You write it, submit, and the grader tells you whether it holds up. Your line gets threaded into the contract either way, so a wrong answer doesn't strand you. A few cards in, the TRY IT cards deploy the contract you've been building and let you contribute, let the deadline pass, execute, and withdraw, all against the in-browser chain. SHIP IT deploys the finished thing and shows you the addresses.

## Built on scaffold-eth-2

This is a fork of [scaffold-eth-2](https://github.com/scaffold-eth/scaffold-eth-2), so the Hardhat workspace, the debug and block-explorer pages, and the rest of the SE-2 tooling are all still here. None of it is needed to run the deck, but if you want to add a real on-chain challenge later, the substrate is ready. SE-2 docs are at https://docs.scaffoldeth.io.
