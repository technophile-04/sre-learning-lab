"use client";

// The v2 card faces. Same content and grading as the original deck, with the
// presentation changes the screenshots argued for:
//   · the kicker is a type ICON + a plain English label (Idea / Code / Your turn
//     / Think / Try it / Ship it / Recap) — no Sanskrit tier-2 word, no big
//     watermark glyph, and the title is shown once.
//   · GOTCHA cards (reentrancy, late money, double-funding) wear an amber warning
//     frame so the Ethereum traps don't read as ordinary concept cards.
//   · YOUR TURN / THINK cards expose a "stuck? ask Boots" button that hands the
//     current task to the right-column tutor (try-first; it won't paste answers).
//   · the reentrancy gotcha card mounts the run-the-bug demo (ReentrancyLab).
import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "../../crowdfunding/_components/CodeBlock";
import { CodeInput } from "../../crowdfunding/_components/CodeInput";
import type { Deployment, Snapshot } from "../../crowdfunding/_components/useChainRuntime";
import { ReentrancyLab } from "./ReentrancyLab";
import { REENTRANCY_DEMO_ID, cardMeta } from "./card-icons";
import { useTutorBus } from "./tutor-bus";
import { isComplete } from "~~/lib/deck/crowdfunding-contracts";
import type {
  Card,
  CodeCard,
  ConceptCard,
  RecapCard,
  ShipItCard,
  ThinkCard,
  TryItCard,
  YourTurnCard,
} from "~~/lib/deck/types";
import { type Verdict, useDeckStore } from "~~/services/store/deck-store";

type Chain = {
  deployment: Deployment | null;
  snapshot: Snapshot | null;
  busy: boolean;
  error: string | null;
  ensureDeployed: (s: Record<string, string>) => Promise<Deployment>;
  refresh: () => Promise<void>;
  contribute: (eth: string) => Promise<void>;
  advanceTime: () => Promise<void>;
  execute: () => Promise<void>;
  withdraw: () => Promise<void>;
  fmt: (v: bigint) => string;
};

// ── rich text (tiny markdown) ─────────────────────────────────────────────────
function renderInline(s: string) {
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
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i} className="rich-p">
          {renderInline(p)}
        </p>
      ))}
    </>
  );
}

// ── frame shared by every card ───────────────────────────────────────────────
function CardFrame({ card, children }: { card: Card; children: React.ReactNode }) {
  const meta = cardMeta(card);
  const Icon = meta.Icon;
  return (
    <div className={`deck-card deck-card-enter ${meta.gotcha ? "card-gotcha" : ""}`}>
      <div style={{ position: "relative", padding: "30px 38px 36px", minHeight: 288 }}>
        <div className="rise v2-kicker" style={{ animationDelay: "40ms" }}>
          <span className={`v2-kicker-icon ${meta.gotcha ? "v2-kicker-icon-gotcha" : ""}`} aria-hidden>
            <Icon size={15} />
          </span>
          <span className={`v2-kicker-label deck-mono ${meta.gotcha ? "v2-kicker-label-gotcha" : ""}`}>
            {meta.label}
          </span>
        </div>
        <h2
          className="deck-display rise"
          style={{
            animationDelay: "100ms",
            fontSize: 34,
            lineHeight: 1.08,
            margin: "10px 0 20px",
            color: "var(--ink)",
          }}
        >
          {card.title}
        </h2>
        <div className="rise" style={{ animationDelay: "160ms" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// "stuck? ask the tutor" — registers this card's task with the right-column tutor
// and opens it. Try-first: the tutor itself stays gated until the learner attempts.
function AskTutor({ attempted }: { attempted: boolean }) {
  const bus = useTutorBus();
  return (
    <button type="button" className="v2-ask-boots deck-mono" onClick={() => bus.open("tutor")}>
      <span aria-hidden>☞</span> {attempted ? "ask the tutor" : "stuck? ask the tutor"}
    </button>
  );
}

// ── grading hook ─────────────────────────────────────────────────────────────
function useGrade() {
  const [grading, setGrading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const grade = async (payload: Record<string, unknown>): Promise<{ verdict: Verdict; feedback: string } | null> => {
    setGrading(true);
    setErr(null);
    try {
      const r = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error ?? "grading failed");
      return data as { verdict: Verdict; feedback: string };
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      setGrading(false);
    }
  };
  return { grade, grading, err };
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
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

// ── concept ───────────────────────────────────────────────────────────────────
function Concept({ card }: { card: ConceptCard }) {
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  return (
    <CardFrame card={card}>
      <div className="rich-body">
        <Rich text={card.body} />
      </div>
      {card.id === REENTRANCY_DEMO_ID && (
        <div className="v2-demo-mount">
          <div className="v2-demo-label deck-mono">see it happen</div>
          <ReentrancyLab />
        </div>
      )}
    </CardFrame>
  );
}

// ── code ────────────────────────────────────────────────────────────────────
// A CODE card recaps a piece you just wrote. The contract already lives in the
// BUILDING panel, so on wide screens we don't repeat it here — we lead with the
// explanation and let the panel highlight the region (see focusForCard in DeckV3).
// When the panel is hidden (narrow screens) the inline code block is the fallback.
function Code({ card }: { card: CodeCard }) {
  const sources = useDeckStore(s => s.sources);
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  return (
    <CardFrame card={card}>
      <div className="rich-body">
        <Rich text={card.note} />
      </div>
      {/* a quiet line pointing to the contract panel (which already has the region
          highlighted); clicking it re-pulses the panel glow */}
      <button type="button" className="v2-code-note deck-mono" onClick={() => bus.open("build")}>
        <span className="v2-code-note-arrow" aria-hidden>
          ↳
        </span>
        highlighted in <span className="v2-code-note-file">{card.file}</span>
      </button>
      <div className="v2-code-inline">
        <CodeBlock source={sources[card.file]} fromAnchor={card.fromAnchor} toAnchor={card.toAnchor} />
      </div>
    </CardFrame>
  );
}

// ── your turn ─────────────────────────────────────────────────────────────────
function YourTurn({ card }: { card: YourTurnCard }) {
  const sources = useDeckStore(s => s.sources);
  const progress = useDeckStore(s => s.progress[card.id]);
  const explainKey = `${card.id}__explain`;
  const explainProgress = useDeckStore(s => s.progress[explainKey]);
  const completeYourTurn = useDeckStore(s => s.completeYourTurn);
  const recordThink = useDeckStore(s => s.recordThink);
  const { grade, grading, err } = useGrade();
  const [draft, setDraft] = useState(progress?.answer ?? card.placeholder);
  const [result, setResult] = useState(progress ? { verdict: progress.verdict!, feedback: progress.feedback! } : null);
  const [explainDraft, setExplainDraft] = useState(explainProgress?.answer ?? "");
  const [explainResult, setExplainResult] = useState(
    explainProgress ? { verdict: explainProgress.verdict!, feedback: explainProgress.feedback! } : null,
  );

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const attempted = !!result || draft.trim() !== card.placeholder.trim();

  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask({
      kind: "your-turn",
      title: card.title,
      prompt: card.prompt,
      placeholder: card.placeholder,
      canonical: card.canonical,
      getLearnerCode: () => draftRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  useEffect(() => {
    bus.setAttempted(attempted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempted]);

  async function submit() {
    const g = await grade({
      mode: "your-turn",
      prompt: card.prompt,
      canonical: card.canonical,
      answer: draft,
      file: card.file,
    });
    if (g) {
      setResult(g);
      completeYourTurn({
        cardId: card.id,
        file: card.file,
        slot: card.slot,
        learnerLine: draft,
        canonical: card.canonical,
        verdict: g.verdict,
        feedback: g.feedback,
      });
      // snap to the building panel so the learner watches their piece ink into the
      // contract instead of having to go find it
      bus.open("build");
    }
    if (card.explain && explainDraft.trim()) {
      const ge = await grade({
        mode: "think",
        question: card.explain.prompt,
        rubricConcepts: card.explain.rubricConcepts,
        hint: "",
        answer: explainDraft,
      });
      if (ge) {
        setExplainResult(ge);
        recordThink(explainKey, explainDraft, ge.verdict, ge.feedback);
      }
    }
  }

  return (
    <CardFrame card={card}>
      <p className="rich-p" style={{ marginTop: -4, marginBottom: 16 }}>
        {renderInline(card.prompt)}
      </p>
      {!card.explain && <CodeBlock source={sources[card.file]} fromAnchor={`/*${card.slot}*/`} />}
      <CodeInput value={draft} onChange={setDraft} />
      {card.explain && (
        <>
          <p className="rich-p" style={{ marginTop: 16, marginBottom: 6, fontSize: 14 }}>
            {renderInline(card.explain.prompt)}
          </p>
          <textarea
            className="deck-input"
            spellCheck
            rows={2}
            value={explainDraft}
            placeholder="in your own words…"
            onChange={e => setExplainDraft(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderLeftColor: "var(--saffron)",
              fontFamily: "var(--font-body)",
            }}
          />
        </>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        <button className="deck-btn deck-btn-primary" onClick={submit} disabled={grading || !draft.trim()}>
          {grading ? "checking…" : result ? "check again" : card.explain ? "check my work" : "check my line"}
        </button>
        <AskTutor attempted={attempted} />
        {result && <VerdictChip verdict={result.verdict} />}
        {result && result.verdict !== "pass" && (
          <span className="deck-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
            the correct line was kept so you can keep going
          </span>
        )}
      </div>
      {result && (
        <p className="rich-p" style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14 }}>
          {result.feedback}
        </p>
      )}
      {explainResult && (
        <p className="rich-p" style={{ marginTop: 6, color: "var(--ink-soft)", fontSize: 14 }}>
          <span className="deck-mono" style={{ fontSize: 10, letterSpacing: "0.12em", marginRight: 8 }}>
            on your reasoning
          </span>
          {explainResult.feedback}
        </p>
      )}
      {err && (
        <p className="deck-mono" style={{ marginTop: 10, fontSize: 11, color: "var(--gotcha-deep)" }}>
          grader unreachable — is OPENROUTER_API_KEY set?
        </p>
      )}
    </CardFrame>
  );
}

// ── think ─────────────────────────────────────────────────────────────────────
function Think({ card }: { card: ThinkCard }) {
  const progress = useDeckStore(s => s.progress[card.id]);
  const recordThink = useDeckStore(s => s.recordThink);
  const { grade, grading, err } = useGrade();
  const [draft, setDraft] = useState(progress?.answer ?? "");
  const [result, setResult] = useState(progress ? { verdict: progress.verdict!, feedback: progress.feedback! } : null);
  const [showHint, setShowHint] = useState(false);

  const attempted = !!result || draft.trim().length > 0;
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask({
      kind: "think",
      title: card.title,
      prompt: card.question,
      hint: card.hint,
      concepts: card.rubricConcepts,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  useEffect(() => {
    bus.setAttempted(attempted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempted]);

  async function submit() {
    const g = await grade({
      mode: "think",
      question: card.question,
      rubricConcepts: card.rubricConcepts,
      hint: card.hint,
      answer: draft,
    });
    if (!g) return;
    setResult(g);
    recordThink(card.id, draft, g.verdict, g.feedback);
  }

  return (
    <CardFrame card={card}>
      <p className="deck-display" style={{ fontSize: 22, lineHeight: 1.35, color: "var(--ink)", marginBottom: 18 }}>
        {card.question}
      </p>
      <textarea
        className="deck-input"
        spellCheck
        rows={4}
        value={draft}
        placeholder="think it through in your own words…"
        onChange={e => setDraft(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderLeftColor: "var(--saffron)",
          fontFamily: "var(--font-body)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        <button className="deck-btn deck-btn-primary" onClick={submit} disabled={grading || !draft.trim()}>
          {grading ? "reading…" : result ? "answer again" : "submit"}
        </button>
        <button
          className="deck-mono"
          onClick={() => setShowHint(h => !h)}
          style={{ fontSize: 11, color: "var(--ink-soft)", background: "none" }}
        >
          {showHint ? "hide hint" : "hint"}
        </button>
        <AskTutor attempted={attempted} />
        {result && <VerdictChip verdict={result.verdict} />}
      </div>
      {showHint && (
        <p className="rich-p" style={{ marginTop: 12, fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>
          {card.hint}
        </p>
      )}
      {result && (
        <p className="rich-p" style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14 }}>
          {result.feedback}
        </p>
      )}
      {err && (
        <p className="deck-mono" style={{ marginTop: 10, fontSize: 11, color: "var(--gotcha-deep)" }}>
          grader unreachable — is OPENROUTER_API_KEY set?
        </p>
      )}
    </CardFrame>
  );
}

// ── shared campaign read-out ─────────────────────────────────────────────────
function Ledger({ chain }: { chain: Chain }) {
  const s = chain.snapshot;
  if (!s) return null;
  const round = (v: bigint) => Number(chain.fmt(v)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const Row = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: "1px solid var(--rule-soft)",
      }}
    >
      <span className="deck-mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span className="deck-mono num-pulse" key={value} style={{ fontSize: 13, color: "var(--ink)" }}>
        {value} <span style={{ color: "var(--ink-faint)" }}>{unit}</span>
      </span>
    </div>
  );
  const status = s.completed
    ? "funded ✓"
    : s.openToWithdraw
      ? "failed · refunds open"
      : Number(s.timeLeft) > 0
        ? "funding"
        : "deadline reached";
  return (
    <div
      className="v3-ledger"
      style={{
        marginTop: 18,
        border: "1px solid var(--rule)",
        borderRadius: 8,
        padding: "6px 16px",
      }}
    >
      <Row label="your contribution" value={round(s.learnerContribution)} unit="ETH" />
      <Row label="your wallet" value={round(s.learnerEth)} unit="ETH" />
      <Row label="contract holds" value={round(s.contractEth)} unit="ETH" />
      <Row label="time left" value={s.timeLeft.toString()} unit="s" />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}>
        <span className="deck-mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.04em" }}>
          status
        </span>
        <span
          className="deck-mono"
          key={status}
          style={{ fontSize: 12, color: s.completed ? "var(--teal)" : "var(--saffron-deep)" }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

const SLOT_CARD: Record<string, string> = {
  __CONTRIBUTE__: "Write contribute()",
  __WITHDRAW__: "Write withdraw()",
  __EXECUTE__: "Write execute()",
  __DEADLINE_THRESHOLD__: "Set the deadline and the goal",
};
export const SCENARIO_DEPS: Record<string, string[]> = {
  contribute: ["__CONTRIBUTE__"],
  "failure-refund": ["__CONTRIBUTE__", "__EXECUTE__", "__WITHDRAW__"],
  "success-forward": ["__CONTRIBUTE__", "__EXECUTE__"],
};

// ── try it ────────────────────────────────────────────────────────────────────
function TryIt({ card, chain }: { card: TryItCard; chain: Chain }) {
  const sources = useDeckStore(s => s.sources) as Record<string, string>;
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  const crowd = sources["CrowdFund.sol"];
  const missing = SCENARIO_DEPS[card.scenario].filter(slot => crowd.includes(`/*${slot}*/`));
  const ready = missing.length === 0;
  const defaultAmount = card.scenario === "success-forward" ? "1.5" : "0.5";
  const [eth, setEth] = useState(defaultAmount);
  const setupRef = useRef(false);

  useEffect(() => {
    if (!ready || setupRef.current) return;
    setupRef.current = true;
    chain.ensureDeployed(sources).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return (
      <CardFrame card={card}>
        <p className="rich-p" style={{ color: "var(--ink-soft)" }}>
          This runs against the code you write. Finish{" "}
          {missing.map((slot, i) => (
            <span key={slot}>
              {i > 0 && (i === missing.length - 1 ? " and " : ", ")}
              <strong>{SLOT_CARD[slot]}</strong>
            </span>
          ))}{" "}
          first, then come back.
        </p>
      </CardFrame>
    );
  }

  const Step = ({
    n,
    label,
    onClick,
    primary,
  }: {
    n: number;
    label: string;
    onClick: () => void;
    primary?: boolean;
  }) => (
    <button
      className={`deck-btn ${primary ? "deck-btn-primary" : "deck-btn-ghost"}`}
      disabled={chain.busy || !chain.deployment}
      onClick={onClick}
      style={primary ? {} : { color: "var(--ink)", borderColor: "var(--rule)" }}
    >
      {n} · {label}
    </button>
  );

  return (
    <CardFrame card={card}>
      <p className="rich-p" style={{ marginTop: -4 }}>
        {renderInline(card.body)}
      </p>
      {!chain.deployment ? (
        <p className="deck-mono" style={{ marginTop: 16, fontSize: 12, color: "var(--ink-soft)" }}>
          deploying your contract to the in-browser chain…
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <span className="deck-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            contribute
          </span>
          <input
            className="deck-input"
            value={eth}
            onChange={e => setEth(e.target.value)}
            style={{ width: 64, padding: "6px 8px", textAlign: "center" }}
          />
          <span className="deck-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            ETH
          </span>
          {card.scenario === "contribute" ? (
            <button className="deck-btn deck-btn-primary" disabled={chain.busy} onClick={() => chain.contribute(eth)}>
              {chain.busy ? "sending…" : "contribute"}
            </button>
          ) : (
            <>
              <Step n={1} label="contribute" onClick={() => chain.contribute(eth)} />
              <Step n={2} label="let the deadline pass" onClick={() => chain.advanceTime()} />
              <Step n={3} label="execute" onClick={() => chain.execute()} primary />
              {card.scenario === "failure-refund" && (
                <Step n={4} label="withdraw" onClick={() => chain.withdraw()} primary />
              )}
            </>
          )}
        </div>
      )}
      <Ledger chain={chain} />
      {chain.error && (
        <p className="deck-mono" style={{ marginTop: 12, fontSize: 11.5, color: "var(--gotcha-deep)" }}>
          reverted: {chain.error}
        </p>
      )}
    </CardFrame>
  );
}

// ── ship it ───────────────────────────────────────────────────────────────────
function ShipIt({ card, chain }: { card: ShipItCard; chain: Chain }) {
  const sources = useDeckStore(s => s.sources);
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  const remaining = !isComplete(sources["CrowdFund.sol"]);

  return (
    <CardFrame card={card}>
      <p className="rich-p" style={{ marginTop: -4 }}>
        {renderInline(card.body)}
      </p>
      {remaining ? (
        <p className="rich-p" style={{ color: "var(--ink-soft)", marginTop: 16 }}>
          A few blanks are still empty — finish the YOUR TURN cards and the finished contract will deploy here.
        </p>
      ) : !chain.deployment ? (
        <div style={{ marginTop: 18 }}>
          <button
            className="deck-btn deck-btn-primary"
            style={{ fontSize: 14, padding: "12px 24px" }}
            disabled={chain.busy}
            onClick={() => chain.ensureDeployed(sources).catch(() => {})}
          >
            {chain.busy ? "deploying…" : "deploy the contract →"}
          </button>
          {chain.error && (
            <p className="deck-mono" style={{ marginTop: 12, fontSize: 11.5, color: "var(--gotcha-deep)" }}>
              {chain.error}
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <Addr label="CrowdFund" addr={chain.deployment.crowdFundAddress} />
            <Addr label="Recipient" addr={chain.deployment.recipientAddress} />
          </div>
          <Ledger chain={chain} />
        </div>
      )}
    </CardFrame>
  );
}

function Addr({ label, addr }: { label: string; addr: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span className="deck-mono" style={{ fontSize: 12, color: "var(--saffron-deep)" }}>
        {label}
      </span>
      <span className="deck-mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
        {addr.slice(0, 10)}…{addr.slice(-8)}
      </span>
    </div>
  );
}

// ── recap ─────────────────────────────────────────────────────────────────────
function Recap({ card }: { card: RecapCard }) {
  const sources = useDeckStore(s => s.sources);
  const bus = useTutorBus();
  useEffect(() => {
    bus.setTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);
  return (
    <CardFrame card={card}>
      <p className="rich-p" style={{ marginTop: -4, marginBottom: 18 }}>
        {renderInline(card.body)}
      </p>
      <div style={{ marginBottom: 16 }}>
        <div className="deck-mono" style={{ fontSize: 11, color: "var(--saffron-deep)", marginBottom: 6 }}>
          CrowdFund.sol
        </div>
        <CodeBlock source={sources["CrowdFund.sol"]} hand={false} />
      </div>
    </CardFrame>
  );
}

export function CardRendererV3({ card, chain }: { card: Card; chain: Chain }) {
  switch (card.type) {
    case "concept":
      return <Concept card={card} />;
    case "code":
      return <Code card={card} />;
    case "your-turn":
      return <YourTurn card={card} />;
    case "think":
      return <Think card={card} />;
    case "try-it":
      return <TryIt card={card} chain={chain} />;
    case "ship-it":
      return <ShipIt card={card} chain={chain} />;
    case "recap":
      return <Recap card={card} />;
  }
}
