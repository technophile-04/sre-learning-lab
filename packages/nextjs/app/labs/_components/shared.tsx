"use client";

// Small pieces shared by all three lab alternatives: the tiny markdown renderer
// (same grammar as the live deck's cards.tsx), the AI grade fetch, the verdict
// chip, and the "inspired by" tag that makes each lab's platform lineage visible.
import type { Verdict } from "~~/services/store/deck-store";

// ── tiny markdown: **bold** *italic* `code` ───────────────────────────────────
export function renderInline(s: string) {
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`"))
      out.push(
        <code key={k++} className="rich-code">
          {tok.slice(1, -1)}
        </code>,
      );
    else if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Rich({ text, drop = false }: { text: string; drop?: boolean }) {
  return (
    <div className={drop ? "rich-body" : undefined}>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i} className="rich-p">
          {renderInline(p)}
        </p>
      ))}
    </div>
  );
}

// ── AI grading (reuses /api/grade) ────────────────────────────────────────────
export type GradeResult = { verdict: Verdict; feedback: string };

export async function gradeAnswer(payload: Record<string, unknown>): Promise<GradeResult | { error: string }> {
  try {
    const r = await fetch("/api/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok || data.error) return { error: data.error ?? "grading failed" };
    return data as GradeResult;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const label = verdict === "pass" ? "got it" : verdict === "partial" ? "close" : "not yet";
  return (
    <span
      className={`deck-mono verdict-${verdict}`}
      style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 5 }}
    >
      {label}
    </span>
  );
}

export const VERDICT_GLYPH: Record<Verdict, string> = { pass: "✓", partial: "◐", miss: "◌" };

// ── inspiration tag — the visible platform lineage ────────────────────────────
export function InspirationTag({ sources, note }: { sources: string[]; note?: string }) {
  return (
    <span className="lab-insp" title={note}>
      <span className="lab-insp-label">inspired by</span>
      {sources.map(s => (
        <span key={s} className="lab-insp-pill">
          {s}
        </span>
      ))}
    </span>
  );
}
