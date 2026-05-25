"use client";

// atlas — the frontispiece plate. The "zoom out" view of the entire crowdfunding
// decomposition: the five concept atoms the deck at /scenes/crowdfunding teaches,
// laid out as a single study spread.
//
// Rendered as a scholar's loose-leaf spread on a dark indigo desk (the "Indigo
// Study Deck" world the flashcard deck lives in), NOT a webapp screen: bone study
// cards with physical weight, a hand-drawn saffron thread linking them in reading
// order, italic editorial fragments in paper-halo gaps, JetBrains-Mono roman
// numerals as marginalia, and a faint Devanagari watermark per card (सूत्र, the
// deck's "concept" glyph) so the home plate and the deck are one visual world.
//
// Topology: five crowdfunding atoms derived 1:1 from the deck's type:"concept"
// cards / CrowdFund.sol — trustless funding → tracking contributions → taking the
// money in (contribute) → sending ETH safely (withdraw/refund) → the state machine
// (deadline/threshold/execute). Only the first atom is `available` (the door into
// the deck); the other four are a visible-but-locked journey map. There is no
// synthesis destination — crowdfunding is the deliberate gentle on-ramp.
//
// React Flow notes: the graph is React Flow, but the *atoms* stay curated — React
// Flow lays out the edges, not the nodes (the old design note's "computed
// positions read as generic" call is honoured). Every default React Flow surface
// (controls, minimap, dotted background, node chrome, handles, selection) is
// suppressed so this reads as a study spread, not a flowchart tool.
import { createContext, useContext, useMemo, useState } from "react";
import { Hanken_Grotesk, Instrument_Serif, JetBrains_Mono, Noto_Serif_Devanagari } from "next/font/google";
import Link from "next/link";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  Handle,
  type NodeProps,
  Position,
  type Edge as RFEdge,
  type Node as RFNode,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Indigo Study Deck type system — matches /scenes/crowdfunding/_components/fonts.ts
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  variable: "--font-deva",
});

type AtomStatus = "completed" | "available" | "locked";
type AtomTier = "explain" | "justify" | "apply";

type Atom = {
  id: string;
  roman: string;
  label: string;
  caption: string;
  x: number;
  y: number;
  status: AtomStatus;
  /** depth tier — explain → justify → apply (Jeffrey Scholz). Carried in data so
   *  the renderer can reflect it; v0.5 keeps the visual treatment minimal. */
  tier: AtomTier;
  href: string;
};

// the five crowdfunding atoms, in reading order — derived from the deck's
// type:"concept" cards. Positions are curated (a gentle descending diagonal so
// the five cards read as a hand-laid spread, never a rigid row).
const ATOMS: Atom[] = [
  {
    id: "trustless",
    roman: "i.",
    label: "trustless funding",
    caption: "strangers pool money toward a goal, trusting only the code.",
    x: 250,
    y: 150,
    status: "available",
    tier: "explain",
    href: "/scenes/crowdfunding",
  },
  {
    id: "contributions",
    roman: "ii.",
    label: "tracking contributions",
    caption: "the contract remembers every address and what it gave.",
    x: 620,
    y: 280,
    status: "locked",
    tier: "explain",
    href: "#",
  },
  {
    id: "taking-money",
    roman: "iii.",
    label: "taking the money in",
    caption: "contribute() is payable — eth rides in with the call.",
    x: 980,
    y: 175,
    status: "locked",
    tier: "explain",
    href: "#",
  },
  {
    id: "sending-eth",
    roman: "iv.",
    label: "sending eth safely",
    caption: "refund on failure — empty the balance before you pay out.",
    x: 410,
    y: 500,
    status: "locked",
    tier: "justify",
    href: "#",
  },
  {
    id: "state-machine",
    roman: "v.",
    label: "the state machine",
    caption: "a deadline and a goal decide: execute, or refund.",
    x: 850,
    y: 545,
    status: "locked",
    tier: "apply",
    href: "#",
  },
];

type AtlasEdge = {
  from: string;
  to: string;
  /** sequence-appropriate editorial fragment shown in a paper-halo gap. */
  label: string;
  /** perpendicular curve control — the designer's bow, kept in data the same
   *  way curated node positions are. Positive bows one way, negative the other. */
  bend?: number;
  /** nudge the label off the line so it doesn't collide with markers/captions. */
  labelOffset?: { dx: number; dy: number };
};

// a single flowing path i → ii → iii → iv → v. The deck is sequential, so the
// thread is sequential — no branching, no destination.
const EDGES: AtlasEdge[] = [
  {
    from: "trustless",
    to: "contributions",
    label: "first —",
    bend: 26,
    labelOffset: { dx: 0, dy: -14 },
  },
  {
    from: "contributions",
    to: "taking-money",
    label: "then —",
    bend: 26,
    labelOffset: { dx: 0, dy: -14 },
  },
  {
    from: "taking-money",
    to: "sending-eth",
    label: "but if it fails —",
    bend: -52,
    labelOffset: { dx: 30, dy: 0 },
  },
  {
    from: "sending-eth",
    to: "state-machine",
    label: "so, the clock —",
    bend: 22,
    labelOffset: { dx: 0, dy: 16 },
  },
];

// ── shared hover state ────────────────────────────────────────────────────
// One source of truth for "what is the cursor near", consumed by both the
// nodes (lit name) and the edges (lit thread). Context keeps the React Flow
// nodes/edges arrays stable instead of rebuilding them on every hover.
const HoverContext = createContext<{
  hoveredId: string | null;
  setHovered: (id: string | null) => void;
}>({ hoveredId: null, setHovered: () => {} });

// node card dimensions — fixed so React Flow's measurement is stable and the
// curated coordinate can be mapped to the *card centre* (not the box corner).
const CARD_W = 248;
const CARD_H = 150;

// ── atom card ─────────────────────────────────────────────────────────────
// A bone study card with physical weight: roman-numeral tab, label, caption,
// a faint Devanagari watermark bleeding off the corner (matching the deck), and
// — when locked — a small wax-seal marker. The handle is pinned to the card's
// centre, so React Flow attaches the thread at the curated coordinate exactly.
function AtomNode({ data }: NodeProps<RFNode<{ atom: Atom }>>) {
  const { atom } = data;
  const { hoveredId, setHovered } = useContext(HoverContext);
  const locked = atom.status === "locked";
  const available = atom.status === "available";

  const body = (
    <div
      className={`atom-card ${locked ? "locked" : ""} ${available ? "available" : ""}`}
      style={{ width: CARD_W, minHeight: CARD_H }}
      onMouseEnter={() => setHovered(atom.id)}
      onMouseLeave={() => setHovered(null)}
    >
      {/* the giant concept-glyph watermark — सूत्र (sutra), the deck's "idea" card */}
      <span className="atom-watermark" aria-hidden>
        सूत्र
      </span>

      <div className="atom-head">
        <span className="atom-roman">{atom.roman}</span>
        {available ? (
          <span className="atom-status atom-status-open">enter ☞</span>
        ) : (
          <span className="atom-status atom-status-locked">locked</span>
        )}
      </div>

      <div className="atom-body">
        <div className={`atom-name ${hoveredId === atom.id ? "lit" : ""}`}>{atom.label}</div>
        <div className="atom-caption">{atom.caption}</div>
      </div>

      <div className="atom-foot">
        <span className="atom-tier">{atom.tier}</span>
        {locked && <span className="atom-foot-note">section in the deck</span>}
      </div>

      {/* handles — never user-visible. Pinned to the card centre so the thread
          attaches at the curated coordinate; trimmed back to the card edge in
          PlateEdge so it kisses the card instead of stabbing through it. */}
      <Handle
        id="c"
        type="source"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: "50%", left: "50%" }}
      />
      <Handle
        id="c"
        type="target"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: "50%", left: "50%" }}
      />
    </div>
  );

  return locked ? (
    <div className="atlas-link locked">{body}</div>
  ) : (
    <Link href={atom.href} className="atlas-link" draggable={false}>
      {body}
    </Link>
  );
}

// ── plate edge ────────────────────────────────────────────────────────────
// A hand-drawn saffron thread. React Flow gives us the marker centres; we trim
// each end back to the card edge, bow the line with the data's `bend`, and drop
// a small italic editorial fragment in a paper-halo gap mid-thread.
function PlateEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<RFEdge<{ edge: AtlasEdge }>>) {
  const { hoveredId } = useContext(HoverContext);
  const e = data!.edge;
  const lit = hoveredId === e.from || hoveredId === e.to;

  // direction from source centre to target centre
  const vx = targetX - sourceX;
  const vy = targetY - sourceY;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;

  // pull both ends back to the card edge (half-extents projected onto the line)
  const gapFor = (dirx: number, diry: number) => {
    const hx = CARD_W / 2 + 10;
    const hy = CARD_H / 2 + 10;
    const tx = hx / (Math.abs(dirx) || 1e-6);
    const ty = hy / (Math.abs(diry) || 1e-6);
    return Math.min(tx, ty);
  };
  const startGap = gapFor(ux, uy);
  const endGap = gapFor(ux, uy) + 6;
  const sx = sourceX + ux * startGap;
  const sy = sourceY + uy * startGap;
  const ex = targetX - ux * endGap;
  const ey = targetY - uy * endGap;

  // perpendicular bow — the designer's curve control, from data
  const bend = e.bend ?? 0;
  const px = -uy;
  const py = ux;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const cx = mx + px * bend;
  const cy = my + py * bend;

  const path = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;

  // point on the quadratic at t=0.5, then nudged by the data label offset
  const off = e.labelOffset ?? { dx: 0, dy: 0 };
  const labelX = 0.25 * sx + 0.5 * cx + 0.25 * ex + off.dx;
  const labelY = 0.25 * sy + 0.5 * cy + 0.25 * ey + off.dy;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={lit ? "url(#thread-tip-lit)" : "url(#thread-tip)"}
        style={{
          stroke: lit ? "var(--saffron)" : "var(--saffron-deep)",
          strokeWidth: lit ? 1.6 : 1.1,
          strokeDasharray: "1 7",
          strokeLinecap: "round",
          opacity: lit ? 1 : 0.72,
          transition: "stroke 220ms ease-out, stroke-width 220ms ease-out, opacity 220ms ease-out",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${lit ? "lit" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {e.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { atom: AtomNode };
const edgeTypes = { plate: PlateEdge };

function AtlasGraph() {
  const [hoveredId, setHovered] = useState<string | null>(null);

  const nodes: RFNode[] = useMemo(() => {
    // position is the box top-left; offset it so the card centre lands on the
    // curated coordinate.
    return ATOMS.map(atom => ({
      id: atom.id,
      type: "atom",
      position: { x: atom.x - CARD_W / 2, y: atom.y - CARD_H / 2 },
      data: { atom },
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
    }));
  }, []);

  const edges: RFEdge[] = useMemo(() => {
    return EDGES.map(edge => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      sourceHandle: "c",
      targetHandle: "c",
      type: "plate",
      data: { edge },
      selectable: false,
      deletable: false,
    }));
  }, []);

  return (
    <HoverContext.Provider value={{ hoveredId, setHovered }}>
      {/* thread-tip marker defs — a small saffron diamond at each landing */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
        <defs>
          <marker id="thread-tip" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <circle cx="4" cy="4" r="2.4" fill="var(--saffron-deep)" />
          </marker>
          <marker
            id="thread-tip-lit"
            viewBox="0 0 8 8"
            refX="4"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <circle cx="4" cy="4" r="2.8" fill="var(--saffron)" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      />
    </HoverContext.Provider>
  );
}

export default function AtlasPage() {
  return (
    <>
      <style>{`
        .atlas-page {
          --bg:           #16141d;
          --bg-2:         #1e1b27;
          --card:         #f5f0e4;
          --card-edge:    #e4dcc8;
          --ink:          #1a1822;
          --ink-soft:     #6f6a5b;
          --ink-faint:    #a49d8a;
          --saffron:      #e0913a;
          --saffron-deep: #c2761f;
          --saffron-wash: rgba(224, 145, 58, 0.10);
          --teal:         #4c9c8b;
          --teal-wash:    rgba(76, 156, 139, 0.12);
          --rule:         rgba(26, 24, 34, 0.12);
          --rule-soft:    rgba(26, 24, 34, 0.06);
        }
        .atlas-page { font-family: var(--font-body), system-ui, sans-serif; }
        .atlas-display { font-family: var(--font-display), Georgia, serif; }
        .mono { font-family: var(--font-mono), ui-monospace, monospace; font-feature-settings: "tnum" 1; }

        /* the indigo desk — radial saffron + teal washes, fine grain on top */
        .atlas-desk {
          background:
            radial-gradient(120% 80% at 18% -8%, rgba(224, 145, 58, 0.09), transparent 58%),
            radial-gradient(110% 70% at 85% 112%, rgba(76, 156, 139, 0.07), transparent 55%),
            var(--bg);
          color: var(--card);
        }
        .atlas-grain::after {
          content: "";
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          opacity: 0.5;
          background-image: radial-gradient(rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 3px 3px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .frontispiece-kicker { animation: fadeUp 0.7s 0.05s ease-out both; }
        .frontispiece-title  { animation: fadeUp 0.8s 0.14s ease-out both; }
        .frontispiece-sub    { animation: fadeUp 0.8s 0.26s ease-out both; }
        .plate-marginalia    { animation: fadeUp 0.7s 0.40s ease-out both; }
        .react-flow-wrap     { animation: fadeUp 0.9s 0.52s ease-out both; }
        .editors-note        { animation: fadeUp 0.7s 1.30s ease-out both; }

        /* ── React Flow de-chroming — kill every flowchart-tool tell ── */
        .atlas-page .react-flow,
        .atlas-page .react-flow__renderer,
        .atlas-page .react-flow__pane { background: transparent; cursor: default; }
        .atlas-page .react-flow__node:focus,
        .atlas-page .react-flow__node:focus-visible { outline: none; }
        .atlas-page .react-flow__edge { cursor: default; }
        .atlas-page .atlas-handle {
          opacity: 0; width: 1px; height: 1px; min-width: 0; min-height: 0;
          border: 0; background: transparent; pointer-events: none;
          left: 50%; top: 50%; transform: translate(-50%, -50%);
        }
        .atlas-page .react-flow__attribution { display: none; }
        /* React Flow clips node overflow by default — let the watermark bleed off */
        .atlas-page .react-flow__node { overflow: visible; }

        /* ── bone study cards on the desk ── */
        .atlas-page .atlas-link { text-decoration: none; color: inherit; display: block; }
        .atlas-page .atlas-link.locked { cursor: not-allowed; }

        .atom-card {
          position: relative;
          display: flex; flex-direction: column;
          padding: 16px 18px 14px;
          border-radius: 13px;
          background: var(--card);
          color: var(--ink);
          overflow: hidden;
          user-select: none;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.55) inset,
            0 34px 64px -38px rgba(0, 0, 0, 0.78),
            0 8px 22px -16px rgba(0, 0, 0, 0.55);
          transition:
            transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 260ms ease-out;
        }
        /* available card: a thin teal edge + a faint teal aura — the only door */
        .atom-card.available {
          box-shadow:
            0 0 0 1px var(--teal) inset,
            0 1px 0 rgba(255, 255, 255, 0.55) inset,
            0 0 0 5px var(--teal-wash),
            0 38px 70px -38px rgba(0, 0, 0, 0.8),
            0 8px 22px -16px rgba(0, 0, 0, 0.55);
        }
        .atlas-link:not(.locked):hover .atom-card {
          transform: translateY(-4px);
          box-shadow:
            0 0 0 1px var(--teal) inset,
            0 1px 0 rgba(255, 255, 255, 0.6) inset,
            0 0 0 6px var(--teal-wash),
            0 46px 84px -38px rgba(0, 0, 0, 0.82),
            0 10px 26px -16px rgba(0, 0, 0, 0.55);
        }
        /* locked cards sit quieter — desaturated bone, no aura */
        .atom-card.locked {
          background: var(--card-edge);
          opacity: 0.82;
          filter: saturate(0.85);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.4) inset,
            0 26px 50px -38px rgba(0, 0, 0, 0.7),
            0 6px 18px -16px rgba(0, 0, 0, 0.5);
        }

        /* the giant concept-glyph watermark, bleeding off the corner */
        .atom-watermark {
          position: absolute; right: -0.16em; bottom: -0.40em;
          font-family: var(--font-deva), serif; font-weight: 500;
          font-size: 78px; line-height: 0.8;
          color: var(--ink); opacity: 0.045;
          pointer-events: none; user-select: none; white-space: nowrap;
        }

        .atom-head {
          position: relative; z-index: 1;
          display: flex; align-items: baseline; justify-content: space-between;
        }
        .atom-roman {
          font-family: var(--font-mono), monospace;
          font-size: 11px; font-weight: 500; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--saffron-deep);
        }
        .atom-status {
          font-family: var(--font-mono), monospace;
          font-size: 9px; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .atom-status-open { color: var(--teal); }
        .atom-status-locked { color: var(--ink-faint); }

        .atom-body { position: relative; z-index: 1; margin-top: 14px; flex: 1; }
        .atom-name {
          font-family: var(--font-display), Georgia, serif;
          font-size: 25px; line-height: 1.05; color: var(--ink);
          letter-spacing: -0.01em;
          transition: color 180ms ease-out;
        }
        .atom-name.lit { color: var(--saffron-deep); }
        .atom-card.available .atom-name.lit { color: var(--teal); }
        .atom-caption {
          margin-top: 8px;
          font-size: 12.5px; line-height: 1.5; color: var(--ink-soft);
        }

        .atom-foot {
          position: relative; z-index: 1; margin-top: 14px;
          display: flex; align-items: center; gap: 10px;
          border-top: 1px solid var(--rule); padding-top: 9px;
        }
        .atom-tier {
          font-family: var(--font-mono), monospace;
          font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase;
          color: var(--saffron-deep);
          background: var(--saffron-wash);
          padding: 2px 7px; border-radius: 999px;
        }
        .atom-card.available .atom-tier { color: var(--teal); background: var(--teal-wash); }
        .atom-foot-note {
          font-family: var(--font-mono), monospace;
          font-size: 9px; letter-spacing: 0.1em; color: var(--ink-faint);
        }

        /* ── edge labels — italic fragment with a desk-coloured knockout halo ── */
        .atlas-page .edge-label {
          position: absolute; pointer-events: none;
          font-family: var(--font-display), Georgia, serif; font-style: italic;
          font-size: 14px; color: var(--saffron);
          text-shadow:
            0 0 6px var(--bg), 0 0 5px var(--bg),
            0 0 4px var(--bg), 0 0 3px var(--bg),
            0 0 2px var(--bg);
          transition: color 220ms ease-out;
        }
        .atlas-page .edge-label.lit { color: #f3b266; }
      `}</style>

      <main
        className={`atlas-page atlas-desk atlas-grain min-h-screen ${display.variable} ${body.variable} ${mono.variable} ${devanagari.variable}`}
      >
        {/* ── frontispiece header ───────────────────────────────────────── */}
        <header className="relative z-[1] mx-auto max-w-[1280px] px-10 pt-14 pb-4">
          <div className="flex items-baseline justify-between">
            <span
              className="mono frontispiece-kicker text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--saffron)" }}
            >
              an experimental edition · v0.5
            </span>
            <span
              className="mono frontispiece-kicker text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--ink-faint)" }}
            >
              learning with ai · scaffold-eth
            </span>
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <h1
              className="atlas-display frontispiece-title leading-[0.92]"
              style={{
                fontSize: "clamp(48px, 7vw, 92px)",
                fontStyle: "italic",
                letterSpacing: "-0.01em",
                color: "var(--card)",
              }}
            >
              atlas of crowdfunding
            </h1>
            <p
              className="frontispiece-sub mt-5 max-w-[62ch] text-[15px] leading-relaxed"
              style={{ color: "var(--ink-faint)" }}
            >
              <span className="atlas-display italic" style={{ color: "var(--saffron)" }}>
                ¶
              </span>{" "}
              one contract, taught in five moves — pool the money, remember who gave what, take it in, pay it back
              safely, and let a deadline decide. the whole journey lives in a single deck of cards; begin at{" "}
              <span style={{ color: "var(--teal)" }}>i. trustless funding</span> and the rest unfolds from there.
            </p>
          </div>
        </header>

        {/* ── plate ─────────────────────────────────────────────────────── */}
        <section className="relative z-[1] mx-auto max-w-[1280px] px-10 pb-10">
          <div className="relative plate-marginalia">
            <div
              className="absolute right-2 -top-6 mono text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--saffron)" }}
            >
              plate i.
            </div>
            <div
              className="absolute left-2 -top-6 mono text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--ink-faint)" }}
            >
              fig. ø — the journey
            </div>

            <div className="relative mx-auto" style={{ width: 1180, maxWidth: "100%", aspectRatio: "1180 / 720" }}>
              {/* the React Flow study spread */}
              <div className="react-flow-wrap absolute inset-0">
                <ReactFlowProvider>
                  <AtlasGraph />
                </ReactFlowProvider>
              </div>
            </div>
          </div>
        </section>

        {/* ── editor's note ─────────────────────────────────────────────── */}
        <section className="relative z-[1] mx-auto max-w-[1280px] px-10 pb-24">
          <div className="editors-note mx-auto max-w-[68ch]">
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.24em]" style={{ color: "var(--saffron)" }}>
              editor&apos;s note
            </div>
            <p className="atlas-display text-[17px] leading-[1.6] italic" style={{ color: "var(--ink-faint)" }}>
              The cards above are the five ideas a crowdfunding contract is built from, each small enough to sit with in
              one go. They aren&apos;t five separate lessons — they&apos;re sections of one deck, walked in order. The
              path between them is the order the code comes together: track first, then take money in, then make the
              refund safe, then let the clock decide.
              <br />
              <br />
              <span className="not-italic" style={{ color: "var(--card)", fontFamily: "var(--font-body)" }}>
                Begin with{" "}
                <Link
                  href="/scenes/crowdfunding"
                  style={{
                    color: "var(--teal)",
                    textDecoration: "underline",
                    textUnderlineOffset: 4,
                    textDecorationColor: "var(--teal-wash)",
                  }}
                >
                  i. trustless funding
                </Link>
                .
              </span>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
