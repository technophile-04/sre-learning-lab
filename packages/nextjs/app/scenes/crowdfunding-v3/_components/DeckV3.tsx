"use client";

// v2 deck shell — a three-pane workspace, the layout every reference platform
// converges on (Boot.dev / Codecademy / Fireship): the lesson index on the left,
// the active card in the middle, and a right column that's always showing the
// contract taking shape. The right column has a second tab, the try-first tutor
// (Boots), which a card hands its current task to. Nothing here is gated — the
// learner can jump anywhere; grading and the tutor never block progress.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TutorPanel, type TutorTask } from "../../../labs/_components/TutorPanel";
import { useChainRuntime } from "../../crowdfunding/_components/useChainRuntime";
import { type BuildFocus, BuildPanel } from "./BuildPanel";
import { JourneyPanelV3 } from "./JourneyPanelV3";
import { CardRendererV3, SCENARIO_DEPS } from "./cardsV3";
import { type TutorBus, TutorBusContext } from "./tutor-bus";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { Card } from "~~/lib/deck/types";
import { useDeckStore } from "~~/services/store/deck-store";

const CARDS = CROWDFUNDING_DECK.cards;
const PANEL_COLLAPSED_KEY = "deck-v3:panel-collapsed";

// the piece of CrowdFund.sol the current card is about — the BUILDING panel
// highlights it so the contract on the right is the same code the card teaches.
// YOUR TURN / TRY IT point at slots; CODE cards point at an anchored region (so a
// CODE card needs no inline code block — the right panel shows it, highlighted).
function focusForCard(card: Card): BuildFocus {
  // YOUR TURN wraps the whole enclosing function (signature + braces), so the piece
  // you write is shown in context — matching how CODE cards highlight a function
  if (card.type === "your-turn") return { slots: [card.slot], wholeBlock: true };
  if (card.type === "try-it") return { slots: SCENARIO_DEPS[card.scenario] ?? [] };
  if (card.type === "code") return { fromAnchor: card.fromAnchor, toAnchor: card.toAnchor };
  return {};
}

// Same chapter grouping the journey panel uses: a concept / ship-it / recap card
// opens a chapter. Given the current card, find which chapter it's in (Roman
// numeral + the opener's title) so the collapsed breadcrumb can show it.
const CHAPTER_OPENERS = new Set(["concept", "ship-it", "recap"]);
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
function chapterAt(index: number): { roman: string; title: string; starterIndex: number } {
  let count = 0;
  let starterIndex = 0;
  let title = "";
  for (let i = 0; i <= index; i++) {
    if (i === 0 || CHAPTER_OPENERS.has(CARDS[i].type)) {
      count += 1;
      starterIndex = i;
      title = CARDS[i].title;
    }
  }
  return { roman: romanize(count), title, starterIndex };
}

export function DeckV3() {
  const chain = useChainRuntime();
  const cardIndex = useDeckStore(s => s.cardIndex);
  const next = useDeckStore(s => s.next);
  const prev = useDeckStore(s => s.prev);
  const markRead = useDeckStore(s => s.markRead);

  const [mounted, setMounted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // right column: the forming contract by default; the tutor when a card asks
  const [rightTab, setRightTab] = useState<"build" | "tutor">("build");
  const [tutorTask, setTutorTask] = useState<TutorTask | null>(null);
  const [attempted, setAttempted] = useState(false);
  // bumped whenever a middle-card action redirects to a right-column panel ("ask the
  // tutor", submit→building). The effect lands far from the click, so the panel
  // breathes a soft saffron border glow once to pull the eye over there. Manual tab
  // clicks and card navigation don't bump it — you're already looking there.
  const [panelPulse, setPanelPulse] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      // default the rail COLLAPSED (focus on the card + build panel, like
      // Fireship/Codecademy/Boot.dev in-task views — the index opens on demand);
      // once the learner toggles it, their saved preference wins.
      const stored = window.localStorage.getItem(PANEL_COLLAPSED_KEY);
      setPanelCollapsed(stored === null ? true : stored === "true");
    }
  }, []);
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    window.localStorage.setItem(PANEL_COLLAPSED_KEY, String(panelCollapsed));
  }, [mounted, panelCollapsed]);

  const bus = useMemo<TutorBus>(
    () => ({
      setTask: t => setTutorTask(t),
      setAttempted: a => setAttempted(a),
      open: tab => {
        setRightTab(tab);
        setPanelPulse(p => p + 1);
      },
    }),
    [],
  );

  // each card grounds the learner in the forming contract; the tutor is summoned
  // (by "ask the tutor"). Reset on navigation so you never land on a stale/empty
  // tutor — within a card, manual switches and submit-routing still win.
  useEffect(() => {
    setRightTab("build");
  }, [cardIndex]);

  if (!mounted) return null;

  const card = CARDS[cardIndex];
  const ch = chapterAt(cardIndex);
  const isOpener = ch.starterIndex === cardIndex; // current card IS the chapter opener
  const remaining = CARDS.length - 1 - cardIndex;

  // cards that ask nothing of the learner get marked complete on Next, so the
  // index shows a clear "read" check. Graded cards (your-turn / think) get their
  // verdict mark instead; try-it / ship-it stay unmarked until actually run.
  const READ_TYPES = new Set(["concept", "code", "recap"]);
  const advance = () => {
    if (READ_TYPES.has(card.type)) markRead(card.id);
    next();
  };
  const ghostCount = Math.min(3, remaining);
  const progress = ((cardIndex + 1) / CARDS.length) * 100;
  const isLast = cardIndex === CARDS.length - 1;
  const buildFocus = focusForCard(card);

  return (
    <TutorBusContext.Provider value={bus}>
      <div className={`deck-shell deck-shell-v2 deck-shell-v3 ${panelCollapsed ? "deck-shell-collapsed" : ""}`}>
        <JourneyPanelV3
          mobileOpen={navOpen}
          onCloseMobile={() => setNavOpen(false)}
          collapsed={panelCollapsed}
          onCollapse={() => setPanelCollapsed(true)}
        />

        <div className="deck-main v2-center">
          {/* mobile only: a compact opener for the lesson sheet (desktop uses the
              breadcrumb in the top bar below) */}
          <button
            type="button"
            className="deck-nav-opener deck-mono"
            onClick={() => setNavOpen(true)}
            aria-label="open lesson index"
          >
            <span aria-hidden>☰</span>
            <span>lessons</span>
            <span className="deck-nav-opener-count">
              {String(cardIndex + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
            </span>
          </button>

          <div className={`v2-center-col ${panelCollapsed ? "" : "v2-center-col-open"}`}>
            {/* the top bar only earns its space when the rail is collapsed: it carries
                the breadcrumb (the rail's job when open) plus the deck controls. With
                the rail open, the title is already in the rail header and reset/original
                live in the rail footer, so we drop the bar and give the card the room. */}
            {panelCollapsed && (
              <div className="v2-topbar">
                <button
                  type="button"
                  className="v2-crumb deck-mono"
                  onClick={() => setPanelCollapsed(false)}
                  aria-label="show the lessons index"
                  title="show the lessons index"
                >
                  <span className="v2-crumb-grip" aria-hidden>
                    ☰
                  </span>
                  <span className="v2-crumb-body">
                    {/* quiet context strip: course · section number · section title, with
                        the position pinned to the right */}
                    <span className="v2-crumb-context">
                      <span className="v2-crumb-course">{CROWDFUNDING_DECK.title}</span>
                      <span className="v2-crumb-roman">{ch.roman}</span>
                      {!isOpener && <span className="v2-crumb-section">{ch.title}</span>}
                      <span className="v2-crumb-count">
                        <span className="v2-crumb-count-now">{cardIndex + 1}</span> / {CARDS.length}
                      </span>
                    </span>
                    {/* the loud line: what you're actually on right now */}
                    <span className="v2-crumb-task deck-display">{card.title}</span>
                  </span>
                </button>
              </div>
            )}

            <div className="deck-stage">
              {Array.from({ length: ghostCount }).map((_, i) => {
                const depth = i + 1;
                // Ghosts are pinned to the active card's height (top:0/bottom:0 in
                // CSS) and pushed down by a small, constant step, so the stack peeks
                // the same sliver under every card — short IDEA/GOTCHA cards and tall
                // code cards alike. No fixed height, which is what made the ghosts
                // jut out below the short cards and read as stray shadows.
                return (
                  <div
                    key={i}
                    className="deck-ghost"
                    style={{
                      width: `calc(100% - ${depth * 20}px)`,
                      transform: `translateX(-50%) translateY(${depth * 7}px)`,
                      opacity: 0.5 - depth * 0.13,
                      zIndex: -depth,
                    }}
                  />
                );
              })}
              <div key={card.id} style={{ position: "relative", zIndex: 1 }}>
                <CardRendererV3 card={card} chain={chain} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24, paddingBottom: 56 }}>
              <button className="deck-btn deck-btn-ghost" onClick={prev} disabled={cardIndex === 0}>
                ← back
              </button>
              <div style={{ flex: 1 }}>
                <div className="deck-rail">
                  <div className="deck-rail-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {isLast ? (
                <Link
                  href="/scenes/crowdfunding"
                  className="deck-btn deck-btn-primary"
                  style={{ textDecoration: "none" }}
                  onClick={() => READ_TYPES.has(card.type) && markRead(card.id)}
                >
                  done ✓
                </Link>
              ) : (
                <button className="deck-btn deck-btn-primary" onClick={advance}>
                  next →
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="v2-right" aria-label="contract and tutor">
          {/* a one-shot saffron border glow when a card action lands a panel here */}
          {panelPulse > 0 && <span className="v2-right-glow" key={panelPulse} aria-hidden />}
          <div className="v2-right-tabs deck-mono">
            <button
              className={`v2-tab v2-tab-build ${rightTab === "build" ? "v2-tab-on" : ""}`}
              onClick={() => setRightTab("build")}
            >
              <span className="v2-tab-ico" aria-hidden>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.5 14.5 5 8 8.5 1.5 5 8 1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path d="M1.5 11 8 14.5 14.5 11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path
                    d="M1.5 8 8 11.5 14.5 8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                </svg>
              </span>
              building
            </button>
            <button
              className={`v2-tab v2-tab-tutor ${rightTab === "tutor" ? "v2-tab-on" : ""}`}
              onClick={() => setRightTab("tutor")}
            >
              <span className="v2-tab-ico" aria-hidden>
                ✦
              </span>
              AI tutor
              {tutorTask && rightTab !== "tutor" && <span className="v2-tab-dot" aria-hidden />}
            </button>
            <div className="v3-theme-switch" aria-label="theme switcher">
              <SwitchTheme />
            </div>
          </div>
          {/* both panels stay mounted (visibility toggled) so switching tabs never
              resets the BUILDING panel's ink state; the shown one reveals with a
              soft slide-in keyed on the active tab */}
          <div className="v2-right-body">
            <div className={`v2-panel ${rightTab === "build" ? "v2-panel-on" : ""}`} aria-hidden={rightTab !== "build"}>
              <BuildPanel focus={buildFocus} />
            </div>
            <div className={`v2-panel ${rightTab === "tutor" ? "v2-panel-on" : ""}`} aria-hidden={rightTab !== "tutor"}>
              <TutorPanel task={tutorTask} attempted={attempted} stage={card.title} surface="crowdfunding-v3" />
            </div>
          </div>
        </aside>
      </div>
    </TutorBusContext.Provider>
  );
}
