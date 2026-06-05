"use client";

// Editable Solidity line for YOUR TURN cards. Carlos's first review: the code
// input should highlight as the learner types. This is a lean CodeMirror editor
// (the same stack already proven in app/lab/page.tsx) on the *same* dark
// github-dark-dimmed ground as the read-only CodeBlock, so reading and writing
// a line happen on one surface. Only the CODE box gets a grammar — the
// explanation + THINK boxes stay plain textareas (they're prose, not Solidity).
//
// The background is overridden to #22272e (githubDarkInit) so it matches
// .codeblock in deck.css exactly; token colors come from the github-dark theme.
// Note: read tokens come from Shiki, write tokens from CodeMirror's Lezer
// grammar — same "github dark" family, hues are close but not pixel-identical.
import { useMemo } from "react";
import { solidity } from "@replit/codemirror-lang-solidity";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror, { type BasicSetupOptions } from "@uiw/react-codemirror";

// match the read panel (.codeblock) ground + the deck's saffron accent
const PANEL_BG = "#22272e";
const SAFFRON = "#e0913a";

// lean: this is a 1–4 line answer box, not a file editor. Keep history/undo,
// bracket help and indent-on-input (all default-on); drop the file-editor chrome.
const BASIC_SETUP: BasicSetupOptions = {
  lineNumbers: false,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  searchKeymap: false,
  autocompletion: false,
};

export function CodeInput({
  value,
  onChange,
  placeholder = "write your line here…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const theme = useMemo(
    () =>
      githubDarkInit({
        settings: {
          background: PANEL_BG,
          gutterBackground: PANEL_BG,
          caret: SAFFRON,
          selection: "rgba(224, 145, 58, 0.22)",
          selectionMatch: "rgba(224, 145, 58, 0.16)",
          lineHighlight: "transparent",
          fontFamily: "var(--font-mono), monospace",
        },
      }),
    [],
  );

  return (
    <div className="deck-code-input">
      {/* editor-tab header — the explicit "this is yours to write" signal, so the
          dark panel doesn't read as a read-only showcase like the CodeBlock does */}
      <div className="dci-head" aria-hidden>
        <span className="dci-pencil">✎</span>
        <span className="dci-label">write your code below</span>
        <span className="dci-hint">editable</span>
      </div>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[solidity]}
        theme={theme}
        basicSetup={BASIC_SETUP}
        placeholder={placeholder}
      />
    </div>
  );
}
