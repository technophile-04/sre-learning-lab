"use client";

// Read-only Solidity viewer with the vox focus effect: every line is dimmed +
// faintly blurred except the focused range, which stays sharp behind a saffron
// rule. The hand (☞) sits at the focused region and bobs — the teacher reading
// along. Lines are hand-rendered (small tokenizer) for exact control of the
// dim/focus + hand placement.
import { useMemo } from "react";

type Token = { t: string; c: string };

const KEYWORDS = new Set([
  "pragma",
  "solidity",
  "import",
  "contract",
  "is",
  "function",
  "constructor",
  "public",
  "private",
  "external",
  "internal",
  "view",
  "pure",
  "payable",
  "returns",
  "return",
  "memory",
  "storage",
  "calldata",
  "immutable",
  "constant",
  "require",
  "if",
  "else",
  "for",
  "while",
  "mapping",
  "emit",
  "new",
  "this",
  "msg",
  "value",
  "sender",
]);
const TYPES = new Set(["uint256", "uint", "int", "int256", "address", "bool", "string", "bytes", "ERC20", "Ownable"]);

const TOKEN_RE = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s\w])/g;

function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    if (m[1] || m[2]) out.push({ t: m[0], c: "cb-com" });
    else if (m[3]) out.push({ t: m[0], c: "cb-str" });
    else if (m[4]) out.push({ t: m[0], c: "cb-num" });
    else if (m[5]) {
      const w = m[5];
      const c = KEYWORDS.has(w) ? "cb-kw" : TYPES.has(w) || /^[A-Z]/.test(w) ? "cb-type" : "cb-id";
      out.push({ t: w, c });
    } else out.push({ t: m[0], c: "cb-pn" });
  }
  return out;
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
  /** dim + blur the non-focused lines (vox). Off for write cards so the whole
   *  function stays readable. */
  dim?: boolean;
}) {
  const { lines, from, to } = useMemo(() => {
    const ls = source.replace(/\s+$/, "").split("\n");
    const [f, t] = fromAnchor ? findRange(source, fromAnchor, toAnchor) : [-1, -1];
    return { lines: ls, from: f, to: t };
  }, [source, fromAnchor, toAnchor]);

  const focused = from !== -1;

  return (
    <div className={`codeblock deck-mono ${focused && dim ? "vox" : ""}`} style={{ position: "relative" }}>
      <pre style={{ margin: 0 }}>
        {lines.map((line, i) => {
          const inFocus = focused && i >= from && i <= to;
          const isRuleStart = focused && i === from;
          return (
            <div
              key={i}
              className={`cm-line ${inFocus ? "vox-focus" : ""} ${inFocus ? "cm-focus-rule" : ""}`}
              style={{ position: "relative", paddingLeft: 14 }}
            >
              {hand && isRuleStart && (
                <span className="deck-hand" aria-hidden style={{ top: 1 }}>
                  <span>☞</span>
                </span>
              )}
              <span className="cb-ln">{String(i + 1).padStart(2, " ")}</span>
              {line.length === 0
                ? " "
                : tokenize(line).map((tok, j) => (
                    <span key={j} className={tok.c}>
                      {tok.t}
                    </span>
                  ))}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
