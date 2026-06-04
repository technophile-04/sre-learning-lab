"use client";

// Boots — the contextual, try-first tutor. The pattern borrowed from Boot.dev:
// help is gated behind an attempt, and every rung of the hint ladder is a visible
// cost, so reaching for the answer too early is felt rather than free. The ladder
// is deterministic and works with no API key (derived from the card's own prompt /
// hint / placeholder / rubric); the free-text "ask" calls /api/tutor when a key is
// present and falls back to the ladder otherwise. It never pastes the answer.
import { useEffect, useRef, useState } from "react";
import { renderInline } from "./shared";

export type TutorTask = {
  kind: "your-turn" | "think";
  title: string;
  /** YOUR TURN prompt or THINK question */
  prompt: string;
  hint?: string;
  /** YOUR TURN placeholder — the shape to fill */
  placeholder?: string;
  /** YOUR TURN reference — only ever surfaced on the final rung, with consent */
  canonical?: string;
  /** ideas a strong answer touches */
  concepts?: string[];
  /** the concept prose for the current beat (sent to the model for context) */
  concept?: string;
  /** the learner's current code/draft, read lazily so it's always fresh */
  getLearnerCode?: () => string;
};

type Msg = { role: "boots" | "you"; text: string; cost?: boolean };

// the offline Socratic ladder — smallest nudge first, the answer only at the end
function ladderFor(task: TutorTask): { label: string; text: string }[] {
  const rungs: { label: string; text: string }[] = [];
  rungs.push({
    label: "point me at it",
    text:
      task.kind === "think"
        ? "Read the question once more and answer in your own words first — there's no single right phrasing, I'm checking that the idea is there."
        : "Start from the shape you've been given. Each blank in it is one decision you have to make. Name the decision before you write the code.",
  });
  if (task.hint) {
    rungs.push({ label: "a nudge", text: task.hint });
  } else if (task.placeholder) {
    rungs.push({ label: "the shape", text: `Work from this: \`${task.placeholder.replace(/\n/g, " ")}\`` });
  }
  if (task.concepts && task.concepts.length) {
    rungs.push({
      label: "the concept",
      text: `What a strong answer leans on: ${task.concepts.slice(0, 3).join("; ")}.`,
    });
  }
  if (task.kind === "your-turn" && task.canonical) {
    rungs.push({
      label: "show me (last resort)",
      text: `One way to write it:\n\`${task.canonical.replace(/\n/g, "\n")}\`\nType it yourself so it sticks, then tweak the names if you like.`,
    });
  } else {
    rungs.push({
      label: "where i'd look",
      text: "Re-read the concept above this question and tie your answer to the one mechanic it describes. That's usually the missing half.",
    });
  }
  return rungs;
}

export function TutorPanel({
  task,
  attempted,
  onSpendHint,
  stage,
  surface,
}: {
  task: TutorTask | null;
  /** try-first gate — Boots stays closed until the learner has attempted */
  attempted: boolean;
  onSpendHint?: () => void;
  stage?: string;
  surface?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [rung, setRung] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // reset the conversation when the task changes
  useEffect(() => {
    setMsgs([]);
    setRung(0);
  }, [task?.title]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const ladder = task ? ladderFor(task) : [];
  const moreHints = rung < ladder.length;

  function nudge() {
    if (!task || !moreHints) return;
    onSpendHint?.();
    const r = ladder[rung];
    setMsgs(m => [...m, { role: "boots", text: r.text, cost: true }]);
    setRung(rung + 1);
  }

  async function ask() {
    if (!task || !draft.trim() || busy) return;
    const question = draft.trim();
    setDraft("");
    setMsgs(m => [...m, { role: "you", text: question }]);
    setBusy(true);
    const history = msgs.map(m => ({ role: m.role === "boots" ? "assistant" : "user", content: m.text }));
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: question }],
          context: {
            surface,
            stage,
            concept: task.concept,
            task: task.prompt,
            learnerCode: task.getLearnerCode?.(),
            canonical: task.canonical,
            ladderRung: rung,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok || data.error) {
        // graceful fallback to the next ladder rung when the model is unreachable
        const fallback = moreHints
          ? ladder[rung].text
          : "I can't reach the model right now, but you've got the pieces. Re-read the concept and try once more.";
        if (moreHints) setRung(rung + 1);
        setMsgs(m => [...m, { role: "boots", text: fallback }]);
      } else {
        setMsgs(m => [...m, { role: "boots", text: data.reply }]);
      }
    } catch {
      setMsgs(m => [...m, { role: "boots", text: "Network hiccup. The hint ladder still works below." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lab-tutor">
      <div className="lab-tutor-head">
        <span className="lab-tutor-avatar" aria-hidden>
          ☞
        </span>
        <div>
          <div className="lab-tutor-name deck-mono">AI Tutor</div>
          <div className="lab-tutor-role">contextual · try-first</div>
        </div>
      </div>

      {!task ? (
        <div className="lab-tutor-empty">Open a task and the AI tutor will help you reason through it.</div>
      ) : !attempted ? (
        <div className="lab-tutor-gate">
          <p className="rich-p" style={{ fontSize: 13.5 }}>
            Take a real swing at <em>{task.title}</em> first. The tutor opens once you&apos;ve written something — the
            struggle is where the learning sticks.
          </p>
          <div className="lab-tutor-gate-lock deck-mono">locked until you attempt</div>
        </div>
      ) : (
        <>
          {/* composer pinned at the top so it's always visible without scrolling
              (the right column can run past the viewport under the page header) */}
          <div className="lab-tutor-actions lab-tutor-actions-top">
            <div className="lab-ask">
              <input
                className="deck-input lab-ask-input"
                value={draft}
                placeholder="ask the tutor…"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ask()}
              />
              <button className="deck-btn deck-btn-primary lab-ask-send" onClick={ask} disabled={busy || !draft.trim()}>
                ask
              </button>
            </div>
            <button className="lab-hint-btn deck-mono" onClick={nudge} disabled={!moreHints}>
              {moreHints ? (
                <>
                  {ladder[rung].label} <span className="lab-hint-cost">✦ 1</span>
                </>
              ) : (
                "no more hints — you've got this"
              )}
            </button>
          </div>

          <div className="lab-tutor-log" ref={scrollRef}>
            {msgs.length === 0 && (
              <div className="lab-tutor-seed">
                <p className="rich-p" style={{ fontSize: 13.5 }}>
                  You&apos;re on <em>{task.title}</em>. Ask anything, or climb the hint ladder one rung at a time. I
                  won&apos;t hand you the answer.
                </p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`lab-bubble lab-bubble-${m.role}`}>
                {m.cost && (
                  <span className="lab-bubble-cost deck-mono" aria-hidden>
                    ✦ hint
                  </span>
                )}
                <div className="lab-bubble-text">{renderInline(m.text)}</div>
              </div>
            ))}
            {busy && <div className="lab-tutor-typing deck-mono">thinking…</div>}
          </div>
        </>
      )}
    </div>
  );
}
