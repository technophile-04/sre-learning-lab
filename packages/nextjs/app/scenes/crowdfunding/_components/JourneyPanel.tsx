"use client";

// The lesson index — left rail on desktop, top sheet on mobile. Cards group
// into chapters: a CONCEPT / SHIP IT / RECAP card opens a chapter (its title
// becomes the chapter heading); everything else (CODE / YOUR TURN / THINK /
// TRY IT) belongs to the chapter that opened most recently. The chapter
// heading IS the starter card's clickable row — Roman numeral on the left,
// serif italic title — so there's no redundant title duplication and the
// learner can jump to the opening concept by clicking the heading itself.
// Supporting cards render compactly indented underneath.
//
// Current row carries the saffron edge marker and the same ☞ manicule the code
// gutter uses, so "where am I" reads the same way in the index as it does
// inside the code. Verdict glyphs (✓ pass, ◐ partial, ◌ miss) sit at the end
// of each row — quiet status, not a reward.
import { DEVANAGARI } from "./card-meta";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { Card } from "~~/lib/deck/types";
import { useDeckStore } from "~~/services/store/deck-store";

type ChapterEntry = { card: Card; index: number };
type Chapter = { starter: ChapterEntry; rest: ChapterEntry[] };

// Only the three big movements open chapters. TRY IT used to open one — it
// doesn't, because two adjacent TRY ITs would create two one-card chapters,
// which fragments the index. A TRY IT belongs to the preceding concept's
// hands-on beat.
const CHAPTER_OPENERS: ReadonlySet<Card["type"]> = new Set(["concept", "ship-it", "recap"]);

function groupIntoChapters(cards: readonly Card[]): Chapter[] {
  const out: Chapter[] = [];
  cards.forEach((card, index) => {
    const entry: ChapterEntry = { card, index };
    if (out.length === 0 || CHAPTER_OPENERS.has(card.type)) {
      out.push({ starter: entry, rest: [] });
    } else {
      out[out.length - 1]!.rest.push(entry);
    }
  });
  return out;
}

const VERDICT_GLYPH = { pass: "✓", partial: "◐", miss: "◌" } as const;
const VERDICT_CLS = { pass: "jp-pass", partial: "jp-partial", miss: "jp-miss" } as const;

function romanize(n: number): string {
  const map: [number, string][] = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let r = n;
  for (const [v, s] of map) {
    while (r >= v) {
      out += s;
      r -= v;
    }
  }
  return out;
}

export function JourneyPanel({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onCollapse,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const cardIndex = useDeckStore(s => s.cardIndex);
  const goTo = useDeckStore(s => s.goTo);
  const progress = useDeckStore(s => s.progress);

  const cards = CROWDFUNDING_DECK.cards;
  const chapters = groupIntoChapters(cards);

  const handleJump = (i: number) => {
    goTo(i);
    onCloseMobile();
  };

  return (
    <>
      <div className={`jp-backdrop ${mobileOpen ? "jp-backdrop-open" : ""}`} onClick={onCloseMobile} aria-hidden />
      <aside
        className={`jp ${mobileOpen ? "jp-mobile-open" : ""} ${collapsed ? "jp-collapsed" : ""}`}
        aria-label="lesson index"
      >
        <div className="jp-head">
          <div className="jp-head-title">
            <div className="deck-display jp-title">the path</div>
            <div className="deck-mono jp-subtitle">{CROWDFUNDING_DECK.challenge}</div>
          </div>
          <div className="jp-head-right">
            <div className="deck-mono jp-count" aria-label={`card ${cardIndex + 1} of ${cards.length}`}>
              <span className="jp-count-now">{String(cardIndex + 1).padStart(2, "0")}</span>
              <span className="jp-count-sep">/</span>
              <span className="jp-count-total">{String(cards.length).padStart(2, "0")}</span>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="jp-collapse"
              aria-label="collapse lesson index"
              title="collapse"
            >
              <span aria-hidden>‹</span>
            </button>
          </div>
        </div>

        <nav className="jp-nav">
          {chapters.map((ch, ci) => {
            const starterIsCurrent = ch.starter.index === cardIndex;
            const starterVerdict = progress[ch.starter.card.id]?.verdict;
            return (
              <section key={ch.starter.index} className="jp-chapter" style={{ animationDelay: `${ci * 60}ms` }}>
                {/* chapter heading = the chapter starter card, clickable */}
                <button
                  type="button"
                  onClick={() => handleJump(ch.starter.index)}
                  className={`jp-chapter-head ${starterIsCurrent ? "jp-row-current" : ""}`}
                  aria-current={starterIsCurrent ? "step" : undefined}
                >
                  <span className="jp-marker" aria-hidden />
                  {starterIsCurrent && (
                    <span className="jp-hand" aria-hidden>
                      <span>☞</span>
                    </span>
                  )}
                  <span className="deck-mono jp-chapter-num">{romanize(ci + 1)}</span>
                  <h3 className="deck-display jp-chapter-title">{ch.starter.card.title}</h3>
                  {starterVerdict && (
                    <span
                      className={`jp-verdict ${VERDICT_CLS[starterVerdict]}`}
                      aria-label={`graded ${starterVerdict}`}
                    >
                      {VERDICT_GLYPH[starterVerdict]}
                    </span>
                  )}
                </button>

                {ch.rest.length > 0 && (
                  <ul className="jp-rows">
                    {ch.rest.map(({ card, index }) => {
                      const isCurrent = index === cardIndex;
                      const v = progress[card.id]?.verdict;
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            onClick={() => handleJump(index)}
                            className={`jp-row ${isCurrent ? "jp-row-current" : ""}`}
                            aria-current={isCurrent ? "step" : undefined}
                            aria-label={`${card.tier1}: ${card.title}`}
                          >
                            <span className="jp-marker" aria-hidden />
                            {isCurrent && (
                              <span className="jp-hand" aria-hidden>
                                <span>☞</span>
                              </span>
                            )}
                            <span className="jp-glyph" title={card.tier1} aria-hidden>
                              {DEVANAGARI[card.type]}
                            </span>
                            <span className="jp-name">{card.title}</span>
                            {v && (
                              <span className={`jp-verdict ${VERDICT_CLS[v]}`} aria-label={`graded ${v}`}>
                                {VERDICT_GLYPH[v]}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
