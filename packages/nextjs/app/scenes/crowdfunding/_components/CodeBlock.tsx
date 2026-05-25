"use client";

// Read-only Solidity viewer with the vox focus effect (modelled on vocs): every
// line is dimmed + faintly blurred except the focused range, which stays sharp
// behind a saffron rule. Hovering the whole block reveals every line at full
// clarity, exactly like vocs — pure CSS (.vox:hover in deck.css), no JS. The
// hand (☞) sits at the focused region and bobs — the teacher reading along.
// Token colors come from Shiki's github-dark-dimmed theme (inline styles), not
// hand-rolled CSS; focus is targeted by card metadata (fromAnchor/toAnchor),
// NOT by `// [!code focus]` comments, so the source stays clean for the compiler.
import { type CSSProperties, useMemo } from "react";
import { CODE_LANG, CODE_THEME, useHighlighter } from "./highlighter";
import type { ThemedToken } from "shiki";

// Shiki encodes a token's font style as a bitmask: 1=italic, 2=bold, 4=underline.
function fontStyleOf(fs?: number): CSSProperties {
  if (!fs || fs < 0) return {};
  const s: CSSProperties = {};
  if (fs & 1) s.fontStyle = "italic";
  if (fs & 2) s.fontWeight = 700;
  if (fs & 4) s.textDecoration = "underline";
  return s;
}

function findRange(source: string, fromAnchor: string, toAnchor?: string): [number, number] {
  const lines = source.split("\n");
  const from = lines.findIndex(l => l.includes(fromAnchor));
  if (from === -1) return [-1, -1];
  if (!toAnchor) return [from, from];
  const rel = lines.slice(from).findIndex(l => l.includes(toAnchor));
  return [from, rel === -1 ? from : from + rel];
}

export function CodeBlock({
  source,
  fromAnchor,
  toAnchor,
  hand = true,
  dim = true,
}: {
  source: string;
  fromAnchor?: string;
  toAnchor?: string;
  hand?: boolean;
  /** dim + blur the non-focused lines (vox). On everywhere now — hovering the
   *  block reveals the full contract, so even write cards can dim safely. */
  dim?: boolean;
}) {
  const hl = useHighlighter();
  const { lines, tokens, from, to } = useMemo(() => {
    const cleaned = source.replace(/\s+$/, "");
    const ls = cleaned.split("\n");
    const [f, t] = fromAnchor ? findRange(cleaned, fromAnchor, toAnchor) : [-1, -1];
    let tk: ThemedToken[][] | null = null;
    if (hl) {
      try {
        tk = hl.codeToTokens(cleaned, { lang: CODE_LANG, theme: CODE_THEME }).tokens;
      } catch {
        tk = null; // grammar/token hiccup → fall back to plain text
      }
    }
    return { lines: ls, tokens: tk, from: f, to: t };
  }, [source, fromAnchor, toAnchor, hl]);

  const focused = from !== -1;

  return (
    <div className={`codeblock deck-mono ${focused && dim ? "vox" : ""}`} style={{ position: "relative" }}>
      <pre style={{ margin: 0 }}>
        {lines.map((line, i) => {
          const inFocus = focused && i >= from && i <= to;
          const isRuleStart = focused && i === from;
          const lineToks = tokens?.[i];
          return (
            <div
              key={i}
              className={`cm-line ${inFocus ? "vox-focus cm-focus-rule" : ""}`}
              style={{ position: "relative", paddingLeft: 14 }}
            >
              {hand && isRuleStart && (
                <span className="deck-hand" aria-hidden style={{ top: 1 }}>
                  <span>☞</span>
                </span>
              )}
              <span className="cb-ln">{String(i + 1).padStart(2, " ")}</span>
              {lineToks
                ? lineToks.length === 0
                  ? " "
                  : lineToks.map((tok, j) => (
                      <span key={j} style={{ color: tok.color, ...fontStyleOf(tok.fontStyle) }}>
                        {tok.content}
                      </span>
                    ))
                : line.length === 0
                  ? " "
                  : line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
