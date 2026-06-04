"use client";

// v2 lesson index. Same chapter grouping and current-row vocabulary as the
// original, with two changes the screenshots pushed for (Fireship's typed rows):
//   1. every row carries a clear type ICON instead of a Sanskrit glyph, so you
//      can see at a glance whether a step is read / write / run / think;
//   2. gotcha steps get a warning icon + amber tint so the Ethereum traps stand
//      out from ordinary concept cards.
// The header is plainer too — the deck title, not a loud uppercase challenge tag
// repeated from the top bar.
import Link from "next/link";
import { cardMeta, isGotcha, typeMeta } from "./card-icons";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { Card } from "~~/lib/deck/types";
import { useDeckStore } from "~~/services/store/deck-store";

type ChapterEntry = { card: Card; index: number };
type Chapter = { starter: ChapterEntry; rest: ChapterEntry[] };

const CHAPTER_OPENERS: ReadonlySet<Card["type"]> = new Set(["concept", "ship-it", "recap"]);

function groupIntoChapters(cards: readonly Card[]): Chapter[] {
  const out: Chapter[] = [];
  cards.forEach((card, index) => {
    const entry: ChapterEntry = { card, index };
    if (out.length === 0 || CHAPTER_OPENERS.has(card.type)) out.push({ starter: entry, rest: [] });
    else out[out.length - 1]!.rest.push(entry);
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

export function JourneyPanelV2({
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
  const read = useDeckStore(s => s.read);
  const resetDeck = useDeckStore(s => s.resetDeck);

  const handleReset = () => {
    if (window.confirm("Reset everything? This clears your progress, grades, and the code you've written so far.")) {
      resetDeck();
    }
  };

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
            <div className="deck-display jp-title">Crowdfunding</div>
            <div className="deck-mono jp-subtitle">build it, piece by piece</div>
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
            const starterRead = read?.[ch.starter.card.id];
            const starterGotcha = isGotcha(ch.starter.card);
            const StarterIcon = typeMeta(ch.starter.card).Icon;
            // the chapter that holds the current card is the "active section" — its
            // head glows softly even when a sub-row is the current task
            const chapterActive = starterIsCurrent || ch.rest.some(r => r.index === cardIndex);
            return (
              <section
                key={ch.starter.index}
                className={`jp-chapter ${chapterActive && !starterIsCurrent ? "jp-chapter-active" : ""}`}
                style={{ animationDelay: `${ci * 60}ms` }}
              >
                <button
                  type="button"
                  onClick={() => handleJump(ch.starter.index)}
                  className={`jp-chapter-head ${starterIsCurrent ? "jp-row-current" : ""} ${starterGotcha ? "jp-gotcha" : ""}`}
                  aria-current={starterIsCurrent ? "step" : undefined}
                >
                  <span className="jp-marker" aria-hidden />
                  <span className="deck-mono jp-chapter-num">{romanize(ci + 1)}</span>
                  <h3 className="deck-display jp-chapter-title">
                    <span className="jp-icon" aria-hidden>
                      <StarterIcon size={17} />
                    </span>
                    {ch.starter.card.title}
                    {starterGotcha && <span className="jp-gotcha-tag deck-mono">gotcha</span>}
                  </h3>
                  {starterVerdict ? (
                    <span
                      className={`jp-verdict ${VERDICT_CLS[starterVerdict]}`}
                      aria-label={`graded ${starterVerdict}`}
                    >
                      {VERDICT_GLYPH[starterVerdict]}
                    </span>
                  ) : starterRead ? (
                    <span className="jp-verdict jp-read" aria-label="read">
                      ✓
                    </span>
                  ) : null}
                </button>

                {ch.rest.length > 0 && (
                  <ul className="jp-rows">
                    {ch.rest.map(({ card, index }) => {
                      const isCurrent = index === cardIndex;
                      const v = progress[card.id]?.verdict;
                      const wasRead = read?.[card.id];
                      const gotcha = isGotcha(card);
                      const meta = cardMeta(card);
                      const Icon = meta.Icon;
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            onClick={() => handleJump(index)}
                            className={`jp-row ${isCurrent ? "jp-row-current" : ""} ${gotcha ? "jp-gotcha" : ""}`}
                            aria-current={isCurrent ? "step" : undefined}
                            aria-label={`${meta.label}: ${card.title}`}
                          >
                            <span className="jp-marker" aria-hidden />
                            <span className="jp-icon" title={meta.label} aria-hidden>
                              <Icon size={18} />
                            </span>
                            <span className="jp-name">{card.title}</span>
                            {v ? (
                              <span className={`jp-verdict ${VERDICT_CLS[v]}`} aria-label={`graded ${v}`}>
                                {VERDICT_GLYPH[v]}
                              </span>
                            ) : wasRead ? (
                              <span className="jp-verdict jp-read" aria-label="read">
                                ✓
                              </span>
                            ) : null}
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

        <div className="jp-foot">
          <button type="button" className="jp-foot-btn jp-foot-reset deck-mono" onClick={handleReset}>
            reset
          </button>
          <Link href="/scenes/crowdfunding" className="jp-foot-btn deck-mono">
            ↩ original
          </Link>
        </div>
      </aside>
    </>
  );
}
