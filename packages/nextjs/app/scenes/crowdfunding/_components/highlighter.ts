// Shared Shiki highlighter for the deck's code viewer. We load exactly one
// grammar (solidity) and one theme (github-dark-dimmed, the same theme vocs
// ships) so token colors come from the library, not hand-rolled CSS.
//
// The highlighter is created once at module scope. `createHighlighter` is async
// (it lazy-imports the grammar + theme + oniguruma wasm), but once resolved we
// stash it in `resolved` so any CodeBlock mounting afterwards picks it up
// synchronously via the hook's initial state — no flash of unstyled code after
// the first card.
import { useEffect, useState } from "react";
import { type Highlighter, createHighlighter } from "shiki";

export const CODE_THEME = "github-dark-dimmed";
export const CODE_LANG = "solidity";

let resolved: Highlighter | null = null;
let pending: Promise<Highlighter> | null = null;

function load(): Promise<Highlighter> {
  if (!pending) {
    pending = createHighlighter({ themes: [CODE_THEME], langs: [CODE_LANG] }).then(h => {
      resolved = h;
      return h;
    });
  }
  return pending;
}

/** Returns the highlighter once ready, or null on the very first load. After the
 *  first resolve it returns synchronously (initial state is the cached instance). */
export function useHighlighter(): Highlighter | null {
  const [hl, setHl] = useState<Highlighter | null>(resolved);
  useEffect(() => {
    if (hl) return;
    let active = true;
    load().then(h => {
      if (active) setHl(h);
    });
    return () => {
      active = false;
    };
  }, [hl]);
  return hl;
}
