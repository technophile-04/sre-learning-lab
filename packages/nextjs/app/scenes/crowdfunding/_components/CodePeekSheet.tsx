"use client";

// Right-side sheet that shows the current state of the contract the learner has
// been co-authoring. Reuses CodeBlock directly so the same shiki render, the
// same vox dim+hover-reveal, and the same ☞ manicule the deck uses on its
// inline code panels all carry into the peek — no new interaction language.
// If the current card has an anchor into the source (CODE: from/to, YOUR TURN:
// the slot token), the focused range is highlighted and scrolled into view on
// open. Anchorless cards (CONCEPT / THINK / RECAP) open scrolled to the top.
import { useEffect, useMemo, useRef } from "react";
import { CodeBlock } from "./CodeBlock";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { Card, YourTurnCard } from "~~/lib/deck/types";
import { useDeckStore } from "~~/services/store/deck-store";

function anchorsForCard(card: Card | null, source: string): { fromAnchor?: string; toAnchor?: string } {
  if (!card) return {};
  if (card.type === "code") return { fromAnchor: card.fromAnchor, toAnchor: card.toAnchor };
  if (card.type === "your-turn") {
    // While the slot is unfilled, the slot token still sits in the source — find that.
    // Once filled, the token's gone; anchor by the canonical line's leading text so
    // the peek still lands on the line the learner just wrote.
    const lines = source.split("\n");
    if (lines.some(l => l.includes(card.slot))) return { fromAnchor: card.slot };
    const canonicalHead = card.canonical.trim().split("\n")[0]?.trim() ?? "";
    if (canonicalHead) {
      // Use the first 20 chars (sans leading whitespace) as the anchor — generous
      // enough to be unique, tight enough to survive small reformatting.
      const probe = canonicalHead.slice(0, Math.min(20, canonicalHead.length));
      if (lines.some(l => l.includes(probe))) return { fromAnchor: probe };
    }
    return {};
  }
  return {};
}

function slotProgressOf(source: string): { filled: number; total: number } {
  const yourTurnCards = CROWDFUNDING_DECK.cards.filter((c): c is YourTurnCard => c.type === "your-turn");
  const total = yourTurnCards.length;
  const lines = source.split("\n");
  let filled = 0;
  for (const c of yourTurnCards) {
    const unfilled = lines.some(l => l.includes(c.slot));
    if (!unfilled) filled += 1;
  }
  return { filled, total };
}

export function CodePeekSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cardIndex = useDeckStore(s => s.cardIndex);
  const sources = useDeckStore(s => s.sources);

  const card = CROWDFUNDING_DECK.cards[cardIndex] ?? null;
  const source = sources["CrowdFund.sol"];
  const anchors = useMemo(() => anchorsForCard(card, source), [card, source]);
  const { filled, total } = useMemo(() => slotProgressOf(source), [source]);

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // on open, focus the close button and scroll the focus rule into view (if any)
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const id = requestAnimationFrame(() => {
      const rule = sheetRef.current?.querySelector(".cm-focus-rule");
      if (rule) rule.scrollIntoView({ block: "center", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [open, anchors.fromAnchor, anchors.toAnchor]);

  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className={`peek-backdrop ${open ? "peek-backdrop-open" : ""}`} onClick={onClose} aria-hidden />
      <aside
        ref={sheetRef}
        className={`peek-sheet ${open ? "peek-sheet-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="current state of CrowdFund.sol"
        aria-hidden={!open}
      >
        <header className="peek-head">
          <div className="peek-file">
            <span className="peek-file-icon" aria-hidden>
              ❑
            </span>
            <span className="deck-mono peek-file-name">CrowdFund.sol</span>
          </div>
          <div className="deck-mono peek-status" aria-label={`${filled} of ${total} lines threaded`}>
            <span className="peek-status-num">{filled}</span>
            <span className="peek-status-sep">/</span>
            <span className="peek-status-total">{total}</span>
            <span className="peek-status-label">lines threaded</span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="peek-close deck-mono"
            onClick={onClose}
            aria-label="close (esc)"
          >
            × close
          </button>
        </header>

        <div className="peek-body">
          <CodeBlock source={source} fromAnchor={anchors.fromAnchor} toAnchor={anchors.toAnchor} dim hand />
        </div>
      </aside>
    </>
  );
}
