"use client";

// atlas — the frontispiece plate. The "zoom out" view of the entire ERC-20 atom set.
//
// Rendered as a printed scholarly diagram, NOT a webapp screen: cream paper, ink,
// vermilion accent, italic edge labels ("extends", "implies", "leads to —"),
// Roman-numeral marginalia, and a destination node (Uniswap) styled as an
// illuminated drop-cap.
//
// v0.3 migration: the graph is now React Flow instead of a hand-drawn SVG. The
// topology (ATOMS/EDGES) was already clean data and is unchanged. What's gone is
// the hand-tuned per-edge Bezier math and the manual arrowhead trig — React Flow
// owns edge routing, attachment, and state-driven rendering now. Node positions
// stay curated (the old design note's "computed positions read as generic" call
// is honoured): React Flow lays out the *edges*, not the *atoms*. Every default
// React Flow surface (controls, minimap, dotted background, node chrome, handles,
// selection) is suppressed so this reads as a plate, not a flowchart tool.
import { createContext, useContext, useMemo, useState } from "react";
import { DM_Mono, Fraunces } from "next/font/google";
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

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-display",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
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
   *  the renderer can reflect it; v0.3 keeps the visual treatment minimal. */
  tier: AtomTier;
  href: string;
};

const ATOMS: Atom[] = [
  {
    id: "crowdfunding",
    roman: "i.",
    label: "crowdfunding",
    caption: "strangers pool money toward a goal, trusting only the code.",
    x: 240,
    y: 170,
    status: "available",
    tier: "explain",
    href: "/scenes/crowdfunding",
  },
  {
    id: "direct-authorization",
    roman: "ii.",
    label: "direct authorization",
    caption: "move tokens you own — and only those.",
    x: 560,
    y: 170,
    status: "available",
    tier: "explain",
    href: "/scenes/direct-authorization",
  },
  {
    id: "delegated-authorization",
    roman: "iii.",
    label: "delegated authorization",
    caption: "grant another address permission to spend.",
    x: 880,
    y: 170,
    status: "available",
    tier: "justify",
    href: "/scenes/delegated-authorization",
  },
  {
    id: "supply-management",
    roman: "iv.",
    label: "supply management",
    caption: "where tokens come from. where they go.",
    x: 320,
    y: 620,
    status: "locked",
    tier: "justify",
    href: "#",
  },
  {
    id: "audit-trail",
    roman: "v.",
    label: "audit trail",
    caption: "every move emits a log. the ledger remembers.",
    x: 680,
    y: 620,
    status: "locked",
    tier: "justify",
    href: "#",
  },
];

const SYNTHESIS = {
  id: "uniswap",
  letter: "U",
  label: "uniswap",
  caption: "a market made of these atoms.",
  x: 1140,
  y: 340,
};

type EdgeKind = "extends" | "implies" | "leads-to";

type AtlasEdge = {
  from: string;
  to: string;
  kind: EdgeKind;
  label: string;
  /** perpendicular curve control — the designer's bow, kept in data the same
   *  way curated node positions are. Positive bows one way, negative the other. */
  bend?: number;
  /** nudge the label off the line so it doesn't collide with markers/captions. */
  labelOffset?: { dx: number; dy: number };
};

const EDGES: AtlasEdge[] = [
  {
    from: "crowdfunding",
    to: "direct-authorization",
    kind: "extends",
    label: "extends",
    labelOffset: { dx: 0, dy: -16 },
  },
  {
    from: "direct-authorization",
    to: "delegated-authorization",
    kind: "extends",
    label: "extends",
    labelOffset: { dx: 0, dy: -16 },
  },
  {
    from: "crowdfunding",
    to: "supply-management",
    kind: "extends",
    label: "extends",
    bend: -8,
    labelOffset: { dx: -34, dy: 0 },
  },
  {
    from: "crowdfunding",
    to: "audit-trail",
    kind: "implies",
    label: "implies",
    bend: 18,
    labelOffset: { dx: -30, dy: -10 },
  },
  {
    from: "direct-authorization",
    to: "audit-trail",
    kind: "implies",
    label: "implies",
    bend: -14,
    labelOffset: { dx: 32, dy: 0 },
  },
  {
    from: "delegated-authorization",
    to: "uniswap",
    kind: "leads-to",
    label: "leads to —",
    bend: -44,
    labelOffset: { dx: 0, dy: -16 },
  },
];

// ── shared hover state ────────────────────────────────────────────────────
// One source of truth for "what is the cursor near", consumed by both the
// nodes (vermilion name) and the edges (lit line). Context keeps the React
// Flow nodes/edges arrays stable instead of rebuilding them on every hover.
const HoverContext = createContext<{
  hoveredId: string | null;
  setHovered: (id: string | null) => void;
}>({ hoveredId: null, setHovered: () => {} });

const ATOM_RADIUS = 28;
const SYNTHESIS_HALF = 52;
// node box dimensions — fixed so React Flow's measurement is stable and the
// curated coordinate can be mapped to the *marker centre* (not the box corner).
const ATOM_BOX_W = 240;
const SYN_BOX_W = 220;

// ── atom node ─────────────────────────────────────────────────────────────
// A real, measured box: marker on top in normal flow, caption beneath (so
// fitView accounts for it), roman numeral as absolute marginalia. The handle
// is pinned to the marker's centre — React Flow reads the handle's actual
// measured position, so edges attach at the curated coordinate exactly.
function AtomNode({ data }: NodeProps<RFNode<{ atom: Atom }>>) {
  const { atom } = data;
  const { hoveredId, setHovered } = useContext(HoverContext);
  const locked = atom.status === "locked";

  const body = (
    <div
      className={`atom-box ${locked ? "locked" : ""}`}
      style={{ width: ATOM_BOX_W }}
      onMouseEnter={() => setHovered(atom.id)}
      onMouseLeave={() => setHovered(null)}
    >
      <span className="atom-roman mono knockout">{atom.roman}</span>

      <div className="atom-marker" style={{ width: ATOM_RADIUS * 2, height: ATOM_RADIUS * 2 }}>
        <svg
          width={ATOM_RADIUS * 2}
          height={ATOM_RADIUS * 2}
          viewBox={`0 0 ${ATOM_RADIUS * 2} ${ATOM_RADIUS * 2}`}
          style={{ display: "block", overflow: "visible" }}
        >
          <circle
            cx={ATOM_RADIUS}
            cy={ATOM_RADIUS}
            r={ATOM_RADIUS - 2}
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth={atom.status === "completed" ? 1.4 : 1}
            strokeDasharray={locked ? "2 3" : undefined}
          />
          {atom.status === "completed" && (
            <g>
              <circle cx={ATOM_RADIUS} cy={ATOM_RADIUS} r="9" fill="var(--vermilion)" />
              <path
                d={`M ${ATOM_RADIUS - 4} ${ATOM_RADIUS} L ${ATOM_RADIUS + 4} ${ATOM_RADIUS} M ${ATOM_RADIUS} ${ATOM_RADIUS - 4} L ${ATOM_RADIUS} ${ATOM_RADIUS + 4}`}
                stroke="var(--paper)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
          )}
          {atom.status === "available" && <circle cx={ATOM_RADIUS} cy={ATOM_RADIUS} r="4" fill="var(--ink)" />}
        </svg>
      </div>

      <div className="atom-text">
        <div className={`atom-name knockout ${hoveredId === atom.id ? "lit" : ""}`}>{atom.label}</div>
        <div className="atom-caption mono knockout">{atom.caption}</div>
        {locked && <div className="atom-locked mono knockout">locked — completes after i</div>}
      </div>

      {/* handles — never user-visible. "c" sits on the marker centre (lateral
          edges). "s" sits below the whole card so downward edges leave from
          beneath the caption and stay in the clean inter-row gap. */}
      <Handle
        id="c"
        type="source"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: ATOM_RADIUS, left: "50%" }}
      />
      <Handle
        id="c"
        type="target"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: ATOM_RADIUS, left: "50%" }}
      />
      <Handle
        id="s"
        type="source"
        position={Position.Bottom}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: "100%", left: "50%" }}
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

// ── synthesis node — the U drop-cap monument ──────────────────────────────
function SynthesisNode() {
  return (
    <div className="syn-box" style={{ width: SYN_BOX_W }}>
      <div className="syn-frame" style={{ width: SYNTHESIS_HALF * 2, height: SYNTHESIS_HALF * 2 }}>
        <span className="syn-frame-outer" />
        <span className="syn-letter">U</span>
      </div>
      <div className="syn-text">
        <div className="syn-kicker mono knockout">DESTINATION</div>
        <div className="syn-name knockout">{SYNTHESIS.label}</div>
        <div className="syn-caption knockout">{SYNTHESIS.caption}</div>
      </div>
      <Handle
        id="c"
        type="target"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: SYNTHESIS_HALF, left: "50%" }}
      />
      <Handle
        id="c"
        type="source"
        position={Position.Top}
        className="atlas-handle"
        isConnectable={false}
        style={{ top: SYNTHESIS_HALF, left: "50%" }}
      />
    </div>
  );
}

// ── plate edge ────────────────────────────────────────────────────────────
// Replaces the hand-tuned quadratic + manual Arrowhead() trig. React Flow
// gives us the endpoints; getBezierPath gives a clean curve. Kind drives the
// stroke the way it always did: solid ink + chevron for "extends", dashed ink
// for "implies", long-dash gold for "leads-to".
function PlateEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<RFEdge<{ edge: AtlasEdge; fromAnchor: "south" | "center" }>>) {
  const { hoveredId } = useContext(HoverContext);
  const e = data!.edge;
  const fromAnchor = data!.fromAnchor;
  const lit = hoveredId === e.from || hoveredId === e.to;

  // sourceX/Y and targetX/Y are now true marker centres (handle pinned there).
  // Trim both ends back to the ring so the line kisses the circle instead of
  // stabbing through it — this is the old Arrowhead() pull-back, generalised.
  const vx = targetX - sourceX;
  const vy = targetY - sourceY;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len;
  const uy = vy / len;
  const targetIsSynthesis = e.to === SYNTHESIS.id;
  // the "s" handle isn't a ring — start right at it. "c" is the marker, so
  // pull back by the ring radius like the old Arrowhead() did.
  const startGap = fromAnchor === "south" ? 2 : ATOM_RADIUS + 2;
  const endGap = (targetIsSynthesis ? SYNTHESIS_HALF + 4 : ATOM_RADIUS) + (e.kind === "extends" ? 5 : 2);
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

  const dash = e.kind === "implies" ? "4 3" : e.kind === "leads-to" ? "11 5" : undefined;
  const baseStroke = e.kind === "leads-to" ? "var(--gold)" : "var(--ink)";
  const stroke = lit ? "var(--vermilion)" : baseStroke;
  const width = lit ? 1.4 : e.kind === "leads-to" ? 1.2 : 0.9;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={e.kind === "extends" ? (lit ? "url(#chevron-lit)" : "url(#chevron)") : undefined}
        style={{
          stroke,
          strokeWidth: width,
          strokeDasharray: dash,
          transition: "stroke 220ms ease-out, stroke-width 220ms ease-out",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${e.kind === "leads-to" ? "leads" : ""} ${lit ? "lit" : ""}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {e.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { atom: AtomNode, synthesis: SynthesisNode };
const edgeTypes = { plate: PlateEdge };

function AtlasGraph() {
  const [hoveredId, setHovered] = useState<string | null>(null);

  const nodes: RFNode[] = useMemo(() => {
    // position is the box top-left; offset it so the marker centre lands on
    // the curated coordinate (box centre x, ATOM_RADIUS down from the top).
    const atomNodes: RFNode[] = ATOMS.map(atom => ({
      id: atom.id,
      type: "atom",
      position: { x: atom.x - ATOM_BOX_W / 2, y: atom.y - ATOM_RADIUS },
      data: { atom },
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
    }));
    atomNodes.push({
      id: SYNTHESIS.id,
      type: "synthesis",
      position: { x: SYNTHESIS.x - SYN_BOX_W / 2, y: SYNTHESIS.y - SYNTHESIS_HALF },
      data: {},
      draggable: false,
      selectable: false,
      connectable: false,
      deletable: false,
    });
    return atomNodes;
  }, []);

  const edges: RFEdge[] = useMemo(() => {
    const yOf = (id: string) => (id === SYNTHESIS.id ? SYNTHESIS.y : (ATOMS.find(a => a.id === id)?.y ?? 0));
    return EDGES.map(edge => {
      // a meaningfully downward edge leaves from below the card (handle "s")
      // and lands on the target marker — so it never crosses a caption.
      const vertical = yOf(edge.to) - yOf(edge.from) > 250;
      return {
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        sourceHandle: vertical ? "s" : "c",
        targetHandle: "c",
        type: "plate",
        data: { edge, fromAnchor: vertical ? "south" : "center" },
        selectable: false,
        deletable: false,
      };
    });
  }, []);

  return (
    <HoverContext.Provider value={{ hoveredId, setHovered }}>
      {/* chevron marker defs — one definition, referenced by extends edges */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
        <defs>
          <marker
            id="chevron"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M 1 1 L 8 5 L 1 9"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </marker>
          <marker
            id="chevron-lit"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M 1 1 L 8 5 L 1 9"
              fill="none"
              stroke="var(--vermilion)"
              strokeWidth="1.1"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.14 }}
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
          --paper:     #F2EEE5;
          --paper-2:   #E9E3D5;
          --ink:       #14181F;
          --ink-soft:  #4A4F58;
          --vermilion: #C8412B;
          --gold:      #9A8B5E;
          --gold-soft: rgba(154, 139, 94, 0.45);
          --rule:      rgba(20, 24, 31, 0.10);
          --rule-soft: rgba(20, 24, 31, 0.05);
        }
        .atlas-page { font-family: var(--font-display); }
        .mono { font-family: var(--font-mono); font-feature-settings: "tnum" 1; }
        .paper-grain {
          background-image:
            radial-gradient(rgba(20,24,31,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes frameDraw {
          from { stroke-dashoffset: 4000; }
          to   { stroke-dashoffset: 0; }
        }
        .frontispiece-title { animation: fadeUp 0.7s ease-out both; }
        .frontispiece-sub   { animation: fadeUp 0.7s 0.18s ease-out both; }
        .plate-marginalia   { animation: fadeUp 0.7s 0.32s ease-out both; }
        .plate-frame {
          stroke-dasharray: 4000;
          animation: frameDraw 1.4s 0.20s ease-out both;
        }
        .react-flow-wrap { animation: fadeUp 0.9s 0.5s ease-out both; }
        .editors-note { animation: fadeUp 0.7s 1.40s ease-out both; }

        /* ── React Flow de-chroming — kill every flowchart-tool tell ── */
        .atlas-page .react-flow,
        .atlas-page .react-flow__renderer,
        .atlas-page .react-flow__pane { background: transparent; cursor: default; }
        .atlas-page .react-flow__node { font-family: var(--font-display); }
        .atlas-page .react-flow__node:focus,
        .atlas-page .react-flow__node:focus-visible { outline: none; }
        .atlas-page .react-flow__edge { cursor: default; }
        .atlas-page .react-flow__edge .react-flow__edge-path { stroke-linecap: round; }
        .atlas-page .atlas-handle {
          opacity: 0; width: 1px; height: 1px; min-width: 0; min-height: 0;
          border: 0; background: transparent; pointer-events: none;
          left: 50%; top: 50%; transform: translate(-50%, -50%);
        }
        .atlas-page .react-flow__attribution { display: none; }

        /* React Flow clips node overflow by default — let marginalia + captions show */
        .atlas-page .react-flow__node { overflow: visible; }

        /* ── nodes as plate markers ── */
        .atlas-page .atlas-link { text-decoration: none; color: inherit; cursor: alias; display: block; }
        .atlas-page .atlas-link.locked { cursor: not-allowed; }
        .atlas-page .atlas-link.locked .atom-box,
        .atlas-page .atom-box.locked { opacity: 0.45; }
        .atom-box {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          user-select: none;
        }
        /* engraved-plate knockout — wherever a rule crosses a label, the
           label wins and the line breaks behind it (paper halo). */
        .atlas-page .knockout {
          text-shadow:
            0 0 5px var(--paper), 0 0 4px var(--paper),
            0 0 4px var(--paper), 0 0 3px var(--paper),
            0 0 2px var(--paper), 0 0 2px var(--paper);
        }
        .atom-roman {
          position: absolute; left: calc(50% - 40px); top: -8px;
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em;
          color: var(--gold);
        }
        .atom-marker { transition: transform 220ms ease-out; }
        .atlas-link:not(.locked):hover .atom-marker { transform: scale(1.07); }
        .atom-text {
          margin-top: 14px; text-align: center;
        }
        .atom-name {
          font-style: italic; font-size: 17px; color: var(--ink);
          letter-spacing: -0.005em; transition: color 180ms ease-out;
          white-space: nowrap;
        }
        .atom-name.lit { color: var(--vermilion); }
        .atom-caption {
          margin: 4px auto 0; font-size: 10.5px; line-height: 1.45;
          color: var(--ink-soft); max-width: 210px;
        }
        .atom-locked {
          margin-top: 4px; font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.2em; color: var(--gold);
        }

        /* ── synthesis monument ── */
        .syn-box {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          user-select: none;
        }
        .syn-frame {
          position: relative; display: flex; align-items: center; justify-content: center;
          border: 0.8px solid var(--gold);
        }
        .syn-frame-outer {
          position: absolute; left: 50%; top: 50%;
          width: ${(SYNTHESIS_HALF + 6) * 2}px; height: ${(SYNTHESIS_HALF + 6) * 2}px;
          transform: translate(-50%, -50%);
          border: 0.5px dashed var(--gold-soft); pointer-events: none;
        }
        .syn-letter {
          font-family: var(--font-display); font-size: 80px; font-weight: 300;
          font-style: italic; color: var(--gold); opacity: 0.75; line-height: 1;
        }
        .syn-text {
          margin-top: 16px; text-align: center; white-space: nowrap;
        }
        .syn-kicker { font-size: 9px; letter-spacing: 3px; color: var(--gold); }
        .syn-name {
          margin-top: 6px; font-family: var(--font-display); font-size: 20px;
          font-style: italic; color: var(--ink);
        }
        .syn-caption {
          margin-top: 4px; font-family: var(--font-display); font-size: 12px;
          font-style: italic; color: var(--ink-soft);
        }

        /* ── edge labels — italic word with a paper knockout halo ── */
        .atlas-page .edge-label {
          position: absolute; pointer-events: none;
          font-family: var(--font-display); font-style: italic;
          font-size: 11px; color: var(--ink-soft);
          text-shadow:
            0 0 3px var(--paper), 0 0 3px var(--paper),
            0 0 2px var(--paper), 0 0 2px var(--paper);
          transition: color 220ms ease-out;
        }
        .atlas-page .edge-label.leads { font-size: 13px; color: var(--gold); }
        .atlas-page .edge-label.lit { color: var(--vermilion); }
      `}</style>

      <main
        className={`atlas-page paper-grain min-h-screen text-[var(--ink)] ${fraunces.variable} ${dmMono.variable}`}
        style={{ background: "var(--paper)" }}
      >
        {/* ── frontispiece header ───────────────────────────────────────── */}
        <header className="mx-auto max-w-[1280px] px-10 pt-14 pb-6">
          <div className="flex items-baseline justify-between">
            <span
              className="mono frontispiece-sub text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "var(--gold)" }}
            >
              an experimental edition · v0.3
            </span>
            <span
              className="mono frontispiece-sub text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "var(--ink-soft)" }}
            >
              learning with ai · scaffold-eth
            </span>
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <h1
              className="frontispiece-title leading-[0.92]"
              style={{
                fontWeight: 300,
                fontSize: "clamp(48px, 7vw, 96px)",
                fontStyle: "italic",
                letterSpacing: "-0.02em",
              }}
            >
              atlas of erc-20
            </h1>
            <p
              className="frontispiece-sub mt-5 max-w-[60ch] text-[15px] leading-relaxed"
              style={{ color: "var(--ink-soft)", fontStyle: "italic" }}
            >
              <span className="mono not-italic" style={{ color: "var(--gold)" }}>
                ¶
              </span>{" "}
              a primer on fungible tokens, in five atoms together with one synthesis — annotated, animated, and
              arguable. begin from any unlocked marker; the canonical reading order is{" "}
              <span style={{ fontStyle: "normal" }}>i → v</span>.
            </p>
          </div>
        </header>

        {/* ── plate ─────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1280px] px-10 pb-10">
          <div className="relative plate-marginalia">
            <div
              className="absolute right-2 -top-7 mono text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--gold)" }}
            >
              plate i.
            </div>
            <div
              className="absolute left-2 -top-7 mono text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--ink-soft)" }}
            >
              fig. ø — the territory
            </div>

            <div className="relative mx-auto" style={{ width: 1180, maxWidth: "100%", aspectRatio: "1180 / 600" }}>
              {/* the React Flow plate */}
              <div className="react-flow-wrap absolute inset-0">
                <ReactFlowProvider>
                  <AtlasGraph />
                </ReactFlowProvider>
              </div>

              {/* decorative frame — overlaid, never part of the pannable canvas */}
              <svg
                viewBox="0 0 1180 600"
                width="100%"
                height="100%"
                className="pointer-events-none absolute inset-0"
                style={{ display: "block", overflow: "visible" }}
              >
                <rect
                  x="2"
                  y="2"
                  width={1176}
                  height={596}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="1"
                  className="plate-frame"
                />
                <rect
                  x="10"
                  y="10"
                  width={1160}
                  height={580}
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth="0.8"
                  className="plate-frame"
                  style={{ animationDelay: "0.32s" }}
                />
                {[
                  { x: 28, y: 28 },
                  { x: 1152, y: 28 },
                  { x: 28, y: 572 },
                  { x: 1152, y: 572 },
                ].map((p, i) => (
                  <text
                    key={i}
                    x={p.x}
                    y={p.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--gold-soft)"
                    fontSize="14"
                    fontFamily="var(--font-display)"
                    fontStyle="italic"
                  >
                    ❦
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </section>

        {/* ── editor's note ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1280px] px-10 pb-24">
          <div className="editors-note mx-auto max-w-[68ch]">
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>
              editor&apos;s note
            </div>
            <p className="text-[15px] leading-[1.7]" style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
              The diagram above is a working draft. Each marker is an idea small enough to internalise in one sitting;
              the lines between them are how the ideas compose. The destination — Uniswap — is included not because it
              is reachable today, but because every atom in the diagram exists in service of arriving there. <br />
              <br />
              <span style={{ color: "var(--ink)", fontStyle: "normal" }}>
                Begin with{" "}
                <Link
                  href="/scenes/crowdfunding"
                  style={{
                    fontStyle: "italic",
                    color: "var(--vermilion)",
                    textDecoration: "underline",
                    textUnderlineOffset: 4,
                  }}
                >
                  i. crowdfunding
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
