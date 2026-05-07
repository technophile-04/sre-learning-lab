"use client";

// atlas — the frontispiece plate. The "zoom out" view of the entire ERC-20 atom set.
//
// Rendered as a single composed artifact, not a webapp screen: a printed scholarly
// diagram with hand-drawn-feeling edges, italic edge labels ("extends", "implies",
// "leads to —"), Roman-numeral marginalia, and a destination node (Uniswap) styled
// as an illuminated drop-cap to distinguish it from the atoms.
//
// Layout coordinates are hard-coded (not force-directed) — this is curriculum, not a
// dataset. Hardcoded positions read as designed; computed positions read as generic.
import { useState } from "react";
import { DM_Mono, Fraunces } from "next/font/google";
import Link from "next/link";

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

type Atom = {
  id: string;
  roman: string;
  label: string;
  caption: string;
  x: number;
  y: number;
  status: AtomStatus;
  href: string;
  romanOffset?: { dx: number; dy: number };
};

const ATOMS: Atom[] = [
  {
    id: "balance-ledger",
    roman: "i.",
    label: "balance ledger",
    caption: "the contract is a database of who owns how much.",
    x: 220,
    y: 200,
    status: "completed",
    href: "/scenes/balance-ledger",
    romanOffset: { dx: -40, dy: -34 },
  },
  {
    id: "direct-authorization",
    roman: "ii.",
    label: "direct authorization",
    caption: "move tokens you own — and only those.",
    x: 480,
    y: 200,
    status: "available",
    href: "/scenes/direct-authorization",
    romanOffset: { dx: -38, dy: -34 },
  },
  {
    id: "delegated-authorization",
    roman: "iii.",
    label: "delegated authorization",
    caption: "grant another address permission to spend.",
    x: 740,
    y: 200,
    status: "available",
    href: "/scenes/delegated-authorization",
    romanOffset: { dx: -42, dy: -34 },
  },
  {
    id: "supply-management",
    roman: "iv.",
    label: "supply management",
    caption: "where tokens come from. where they go.",
    x: 220,
    y: 420,
    status: "locked",
    href: "#",
    romanOffset: { dx: -42, dy: -34 },
  },
  {
    id: "audit-trail",
    roman: "v.",
    label: "audit trail",
    caption: "every move emits a log. the ledger remembers.",
    x: 480,
    y: 420,
    status: "locked",
    href: "#",
    romanOffset: { dx: -38, dy: -34 },
  },
];

const SYNTHESIS = {
  id: "uniswap",
  letter: "U",
  label: "uniswap",
  caption: "a market made of these atoms.",
  x: 980,
  y: 310,
};

type Edge = {
  from: string;
  to: string;
  kind: "extends" | "implies" | "leads-to";
  label: string;
  /** offset for label so it doesn't sit ON the line */
  labelOffset: { dx: number; dy: number };
  /** bend factor — controls Bezier control point distance from midpoint */
  bend?: number;
};

const EDGES: Edge[] = [
  {
    from: "balance-ledger",
    to: "direct-authorization",
    kind: "extends",
    label: "extends",
    labelOffset: { dx: 0, dy: -14 },
  },
  {
    from: "direct-authorization",
    to: "delegated-authorization",
    kind: "extends",
    label: "extends",
    labelOffset: { dx: 0, dy: -14 },
  },
  {
    from: "balance-ledger",
    to: "supply-management",
    kind: "extends",
    label: "extends",
    labelOffset: { dx: -50, dy: 6 },
  },
  {
    from: "balance-ledger",
    to: "audit-trail",
    kind: "implies",
    label: "implies",
    labelOffset: { dx: 6, dy: 0 },
    bend: 24,
  },
  {
    from: "direct-authorization",
    to: "audit-trail",
    kind: "implies",
    label: "implies",
    labelOffset: { dx: -38, dy: 6 },
  },
  {
    from: "delegated-authorization",
    to: "uniswap",
    kind: "leads-to",
    label: "leads to —",
    labelOffset: { dx: 6, dy: -10 },
    bend: -30,
  },
];

const ATOM_RADIUS = 28;
const SYNTHESIS_HALF = 52;

const CANVAS_W = 1180;
const CANVAS_H = 600;

export default function AtlasPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const allNodes = useMemoNodes();

  function nodePos(id: string): { x: number; y: number } {
    return allNodes[id];
  }

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
        @keyframes drawIn {
          from { stroke-dashoffset: 600; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes frameDraw {
          from { stroke-dashoffset: 4000; }
          to   { stroke-dashoffset: 0; }
        }
        .frontispiece-title { animation: fadeUp 0.7s ease-out both; }
        .frontispiece-sub   { animation: fadeUp 0.7s 0.18s ease-out both; }
        .plate-marginalia   { animation: fadeUp 0.7s 0.32s ease-out both; }
        .plate-frame        {
          stroke-dasharray: 4000;
          animation: frameDraw 1.4s 0.20s ease-out both;
        }
        .atom {
          opacity: 0;
          animation: fadeUp 0.55s ease-out forwards;
        }
        .edge {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          opacity: 0;
          animation: drawIn 0.85s ease-out forwards;
        }
        .editors-note { animation: fadeUp 0.7s 1.40s ease-out both; }

        .atom-marker {
          transition: transform 220ms ease-out;
        }
        .atom:hover .atom-marker {
          transform: scale(1.07);
        }
        .atom:hover .atom-name {
          color: var(--vermilion);
        }
        .atom-name { transition: color 180ms ease-out; }

        .edge-line { transition: stroke 220ms ease-out, stroke-width 220ms ease-out; }
        .edge-line.lit { stroke: var(--vermilion); stroke-width: 1.4; }
        .edge-label { transition: fill 220ms ease-out; }
        .edge-label.lit { fill: var(--vermilion); }

        .completed-flourish circle:first-child { fill: var(--vermilion); }

        .atlas-link { cursor: alias; }
        .atlas-link.locked { cursor: not-allowed; }
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
              an experimental edition · v0.1
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
            {/* plate marginalia (upper-right corner of the frame) */}
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

            {/* the plate itself */}
            <div
              className="relative mx-auto"
              style={{
                width: CANVAS_W,
                maxWidth: "100%",
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
              }}
            >
              <svg
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                width="100%"
                height="100%"
                style={{ display: "block", overflow: "visible" }}
              >
                {/* double-rule frame */}
                <rect
                  x="2"
                  y="2"
                  width={CANVAS_W - 4}
                  height={CANVAS_H - 4}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth="1"
                  className="plate-frame"
                />
                <rect
                  x="10"
                  y="10"
                  width={CANVAS_W - 20}
                  height={CANVAS_H - 20}
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth="0.8"
                  className="plate-frame"
                  style={{ animationDelay: "0.32s" }}
                />

                {/* corner ornaments — small fleurons */}
                {[
                  { x: 28, y: 28 },
                  { x: CANVAS_W - 28, y: 28 },
                  { x: 28, y: CANVAS_H - 28 },
                  { x: CANVAS_W - 28, y: CANVAS_H - 28 },
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
                    className="atom"
                    style={{ animationDelay: "1.0s" }}
                  >
                    ❦
                  </text>
                ))}

                {/* edges — drawn first so atoms sit on top */}
                {EDGES.map((edge, i) => {
                  const a = nodePos(edge.from);
                  const b = nodePos(edge.to);
                  const lit = hoveredId === edge.from || hoveredId === edge.to;
                  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                  const bend = edge.bend ?? 0;
                  const ctrl = {
                    x: mid.x + bend,
                    y: mid.y - Math.abs(bend) * 0.6,
                  };
                  const dash = edge.kind === "implies" ? "4 3" : edge.kind === "leads-to" ? "11 5" : undefined;
                  const stroke = edge.kind === "leads-to" ? "var(--gold)" : "var(--ink)";
                  const baseWidth = edge.kind === "leads-to" ? 1.2 : 0.9;
                  return (
                    <g
                      key={`${edge.from}-${edge.to}`}
                      className="edge"
                      style={{ animationDelay: `${0.8 + i * 0.08}s` }}
                    >
                      {/* the line */}
                      <path
                        d={`M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={baseWidth}
                        strokeDasharray={dash}
                        className={`edge-line ${lit ? "lit" : ""}`}
                      />

                      {/* arrowhead — only for solid extends */}
                      {edge.kind === "extends" && (
                        <Arrowhead to={b} ctrl={ctrl} color={lit ? "var(--vermilion)" : "var(--ink)"} />
                      )}

                      {/* edge label — italic word riding on the line */}
                      <text
                        x={ctrl.x + edge.labelOffset.dx}
                        y={ctrl.y + edge.labelOffset.dy}
                        textAnchor="middle"
                        fill={edge.kind === "leads-to" ? "var(--gold)" : "var(--ink-soft)"}
                        fontSize={edge.kind === "leads-to" ? "13" : "11"}
                        fontFamily="var(--font-display)"
                        fontStyle="italic"
                        className={`edge-label ${lit ? "lit" : ""}`}
                      >
                        <tspan
                          dx="0"
                          dy="0"
                          style={{
                            paintOrder: "stroke",
                            stroke: "var(--paper)",
                            strokeWidth: 4,
                            strokeLinejoin: "round",
                          }}
                        >
                          {edge.label}
                        </tspan>
                      </text>
                    </g>
                  );
                })}

                {/* synthesis node — the U drop-cap monument */}
                <g className="atom" style={{ animationDelay: "1.05s" }}>
                  {/* hairline frame box */}
                  <rect
                    x={SYNTHESIS.x - SYNTHESIS_HALF}
                    y={SYNTHESIS.y - SYNTHESIS_HALF}
                    width={SYNTHESIS_HALF * 2}
                    height={SYNTHESIS_HALF * 2}
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="0.8"
                  />
                  {/* outer faint */}
                  <rect
                    x={SYNTHESIS.x - SYNTHESIS_HALF - 6}
                    y={SYNTHESIS.y - SYNTHESIS_HALF - 6}
                    width={(SYNTHESIS_HALF + 6) * 2}
                    height={(SYNTHESIS_HALF + 6) * 2}
                    fill="none"
                    stroke="var(--gold-soft)"
                    strokeWidth="0.5"
                    strokeDasharray="2 4"
                  />
                  {/* the U */}
                  <text
                    x={SYNTHESIS.x}
                    y={SYNTHESIS.y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--gold)"
                    fontFamily="var(--font-display)"
                    fontSize="80"
                    fontWeight="300"
                    fontStyle="italic"
                    style={{ opacity: 0.75 }}
                  >
                    U
                  </text>
                  {/* labels under the monument */}
                  <text
                    x={SYNTHESIS.x}
                    y={SYNTHESIS.y + SYNTHESIS_HALF + 26}
                    textAnchor="middle"
                    fill="var(--gold)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                    letterSpacing="3"
                  >
                    DESTINATION
                  </text>
                  <text
                    x={SYNTHESIS.x}
                    y={SYNTHESIS.y + SYNTHESIS_HALF + 44}
                    textAnchor="middle"
                    fill="var(--ink)"
                    fontFamily="var(--font-display)"
                    fontSize="20"
                    fontStyle="italic"
                    fontWeight="400"
                  >
                    {SYNTHESIS.label}
                  </text>
                  <text
                    x={SYNTHESIS.x}
                    y={SYNTHESIS.y + SYNTHESIS_HALF + 64}
                    textAnchor="middle"
                    fill="var(--ink-soft)"
                    fontFamily="var(--font-display)"
                    fontSize="12"
                    fontStyle="italic"
                  >
                    {SYNTHESIS.caption}
                  </text>
                </g>
              </svg>

              {/* atom markers — HTML so Link prefetches and hover is clean */}
              {ATOMS.map((atom, i) => {
                const left = `${(atom.x / CANVAS_W) * 100}%`;
                const top = `${(atom.y / CANVAS_H) * 100}%`;
                const locked = atom.status === "locked";
                const className = `atom atlas-link ${locked ? "locked" : ""} absolute -translate-x-1/2 -translate-y-1/2 select-none`;
                const style = {
                  left,
                  top,
                  animationDelay: `${0.5 + i * 0.08}s`,
                  textDecoration: "none",
                  color: "inherit",
                  opacity: locked ? 0.45 : 1,
                };
                const onEnter = () => setHoveredId(atom.id);
                const onLeave = () => setHoveredId(null);
                const inner = (
                  <>
                    {/* roman numeral marginalia */}
                    <span
                      className="absolute mono text-[10px] uppercase tracking-[0.22em]"
                      style={{
                        color: "var(--gold)",
                        left: atom.romanOffset?.dx ?? -38,
                        top: atom.romanOffset?.dy ?? -34,
                      }}
                    >
                      {atom.roman}
                    </span>

                    {/* the marker itself */}
                    <div
                      className="atom-marker relative"
                      style={{
                        width: ATOM_RADIUS * 2,
                        height: ATOM_RADIUS * 2,
                      }}
                    >
                      <svg
                        width={ATOM_RADIUS * 2}
                        height={ATOM_RADIUS * 2}
                        viewBox={`0 0 ${ATOM_RADIUS * 2} ${ATOM_RADIUS * 2}`}
                        style={{ display: "block" }}
                      >
                        {/* outer ring */}
                        <circle
                          cx={ATOM_RADIUS}
                          cy={ATOM_RADIUS}
                          r={ATOM_RADIUS - 2}
                          fill="var(--paper)"
                          stroke="var(--ink)"
                          strokeWidth={atom.status === "completed" ? 1.4 : 1}
                          strokeDasharray={locked ? "2 3" : undefined}
                        />
                        {/* completion flourish — wax seal cross */}
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
                        {/* available — small ink dot */}
                        {atom.status === "available" && (
                          <circle cx={ATOM_RADIUS} cy={ATOM_RADIUS} r="4" fill="var(--ink)" />
                        )}
                        {/* locked — empty interior */}
                      </svg>
                    </div>

                    {/* atom name + caption beneath the marker */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
                      style={{ top: ATOM_RADIUS * 2 + 14 }}
                    >
                      <div
                        className="atom-name"
                        style={{
                          fontStyle: "italic",
                          fontSize: 17,
                          color: "var(--ink)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {atom.label}
                      </div>
                      <div
                        className="mono mt-1 text-[10.5px] leading-[1.45]"
                        style={{
                          color: "var(--ink-soft)",
                          maxWidth: 220,
                          whiteSpace: "normal",
                          margin: "4px auto 0",
                        }}
                      >
                        {atom.caption}
                      </div>
                      {locked && (
                        <div
                          className="mono mt-1 text-[9px] uppercase tracking-[0.2em]"
                          style={{ color: "var(--gold)" }}
                        >
                          locked — completes after i
                        </div>
                      )}
                    </div>
                  </>
                );
                return locked ? (
                  <div key={atom.id} onMouseEnter={onEnter} onMouseLeave={onLeave} className={className} style={style}>
                    {inner}
                  </div>
                ) : (
                  <Link
                    key={atom.id}
                    href={atom.href}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                    className={className}
                    style={style}
                  >
                    {inner}
                  </Link>
                );
              })}
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
                  href="/scenes/balance-ledger"
                  style={{
                    fontStyle: "italic",
                    color: "var(--vermilion)",
                    textDecoration: "underline",
                    textUnderlineOffset: 4,
                  }}
                >
                  i. balance ledger
                </Link>
                .
              </span>
            </p>
          </div>
        </section>
      </main>
    </>
  );

  // small helper kept inline because positions are small static map
  function useMemoNodes(): Record<string, { x: number; y: number }> {
    const out: Record<string, { x: number; y: number }> = {};
    for (const a of ATOMS) out[a.id] = { x: a.x, y: a.y };
    out[SYNTHESIS.id] = { x: SYNTHESIS.x, y: SYNTHESIS.y };
    return out;
  }
}

// Arrowhead — small open chevron pointing along the direction of the curve
// at the destination. Computed from the control point so it sits flush to
// the atom edge at a clean angle.
function Arrowhead({
  to,
  ctrl,
  color,
}: {
  to: { x: number; y: number };
  ctrl: { x: number; y: number };
  color: string;
}) {
  // direction of the curve at the endpoint = derivative of Bezier ≈ to - ctrl
  const dx = to.x - ctrl.x;
  const dy = to.y - ctrl.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // pull back from the atom edge by ATOM_RADIUS so the arrow lands on the ring
  const tipX = to.x - ux * (ATOM_RADIUS + 1);
  const tipY = to.y - uy * (ATOM_RADIUS + 1);
  // chevron wings
  const size = 6;
  const wingAngle = 0.5; // radians from main axis
  const cos = Math.cos(wingAngle);
  const sin = Math.sin(wingAngle);
  // rotate -ux,-uy by ±wingAngle, scale by size
  const w1x = tipX + size * (-ux * cos + -uy * -sin);
  const w1y = tipY + size * (-uy * cos + -ux * sin);
  const w2x = tipX + size * (-ux * cos + -uy * sin);
  const w2y = tipY + size * (-uy * cos + -ux * -sin);
  return (
    <path
      d={`M ${w1x} ${w1y} L ${tipX} ${tipY} L ${w2x} ${w2y}`}
      fill="none"
      stroke={color}
      strokeWidth="0.9"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}
