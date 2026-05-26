"use client";

// The deck shell: the active card on top of ghost edges that hint at remaining
// depth, a journey panel down the left margin (mobile: top-down sheet), a
// progress rail and prev/next at the bottom, and a peek button in the top bar
// that opens a right-side sheet showing the current state of CrowdFund.sol.
// Navigation is non-blocking — the learner can jump anywhere; YOUR TURN / THINK
// cards grade but never gate.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CodePeekSheet } from "./CodePeekSheet";
import { JourneyPanel } from "./JourneyPanel";
import { CardRenderer } from "./cards";
import { useChainRuntime } from "./useChainRuntime";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import { useDeckStore } from "~~/services/store/deck-store";

const CARDS = CROWDFUNDING_DECK.cards;

// 'c' shortcut for peek: ignored when the learner is typing into a card input,
// a THINK prose box, or the CodeMirror code editor (.cm-content).
function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.closest(".cm-content")) return true;
  return false;
}

const PANEL_COLLAPSED_KEY = "deck:panel-collapsed";

export function Deck() {
  const chain = useChainRuntime();
  const cardIndex = useDeckStore(s => s.cardIndex);
  const next = useDeckStore(s => s.next);
  const prev = useDeckStore(s => s.prev);
  const resetDeck = useDeckStore(s => s.resetDeck);

  // avoid SSR/persist hydration mismatch — render the deck only after mount
  const [mounted, setMounted] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // panel collapsed state persists across reloads — a UI preference, not
  // learning state, so it lives in its own localStorage key (not deck-store)
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setPanelCollapsed(window.localStorage.getItem(PANEL_COLLAPSED_KEY) === "true");
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    window.localStorage.setItem(PANEL_COLLAPSED_KEY, String(panelCollapsed));
  }, [mounted, panelCollapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      setPeekOpen(o => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted) return null;

  const card = CARDS[cardIndex];
  const remaining = CARDS.length - 1 - cardIndex;
  const ghostCount = Math.min(3, remaining);
  const progress = ((cardIndex + 1) / CARDS.length) * 100;
  const isLast = cardIndex === CARDS.length - 1;

  return (
    <div className={`deck-shell ${panelCollapsed ? "deck-shell-collapsed" : ""}`}>
      <JourneyPanel
        mobileOpen={navOpen}
        onCloseMobile={() => setNavOpen(false)}
        collapsed={panelCollapsed}
        onCollapse={() => setPanelCollapsed(true)}
      />

      <div className="deck-main">
        {/* mobile: always shown below 1024px; desktop: shown when panel is collapsed */}
        <button
          type="button"
          className={`deck-nav-opener deck-mono ${panelCollapsed ? "deck-nav-opener-desktop" : ""}`}
          onClick={() => {
            if (panelCollapsed) setPanelCollapsed(false);
            else setNavOpen(true);
          }}
          aria-label={panelCollapsed ? "show lesson index" : "open lesson index"}
        >
          <span aria-hidden>☰</span>
          <span>the path</span>
          <span className="deck-nav-opener-count">
            {String(cardIndex + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
          </span>
        </button>

        <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
          {/* top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingTop: 36,
              paddingBottom: 26,
              gap: 18,
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
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button
                type="button"
                className="deck-peek-btn deck-mono"
                onClick={() => setPeekOpen(true)}
                aria-label="peek current state of the contract (c)"
              >
                <span className="deck-peek-icon" aria-hidden>
                  ❑
                </span>
                <span>peek code</span>
                <span className="deck-peek-kbd" aria-hidden>
                  c
                </span>
              </button>
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
                href="/"
                className="deck-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
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
              <Link href="/" className="deck-btn deck-btn-primary" style={{ textDecoration: "none" }}>
                finish ✓
              </Link>
            ) : (
              <button className="deck-btn deck-btn-primary" onClick={next}>
                next →
              </button>
            )}
          </div>
        </div>
      </div>

      <CodePeekSheet open={peekOpen} onClose={() => setPeekOpen(false)} />
    </div>
  );
}
