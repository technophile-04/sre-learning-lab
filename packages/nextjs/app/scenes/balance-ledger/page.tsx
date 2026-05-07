"use client";

// balance-ledger scene — atom i. of v. of the ERC-20 learning experience.
//
// Aesthetic: "scholar's reading room." Warm paper, ink-deep type, vermilion accent for
// actions (the red-pen correction tradition), olive-gold for marginalia. Light theme.
// Roman numerals because this is a textbook, not a dashboard.
//
// One file by design. The user prefers readable over micro-optimized; abstraction earns
// its weight only when something is reused 3+ times. The single sub-component
// (AnimatedNumber) sits at the bottom because it's invoked 5×.
//
// State model: source, compile/deploy status, holders+balances, recent transfers, the
// ai-friend popup. All useState, no external store. One useEffect for auto-compile
// debounce, one for refreshing balances after a tx.
import { useEffect, useMemo, useRef, useState } from "react";
import { DM_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import { solidity } from "@replit/codemirror-lang-solidity";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { blo } from "blo";
import { PREFUNDED_ACCOUNTS, createMemoryClient } from "tevm";
import type { Abi } from "viem";
import { compileSolidity } from "~~/lib/solc";

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

// The canonical balance-ledger contract. Intentionally tiny: a mapping plus transfer.
// No name/symbol/totalSupply/events — those belong to other atoms. This atom is about
// the *ledger* and nothing else.
const STARTER_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MiniLedger {
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = 1000;
    }

    function transfer(address to, uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
    }
}
`;

const HOLDER_LABELS = ["A", "B", "C", "D", "E"] as const;

type CompileState =
  | { kind: "idle" }
  | { kind: "compiling" }
  | { kind: "compiled"; abi: Abi; bytecode: `0x${string}` }
  | { kind: "failed"; errors: string[] };

type Transfer = {
  id: number;
  fromLabel: string;
  toLabel: string;
  amount: bigint;
  at: number;
};

export default function BalanceLedgerScene() {
  // ── core state ─────────────────────────────────────────────────────────────
  const [source, setSource] = useState(STARTER_SOURCE);
  const [compileState, setCompileState] = useState<CompileState>({ kind: "idle" });
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null>(null);
  const [balances, setBalances] = useState<Record<string, bigint>>(() =>
    Object.fromEntries(HOLDER_LABELS.map(l => [l, 0n])),
  );
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [activeArrow, setActiveArrow] = useState<{ from: string; to: string } | null>(null);

  // transfer composer
  const [composerFrom, setComposerFrom] = useState<string>("A");
  const [composerTo, setComposerTo] = useState<string>("B");
  const [composerAmount, setComposerAmount] = useState<string>("100");

  // ai friend
  const [friendOpen, setFriendOpen] = useState(false);

  // working flag (deploy / transfer)
  const [busy, setBusy] = useState(false);

  // ── tevm + accounts (stable for the lifetime of the page) ──────────────────
  const client = useMemo(() => createMemoryClient({ miningConfig: { type: "auto" } }), []);
  // 5 prefunded accounts — index 0 is also the deployer.
  const accounts = useMemo(
    () =>
      HOLDER_LABELS.map((label, i) => ({
        label,
        account: PREFUNDED_ACCOUNTS[i],
        address: PREFUNDED_ACCOUNTS[i].address,
      })),
    [],
  );
  const accountByLabel = useMemo(() => Object.fromEntries(accounts.map(a => [a.label, a])), [accounts]);

  // refs for the holder rows so we can position the transfer arrow precisely
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // ── auto-compile, debounced ────────────────────────────────────────────────
  useEffect(() => {
    setCompileState(s => (s.kind === "compiled" ? { kind: "idle" } : s));
    const t = setTimeout(async () => {
      setCompileState({ kind: "compiling" });
      const res = await compileSolidity(source);
      if (res.ok) {
        setCompileState({ kind: "compiled", abi: res.abi as Abi, bytecode: res.bytecode });
      } else {
        setCompileState({ kind: "failed", errors: res.errors });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [source]);

  // ── deploy ─────────────────────────────────────────────────────────────────
  async function onDeploy() {
    if (compileState.kind !== "compiled") return;
    setBusy(true);
    const hash = await client.deployContract({
      abi: compileState.abi,
      bytecode: compileState.bytecode,
      args: [],
      account: accounts[0].account,
      chain: null,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    setContractAddress(receipt.contractAddress as `0x${string}`);
    setTransfers([]);
    setActiveArrow(null);
    await refreshBalances(receipt.contractAddress as `0x${string}`, compileState.abi);
    setBusy(false);
  }

  async function refreshBalances(addr: `0x${string}`, abi: Abi) {
    const next: Record<string, bigint> = {};
    for (const { label, address } of accounts) {
      const b = (await client.readContract({
        address: addr,
        abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      next[label] = b;
    }
    setBalances(next);
  }

  // ── transfer ───────────────────────────────────────────────────────────────
  async function onTransfer() {
    if (!contractAddress || compileState.kind !== "compiled") return;
    if (composerFrom === composerTo) return;
    const amount = BigInt(composerAmount || "0");
    if (amount === 0n) return;

    setBusy(true);
    const sender = accountByLabel[composerFrom];
    const recipient = accountByLabel[composerTo];
    const hash = await client.writeContract({
      address: contractAddress,
      abi: compileState.abi,
      functionName: "transfer",
      args: [recipient.address, amount],
      account: sender.account,
      chain: null,
    });
    await client.waitForTransactionReceipt({ hash });

    setActiveArrow({ from: composerFrom, to: composerTo });
    setTransfers(prev => [
      {
        id: Date.now(),
        fromLabel: composerFrom,
        toLabel: composerTo,
        amount,
        at: Date.now(),
      },
      ...prev,
    ]);
    setTimeout(() => setActiveArrow(null), 1500);
    await refreshBalances(contractAddress, compileState.abi);
    setBusy(false);
  }

  // arrow geometry — recomputed each render, cheap.
  const arrowGeom = useMemo(() => {
    if (!activeArrow || !tableContainerRef.current) return null;
    const fromEl = rowRefs.current[activeArrow.from];
    const toEl = rowRefs.current[activeArrow.to];
    const container = tableContainerRef.current;
    if (!fromEl || !toEl) return null;
    const cb = container.getBoundingClientRect();
    const fb = fromEl.getBoundingClientRect();
    const tb = toEl.getBoundingClientRect();
    const x1 = fb.right - cb.left - 60;
    const y1 = fb.top + fb.height / 2 - cb.top;
    const x2 = tb.right - cb.left - 60;
    const y2 = tb.top + tb.height / 2 - cb.top;
    const cx = (x1 + x2) / 2 + 32; // bow rightward
    const cy = (y1 + y2) / 2;
    return { x1, y1, x2, y2, cx, cy };
  }, [activeArrow]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .balance-ledger-scene {
          --paper:     #F2EEE5;
          --paper-2:   #E9E3D5;
          --ink:       #14181F;
          --ink-soft:  #4A4F58;
          --vermilion: #C8412B;
          --gold:      #9A8B5E;
          --rule:      rgba(20, 24, 31, 0.10);
          --rule-soft: rgba(20, 24, 31, 0.05);
        }
        .balance-ledger-scene { font-family: var(--font-display); }
        .mono { font-family: var(--font-mono); font-feature-settings: "tnum" 1; }
        .paper-grain {
          background-image:
            radial-gradient(rgba(20,24,31,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        @keyframes inkwellBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        .inkwell-bob { animation: inkwellBob 3.6s ease-in-out infinite; }
        @keyframes flashIn {
          from { background: rgba(200, 65, 43, 0.18); }
          to   { background: transparent; }
        }
        .flash-sender   { animation: flashIn 1.4s ease-out; }
        @keyframes flashGold {
          from { background: rgba(154, 139, 94, 0.20); }
          to   { background: transparent; }
        }
        .flash-receiver { animation: flashGold 1.4s ease-out; }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .slide-in { animation: slideInRight 0.4s ease-out both; }
        @keyframes drawArrow {
          from { stroke-dashoffset: 400; opacity: 0; }
          to   { stroke-dashoffset: 0;   opacity: 1; }
        }
        .arrow-line {
          stroke-dasharray: 400;
          animation: drawArrow 0.55s ease-out forwards, fadeArrow 1.5s ease-out forwards;
        }
        @keyframes fadeArrow {
          0% { opacity: 0; }
          25% { opacity: 1; }
          100% { opacity: 0; }
        }
        .pop-in { animation: popIn 0.18s ease-out both; }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.94) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .atlas-mark { transition: color 180ms ease-out; position: relative; }
        .atlas-mark::after {
          content: "";
          position: absolute;
          left: 0; right: 100%; bottom: -2px;
          height: 1px;
          background: var(--vermilion);
          transition: right 220ms ease-out;
        }
        .atlas-mark:hover { color: var(--vermilion); }
        .atlas-mark:hover::after { right: 0; }
      `}</style>

      <main
        className={`balance-ledger-scene paper-grain min-h-screen text-[var(--ink)] ${fraunces.variable} ${dmMono.variable}`}
        style={{ background: "var(--paper)" }}
      >
        {/* ── editorial header ───────────────────────────────────────────── */}
        <header className="mx-auto max-w-[1280px] px-10 pt-14 pb-8">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-6">
              <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>
                atom <span className="italic">i.</span> of <span className="italic">v.</span>
              </span>
              <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ink-soft)" }}>
                erc-20 — a primer
              </span>
            </div>
            <Link
              href="/scenes"
              className="atlas-mark mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: "var(--ink-soft)" }}
            >
              ↩ atlas · pl. i.
            </Link>
          </div>
          <h1
            className="mt-3 leading-[0.95]"
            style={{
              fontWeight: 300,
              fontSize: "clamp(48px, 6.4vw, 88px)",
              fontStyle: "italic",
              letterSpacing: "-0.02em",
            }}
          >
            balance ledger
          </h1>
          <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            A contract is a database of who owns how much. Transfers update two rows in the same breath — one
            decrements, one increments, and the sum stays still.
          </p>
          <div className="mt-10 h-px w-full" style={{ background: "var(--rule)" }} />
        </header>

        {/* ── main split ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1280px] px-10 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
            {/* ── EDITOR PANE ──────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-center justify-between" style={{ color: "var(--ink-soft)" }}>
                <div className="flex items-center gap-3">
                  <CompileDot state={compileState} />
                  <span className="mono text-[11px] tracking-tight">MiniLedger.sol</span>
                </div>
                <span className="mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
                  fig. i — the contract
                </span>
              </div>

              <div
                className="overflow-hidden border"
                style={{
                  borderColor: "var(--rule)",
                  background: "#FBFAF6",
                }}
              >
                <CodeMirror
                  value={source}
                  onChange={setSource}
                  extensions={[solidity]}
                  theme={githubLight}
                  height="540px"
                  basicSetup={{
                    foldGutter: false,
                    lineNumbers: true,
                    highlightActiveLine: false,
                  }}
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* compile feedback */}
              <div className="mt-3 min-h-[24px]">
                {compileState.kind === "failed" && (
                  <pre
                    className="mono whitespace-pre-wrap text-[11px] leading-relaxed"
                    style={{ color: "var(--vermilion)" }}
                  >
                    {compileState.errors.join("\n")}
                  </pre>
                )}
                {compileState.kind === "compiled" && !contractAddress && (
                  <span className="mono text-[11px]" style={{ color: "var(--ink-soft)" }}>
                    compiled — ready to deploy.
                  </span>
                )}
              </div>

              {/* action bar */}
              <div className="mt-5 flex items-center gap-5">
                <button
                  onClick={onDeploy}
                  disabled={busy || compileState.kind !== "compiled"}
                  className="group inline-flex items-center gap-3 px-6 py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--ink)",
                    color: "var(--paper)",
                  }}
                >
                  <span style={{ fontStyle: "italic", fontWeight: 400, fontSize: 16 }}>deploy contract</span>
                  <span className="mono text-[10px]" style={{ color: "rgba(242,238,229,0.55)" }}>
                    →
                  </span>
                </button>
                {contractAddress && (
                  <button
                    onClick={() => {
                      setContractAddress(null);
                      setBalances(Object.fromEntries(HOLDER_LABELS.map(l => [l, 0n])));
                      setTransfers([]);
                    }}
                    className="mono text-[11px] uppercase tracking-[0.18em] underline-offset-4 hover:underline"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    reset
                  </button>
                )}
                {contractAddress && (
                  <span className="mono ml-auto text-[10px]" style={{ color: "var(--gold)" }}>
                    {contractAddress.slice(0, 8)}…{contractAddress.slice(-4)}
                  </span>
                )}
              </div>
            </div>

            {/* ── STATE PANE ──────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-baseline justify-between" style={{ color: "var(--ink-soft)" }}>
                <span className="mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
                  fig. ii — the ledger
                </span>
                <span className="mono text-[10px]">{contractAddress ? "live" : "awaiting deploy"}</span>
              </div>

              <div
                ref={tableContainerRef}
                className="relative border"
                style={{
                  borderColor: "var(--rule)",
                  background: "#FBFAF6",
                }}
              >
                {/* table header */}
                <div
                  className="mono grid grid-cols-[40px_50px_1fr_120px] items-center px-5 py-3 text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: "var(--ink-soft)",
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <span></span>
                  <span>holder</span>
                  <span>address</span>
                  <span className="text-right">balance</span>
                </div>

                {/* rows */}
                {accounts.map(({ label, address }, i) => {
                  const isSender = activeArrow?.from === label;
                  const isReceiver = activeArrow?.to === label;
                  return (
                    <div
                      key={label}
                      ref={el => {
                        rowRefs.current[label] = el;
                      }}
                      className={`grid grid-cols-[40px_50px_1fr_120px] items-center px-5 py-4 ${
                        isSender ? "flash-sender" : ""
                      } ${isReceiver ? "flash-receiver" : ""}`}
                      style={{
                        borderBottom: i < accounts.length - 1 ? "1px solid var(--rule-soft)" : "none",
                        borderLeft: i === 0 ? "2px solid var(--gold)" : "2px solid transparent",
                      }}
                    >
                      {/* blo returns a data: URL, so next/image's optimization buys nothing here */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={blo(address as `0x${string}`)}
                        alt=""
                        width={22}
                        height={22}
                        style={{
                          borderRadius: 2,
                          opacity: balances[label] === 0n ? 0.45 : 1,
                        }}
                      />
                      <span
                        style={{
                          fontStyle: "italic",
                          fontSize: 18,
                          color: "var(--ink)",
                        }}
                      >
                        {label}
                        {i === 0 && (
                          <span
                            className="mono ml-2 text-[9px] uppercase tracking-[0.18em]"
                            style={{ color: "var(--gold)" }}
                          >
                            deployer
                          </span>
                        )}
                      </span>
                      <span className="mono text-[11px]" style={{ color: "var(--ink-soft)" }}>
                        {address.slice(0, 10)}…{address.slice(-6)}
                      </span>
                      <span
                        className="mono text-right text-[18px] tabular-nums"
                        style={{
                          color: balances[label] === 0n ? "var(--ink-soft)" : "var(--ink)",
                          opacity: balances[label] === 0n ? 0.4 : 1,
                          fontWeight: 400,
                        }}
                      >
                        <AnimatedNumber value={balances[label]} />
                      </span>
                    </div>
                  );
                })}

                {/* arrow overlay */}
                {arrowGeom && (
                  <svg className="pointer-events-none absolute inset-0" style={{ width: "100%", height: "100%" }}>
                    <defs>
                      <marker
                        id="arrowhead"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0,0 L10,5 L0,10 z" fill="var(--vermilion)" />
                      </marker>
                    </defs>
                    <path
                      key={`${activeArrow!.from}-${activeArrow!.to}-${transfers[0]?.id}`}
                      className="arrow-line"
                      d={`M ${arrowGeom.x1} ${arrowGeom.y1} Q ${arrowGeom.cx} ${arrowGeom.cy} ${arrowGeom.x2} ${arrowGeom.y2}`}
                      fill="none"
                      stroke="var(--vermilion)"
                      strokeWidth="1.4"
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                )}
              </div>

              {/* ── transfer composer (sentence form) ─────────────────── */}
              <div
                className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-3 px-5 py-5"
                style={{
                  borderLeft: "2px solid var(--vermilion)",
                  background: "rgba(200, 65, 43, 0.04)",
                  fontSize: 18,
                }}
              >
                <span style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>send</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={composerAmount}
                  onChange={e => setComposerAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="mono w-[80px] border-b text-center tabular-nums focus:outline-none"
                  style={{
                    background: "transparent",
                    borderColor: "var(--vermilion)",
                    color: "var(--vermilion)",
                    fontSize: 18,
                  }}
                />
                <span style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>from</span>
                <SelectPill value={composerFrom} onChange={setComposerFrom} options={HOLDER_LABELS} />
                <span style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>to</span>
                <SelectPill value={composerTo} onChange={setComposerTo} options={HOLDER_LABELS} />
                <button
                  onClick={onTransfer}
                  disabled={busy || !contractAddress || composerFrom === composerTo}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--vermilion)",
                    color: "var(--paper)",
                  }}
                >
                  <span style={{ fontStyle: "italic", fontSize: 14 }}>send</span>
                  <span className="mono text-[10px]">→</span>
                </button>
              </div>

              {/* ── audit trail ──────────────────────────────────────── */}
              <div className="mt-10">
                <div className="mb-3 flex items-baseline justify-between" style={{ color: "var(--ink-soft)" }}>
                  <span className="mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
                    fig. iii — audit trail
                  </span>
                  <span className="mono text-[10px]">
                    {transfers.length} {transfers.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                {transfers.length === 0 ? (
                  <p className="text-[14px]" style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
                    No transfers yet. The ledger remembers everything.
                  </p>
                ) : (
                  <ul>
                    {transfers.map(t => (
                      <li
                        key={t.id}
                        className="slide-in mono flex items-baseline gap-4 py-2 text-[13px]"
                        style={{ borderBottom: "1px solid var(--rule-soft)" }}
                      >
                        <span style={{ color: "var(--gold)" }}>{timeAgo(t.at)}</span>
                        <span style={{ color: "var(--ink)" }}>
                          {t.fromLabel} <span style={{ color: "var(--vermilion)" }}>→</span> {t.toLabel}
                        </span>
                        <span className="ml-auto tabular-nums" style={{ color: "var(--ink)" }}>
                          {t.amount.toString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── ai friend (corner inkwell) ───────────────────────────────── */}
        <FriendInkwell open={friendOpen} onToggle={() => setFriendOpen(v => !v)} />
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CompileDot({ state }: { state: CompileState }) {
  const ring = state.kind === "failed" ? "var(--vermilion)" : "var(--gold)";
  const fill =
    state.kind === "compiled"
      ? "var(--gold)"
      : state.kind === "compiling"
        ? "rgba(154, 139, 94, 0.5)"
        : state.kind === "failed"
          ? "var(--vermilion)"
          : "transparent";
  return (
    <span
      aria-label={state.kind}
      className="inline-block"
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        border: `1px solid ${ring}`,
        background: fill,
        transition: "background 0.4s ease",
      }}
    />
  );
}

function SelectPill({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <span className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none border-b bg-transparent pb-0.5 pr-5 pl-1 italic focus:outline-none"
        style={{
          fontSize: 18,
          borderColor: "var(--ink)",
          color: "var(--ink)",
        }}
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        className="mono pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[9px]"
        style={{ color: "var(--ink-soft)" }}
      >
        ▾
      </span>
    </span>
  );
}

function FriendInkwell({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      {open && (
        <div
          className="pop-in mb-3 w-[320px] border"
          style={{
            background: "#FBFAF6",
            borderColor: "var(--rule)",
            boxShadow: "0 16px 40px -12px rgba(20,24,31,0.18)",
          }}
        >
          <div
            className="flex items-baseline justify-between border-b px-5 py-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <span style={{ fontStyle: "italic", fontSize: 18 }}>the friend</span>
            <span className="mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
              v0.1 shell
            </span>
          </div>
          <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed">
            <p style={{ color: "var(--ink)" }}>
              <span style={{ fontStyle: "italic" }}>hey.</span> you&apos;re looking at the ledger atom. mutate the
              contract on the left and watch the right react.
            </p>
            <p style={{ color: "var(--ink-soft)" }}>
              ask me when something doesn&apos;t make sense. (full chat plugs in next week — for now i just nod along.)
            </p>
          </div>
          <div className="border-t px-5 py-3" style={{ borderColor: "var(--rule)" }}>
            <input
              disabled
              placeholder="hold for v0.2…"
              className="mono w-full bg-transparent text-[12px] focus:outline-none"
              style={{ color: "var(--ink-soft)" }}
            />
          </div>
        </div>
      )}
      <button
        onClick={onToggle}
        className="inkwell-bob group flex h-14 w-14 items-center justify-center transition-transform hover:scale-105"
        style={{
          background: "var(--ink)",
          color: "var(--paper)",
          borderRadius: 2,
        }}
        aria-label={open ? "close friend" : "open friend"}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {open ? "×" : "?"}
        </span>
      </button>
    </div>
  );
}

// AnimatedNumber — eased count between bigint values. Used 5×, earns its weight.
function AnimatedNumber({ value }: { value: bigint }) {
  const [display, setDisplay] = useState<number>(Number(value));
  const fromRef = useRef<number>(Number(value));

  useEffect(() => {
    const start = fromRef.current;
    const target = Number(value);
    if (start === target) return;
    const startTime = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = start + (target - start) * eased;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{Math.round(display).toLocaleString()}</>;
}

function timeAgo(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
