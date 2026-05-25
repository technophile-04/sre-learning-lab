// Persisted learning state for a deck. What survives a reload: how far the
// learner got, what they answered, and the contract source they've co-authored
// so far (the skeleton with YOUR TURN slots filled in).
//
// What does NOT live here: the tevm deployment (addresses, the in-browser
// chain). That resets every reload, so it stays in the deck page's runtime, not
// persisted state — see useChainRuntime in the deck page.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fillSlot } from "~~/lib/deck/crowdfunding-contracts";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { SolFile } from "~~/lib/deck/types";

export type Verdict = "pass" | "partial" | "miss";

export type CardProgress = {
  /** the learner's submitted text — a Solidity line (YOUR TURN) or prose (THINK) */
  answer?: string;
  verdict?: Verdict;
  feedback?: string;
};

type DeckState = {
  deckId: string;
  cardIndex: number;
  /** progress keyed by card id */
  progress: Record<string, CardProgress>;
  /** running source per file — skeleton with completed slots filled */
  sources: Record<SolFile, string>;

  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;

  /** record a THINK answer + grade */
  recordThink: (cardId: string, answer: string, verdict: Verdict, feedback: string) => void;

  /** record a YOUR TURN answer, grade it, and thread code forward. If the
   *  learner's line is judged equivalent we keep theirs; otherwise the canonical
   *  line is spliced so later cards still compile. */
  completeYourTurn: (args: {
    cardId: string;
    file: SolFile;
    slot: string;
    learnerLine: string;
    canonical: string;
    verdict: Verdict;
    feedback: string;
  }) => void;

  resetDeck: () => void;
};

const CARD_COUNT = CROWDFUNDING_DECK.cards.length;

const initialSources = (): Record<SolFile, string> => ({ ...CROWDFUNDING_DECK.skeleton });

export const useDeckStore = create<DeckState>()(
  persist(
    set => ({
      deckId: CROWDFUNDING_DECK.id,
      cardIndex: 0,
      progress: {},
      sources: initialSources(),

      goTo: index => set(() => ({ cardIndex: Math.max(0, Math.min(index, CARD_COUNT - 1)) })),
      next: () => set(s => ({ cardIndex: Math.min(s.cardIndex + 1, CARD_COUNT - 1) })),
      prev: () => set(s => ({ cardIndex: Math.max(s.cardIndex - 1, 0) })),

      recordThink: (cardId, answer, verdict, feedback) =>
        set(s => ({ progress: { ...s.progress, [cardId]: { answer, verdict, feedback } } })),

      completeYourTurn: ({ cardId, file, slot, learnerLine, canonical, verdict, feedback }) =>
        set(s => {
          const lineToThread = verdict === "pass" ? learnerLine : canonical;
          const nextSource = fillSlot(s.sources[file], slot, lineToThread);
          return {
            sources: { ...s.sources, [file]: nextSource },
            progress: { ...s.progress, [cardId]: { answer: learnerLine, verdict, feedback } },
          };
        }),

      resetDeck: () => set(() => ({ cardIndex: 0, progress: {}, sources: initialSources() })),
    }),
    {
      name: `deck:${CROWDFUNDING_DECK.id}`,
      // Bump whenever the contract skeleton changes shape. v0.5 removed events +
      // the FundingRecipient contract (and its import); any `sources` persisted under
      // an older version still carries the dead import and fails to compile, so we
      // discard stale state and re-seed from the current skeleton instead of trusting it.
      version: 1,
      migrate: () => ({ cardIndex: 0, progress: {}, sources: initialSources() }) as DeckState,
      // guard SSR — the store module is evaluated on the server too
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : undefined!)),
      partialize: state => ({
        cardIndex: state.cardIndex,
        progress: state.progress,
        sources: state.sources,
      }),
    },
  ),
);
