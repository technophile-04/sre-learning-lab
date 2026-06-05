"use client";

// The forming contract — the right column that's always on screen. It shows the
// GIVEN scaffold of CrowdFund.sol solid from the first card (the parts the learner
// doesn't write: the pragma, the contract shell, the error list, the function
// signatures). The bodies the learner has to write are shown as empty placeholder
// stubs ("⌁ contribute() · your task") — NOT the answer. As each YOUR TURN slot is
// completed, its stub is replaced by real, syntax-lit code that inks in with a
// sweep, so the contract visibly grows under the learner's hands.
//
// Crucially we do not render the canonical body of an unwritten slot, so the panel
// never spoils the task. Filled slots render the reference code (the learner's own
// exact lines still live in the deck + peek sheet); unwritten slots render a stub.
//
// The panel also follows the active card: a card's piece (a YOUR TURN slot, the
// slots a TRY IT exercises, or a CODE card's anchored region) is highlighted here
// and the rest dims, so the right column is visibly the same code the card teaches.
import { useEffect, useMemo, useRef, useState } from "react";
import { CODE_LANG, CODE_THEME, useHighlighter } from "../../crowdfunding/_components/highlighter";
import type { ThemedToken } from "shiki";
import { CANONICAL, CROWDFUND_SKELETON } from "~~/lib/deck/crowdfunding-contracts";
import { CROWDFUNDING_DECK } from "~~/lib/deck/crowdfunding-deck";
import type { YourTurnCard } from "~~/lib/deck/types";
import { useDeckStore } from "~~/services/store/deck-store";

const SLOT_LABEL: Record<string, string> = {
  __BALANCES__: "balances mapping",
  __OPEN_TO_WITHDRAW__: "openToWithdraw flag",
  __DEADLINE_THRESHOLD__: "deadline & goal",
  __MODIFIER__: "notCompleted guard",
  __CONTRIBUTE__: "contribute() body",
  __WITHDRAW__: "withdraw() body",
  __EXECUTE__: "execute() body",
  __RECEIVE__: "receive() body",
  __TIMELEFT__: "timeLeft() body",
};

const ALL_SLOTS = Object.keys(CANONICAL);
const YOUR_TURN_SLOTS = CROWDFUNDING_DECK.cards
  .filter((c): c is YourTurnCard => c.type === "your-turn")
  .map(c => c.slot);

// what a card asks the panel to highlight: a set of slots (YOUR TURN / TRY IT) or a
// text region between two anchors (CODE cards, which point at a function or a line).
// wholeBlock expands a slot to its enclosing function/modifier so the highlight wraps
// the whole thing (signature + braces), not just the body line you fill.
export type BuildFocus = { slots?: string[]; fromAnchor?: string; toAnchor?: string; wholeBlock?: boolean };

type Seg = { text: string; slot: string | null; ghost: boolean; indent: string };

// Walk the skeleton. Structural lines are solid. A slot token becomes either the
// reference code (solid) if the learner has filled it, or a single placeholder
// stub line (ghost) if they haven't — never the answer.
function buildSegments(filled: Set<string>): Seg[] {
  const segs: Seg[] = [];
  for (const raw of CROWDFUND_SKELETON.split("\n")) {
    const m = raw.match(/\/\*(__[A-Z_]+__)\*\//);
    if (m) {
      const slot = m[1];
      const indent = raw.match(/^\s*/)?.[0] ?? "";
      if (filled.has(slot)) {
        const code = CANONICAL[slot] ?? "";
        for (const cl of code.split("\n"))
          segs.push({ text: cl.length ? indent + cl : cl, slot, ghost: false, indent });
      } else {
        const label = SLOT_LABEL[slot] ?? slot;
        // the text only needs to hold a line for token alignment; render is a chip
        segs.push({ text: `${indent}// ${label}`, slot, ghost: true, indent });
      }
    } else {
      segs.push({ text: raw, slot: null, ghost: false, indent: "" });
    }
  }
  return segs;
}

function fontStyleOf(fs?: number) {
  if (!fs || fs < 0) return {};
  const s: React.CSSProperties = {};
  if (fs & 1) s.fontStyle = "italic";
  if (fs & 2) s.fontWeight = 700;
  if (fs & 4) s.textDecoration = "underline";
  return s;
}

// Given a slot's line, return the [open, close] line range of its enclosing function
// or modifier. Returns null when the slot sits at contract level (a state variable),
// so those tasks stay a single line instead of highlighting the whole contract.
function enclosingFunctionBlock(lines: string[], slotLine: number): [number, number] | null {
  let open = -1;
  for (let i = slotLine; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.endsWith("{")) {
      if (/\bcontract\b/.test(t)) return null;
      open = i;
      break;
    }
  }
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth === 0) return [open, i];
  }
  return null;
}

// Centre a line inside the code container WITHOUT moving the page. el.scrollIntoView()
// bubbles to every scrollable ancestor (including the window), which nudged the whole
// deck down when a focused/inked line sat below the fold; this confines the scroll to
// .bp-code itself.
function scrollWithin(container: HTMLElement, el: HTMLElement) {
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const delta = eRect.top - cRect.top - (container.clientHeight - eRect.height) / 2;
  container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
}

export function BuildPanel({ focus }: { focus?: BuildFocus }) {
  const sources = useDeckStore(s => s.sources);
  const live = sources["CrowdFund.sol"];
  const hl = useHighlighter();

  // the learner can toggle the focus off (click the contract to see the whole
  // thing) and back on (click the pill); it re-focuses on its own per card.
  const [showFocus, setShowFocus] = useState(true);

  // a slot is "filled" once its token no longer sits in the live source
  const filled = useMemo(() => {
    const set = new Set<string>();
    for (const slot of ALL_SLOTS) if (!live.includes(`/*${slot}*/`)) set.add(slot);
    return set;
  }, [live]);

  const segs = useMemo(() => buildSegments(filled), [filled]);
  const fullText = useMemo(() => segs.map(s => s.text).join("\n"), [segs]);
  const lines = useMemo(() => fullText.split("\n"), [fullText]);

  // resolve the card's focus to a set of rendered line indices
  const focusKey = JSON.stringify(focus ?? null);
  const focusLines = useMemo(() => {
    const set = new Set<number>();
    if (focus?.slots?.length) {
      const want = new Set(focus.slots);
      const slotIdx: number[] = [];
      segs.forEach((s, i) => {
        if (s.slot && want.has(s.slot)) {
          set.add(i);
          slotIdx.push(i);
        }
      });
      // expand each slot to its enclosing function so the highlight wraps the whole
      // thing (state-variable slots return null and stay a single line)
      if (focus.wholeBlock) {
        for (const idx of slotIdx) {
          const block = enclosingFunctionBlock(lines, idx);
          if (block) for (let i = block[0]; i <= block[1]; i++) set.add(i);
        }
      }
    } else if (focus?.fromAnchor) {
      const from = lines.findIndex(l => l.includes(focus.fromAnchor!));
      if (from !== -1) {
        let to = from;
        if (focus.toAnchor) {
          for (let i = from; i < lines.length; i++) {
            if (lines[i].includes(focus.toAnchor!)) {
              to = i;
              break;
            }
          }
        }
        for (let i = from; i <= to; i++) set.add(i);
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs, lines, focusKey]);

  const hasFocus = focusLines.size > 0;
  const focusOn = hasFocus && showFocus;
  // label the pill with the slot name of the first slot inside the focused lines
  // (a CODE card's region usually wraps one); fall back to a generic phrase
  const focusLabel = useMemo(() => {
    if (!hasFocus) return null;
    for (const i of focusLines) {
      const s = segs[i]?.slot;
      if (s) return SLOT_LABEL[s] ?? s;
    }
    return "this section";
  }, [hasFocus, focusLines, segs]);

  // re-focus on the current card's piece whenever the card changes
  useEffect(() => {
    setShowFocus(true);
  }, [focusKey]);

  const writtenCount = YOUR_TURN_SLOTS.filter(s => filled.has(s)).length;

  // first rendered line of each slot's run — lets us cascade multi-line slots so
  // they ink in line by line instead of all at once
  const slotFirstLine = useMemo(() => {
    const map: Record<string, number> = {};
    segs.forEach((s, i) => {
      if (s.slot && !s.ghost && !(s.slot in map)) map[s.slot] = i;
    });
    return map;
  }, [segs]);

  const codeRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => {
    if (!hl) return null;
    try {
      return hl.codeToTokens(fullText, { lang: CODE_LANG, theme: CODE_THEME }).tokens as ThemedToken[][];
    } catch {
      return null;
    }
  }, [hl, fullText]);

  // detect slots that just went from unfilled → filled, and animate those lines
  const prevFilled = useRef<Set<string> | null>(null);
  const [inking, setInking] = useState<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevFilled.current;
    if (prev) {
      const justFilled = [...filled].filter(s => !prev.has(s));
      if (justFilled.length) {
        setInking(new Set(justFilled));
        const t = setTimeout(() => setInking(new Set()), 2000);
        prevFilled.current = new Set(filled);
        return () => clearTimeout(t);
      }
    }
    prevFilled.current = new Set(filled);
  }, [filled]);

  // when a region inks in, scroll it into view so the animation is never off-screen
  useEffect(() => {
    if (inking.size === 0) return;
    const id = requestAnimationFrame(() => {
      const c = codeRef.current;
      const el = c?.querySelector<HTMLElement>(".bp-inking");
      if (c && el) scrollWithin(c, el);
    });
    return () => cancelAnimationFrame(id);
  }, [inking]);

  // when the card changes the focused piece, bring it into view so the right panel
  // follows along with the middle card (skip while a fresh ink scroll is running)
  useEffect(() => {
    if (!focusOn || inking.size > 0) return;
    const id = requestAnimationFrame(() => {
      const c = codeRef.current;
      const el = c?.querySelector<HTMLElement>(".bp-focus");
      if (c && el) scrollWithin(c, el);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, showFocus]);

  // expand to the whole contract when the learner clicks outside the focused piece
  const onCodeClick = (e: React.MouseEvent) => {
    if (!focusOn) return;
    if (!(e.target as HTMLElement).closest(".bp-focus")) setShowFocus(false);
  };

  return (
    <div className="bp">
      <div className="bp-head">
        <div className="bp-head-row">
          <span className="bp-file deck-mono">
            <span className="bp-file-icon" aria-hidden>
              ❑
            </span>
            CrowdFund.sol
          </span>
          <span
            className="bp-count deck-mono"
            aria-label={`${writtenCount} of ${YOUR_TURN_SLOTS.length} pieces written`}
          >
            <span className="bp-count-now">{writtenCount}</span>/<span>{YOUR_TURN_SLOTS.length}</span> pieces
          </span>
        </div>
        {focusLabel ? (
          <button
            type="button"
            className={`bp-blurb bp-focusing deck-mono ${focusOn ? "is-on" : "is-off"}`}
            onClick={() => setShowFocus(v => !v)}
            title={focusOn ? "click to show the whole contract" : "click to focus this card's piece"}
          >
            <span className="bp-focus-dot" aria-hidden />
            {focusOn ? (
              <>
                on this card · <strong>{focusLabel}</strong>
              </>
            ) : (
              <>
                focus this card · <strong>{focusLabel}</strong>
              </>
            )}
          </button>
        ) : (
          <p className="bp-blurb">
            The shell is given. The dashed <strong>your task</strong> stubs are the bodies you write — each one fills in
            with real code as you finish its task.
          </p>
        )}
      </div>

      <div
        className={`bp-code deck-mono ${focusOn ? "bp-has-focus" : ""} ${!hasFocus ? "bp-dimmed" : ""}`}
        ref={codeRef}
        onClick={onCodeClick}
      >
        <pre>
          {lines.map((line, i) => {
            const seg = segs[i];
            const slot = seg?.slot ?? null;
            const ghost = seg?.ghost ?? false;
            const isInking = slot && !ghost ? inking.has(slot) : false;
            const isFocus = focusOn && focusLines.has(i);
            const lineToks = tokens?.[i];
            // cascade: each line of a freshly-filled slot inks in a beat after the last
            const inkDelay = isInking && slot ? (i - (slotFirstLine[slot] ?? i)) * 80 : 0;
            return (
              <div
                key={i}
                className={`bp-line ${isInking ? "bp-inking" : ""} ${isFocus ? "bp-focus" : ""}`}
                style={isInking ? ({ "--ink-delay": `${inkDelay}ms` } as React.CSSProperties) : undefined}
              >
                <span className="bp-ln">{String(i + 1).padStart(2, " ")}</span>
                {ghost ? (
                  <>
                    <span style={{ whiteSpace: "pre" }}>{seg.indent}</span>
                    <span className="bp-stub">⌁ {SLOT_LABEL[slot!] ?? slot} · your task</span>
                  </>
                ) : !lineToks ? (
                  line.length === 0 ? (
                    " "
                  ) : (
                    line
                  )
                ) : lineToks.length === 0 ? (
                  " "
                ) : (
                  lineToks.map((tok, j) => (
                    <span key={j} style={{ color: tok.color, ...fontStyleOf(tok.fontStyle) }}>
                      {tok.content}
                    </span>
                  ))
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
