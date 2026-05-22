"use client";

// The deck shell: the active card on top of ghost edges that hint at the
// remaining depth, a progress rail, and prev/next. Navigation is non-blocking —
// the learner can move freely; YOUR TURN / THINK cards grade but never gate.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CardRenderer } from "./cards";
import { useChainRuntime } from "./useChainRuntime";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import { useDeckStore } from "~~/services/store/deck-store";

const CARDS = CROWDFUNDING_DECK.cards;

export function Deck() {
  const chain = useChainRuntime();
  const cardIndex = useDeckStore(s => s.cardIndex);
  const next = useDeckStore(s => s.next);
  const prev = useDeckStore(s => s.prev);
  const resetDeck = useDeckStore(s => s.resetDeck);

  // avoid SSR/persist hydration mismatch — render the deck only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const card = CARDS[cardIndex];
  const remaining = CARDS.length - 1 - cardIndex;
  const ghostCount = Math.min(3, remaining);
  const progress = ((cardIndex + 1) / CARDS.length) * 100;
  const isLast = cardIndex === CARDS.length - 1;

  return (
    <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingTop: 36,
          paddingBottom: 26,
        }}
      >
        <div>
          <div className="deck-display" style={{ fontSize: 24, color: "var(--card)" }}>
            {CROWDFUNDING_DECK.title}
          </div>
          <div
            className="deck-mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginTop: 2,
            }}
          >
            {CROWDFUNDING_DECK.challenge}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <button
            className="deck-mono"
            onClick={resetDeck}
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              background: "none",
            }}
          >
            reset
          </button>
          <Link
            href="/scenes"
            className="deck-mono"
            style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)" }}
          >
            ↩ atlas
          </Link>
        </div>
      </div>

      {/* the stack */}
      <div className="deck-stage">
        {Array.from({ length: ghostCount }).map((_, i) => {
          const depth = i + 1;
          return (
            <div
              key={i}
              className="deck-ghost"
              style={{
                width: `calc(100% - ${depth * 26}px)`,
                height: 460,
                transform: `translateX(-50%) translateY(${depth * 12}px)`,
                opacity: 0.55 - depth * 0.12,
                zIndex: -depth,
              }}
            />
          );
        })}
        <div key={card.id} style={{ position: "relative", zIndex: 1 }}>
          <CardRenderer card={card} chain={chain} />
        </div>
      </div>

      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26, paddingBottom: 64 }}>
        <button className="deck-btn deck-btn-ghost" onClick={prev} disabled={cardIndex === 0}>
          ← back
        </button>
        <div style={{ flex: 1 }}>
          <div className="deck-rail">
            <div className="deck-rail-fill" style={{ width: `${progress}%` }} />
          </div>
          <div
            className="deck-mono"
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              marginTop: 8,
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          >
            {String(cardIndex + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")} · {card.tier1}
          </div>
        </div>
        {isLast ? (
          <Link href="/scenes" className="deck-btn deck-btn-primary" style={{ textDecoration: "none" }}>
            finish ✓
          </Link>
        ) : (
          <button className="deck-btn deck-btn-primary" onClick={next}>
            next →
          </button>
        )}
      </div>
    </div>
  );
}
