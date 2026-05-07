"use client";

// atom iii. — delegated authorization
//
// SCENE STUB. The Uniswap-bridge atom: where a third party gets permission to spend
// on your behalf. Where every infinite-approval drainer also lives. Stub for v0.1;
// the live tinkering and AI-driven Socratic check land later.
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

export default function DelegatedAuthorizationScene() {
  return (
    <>
      <style>{`
        .scene-stub {
          --paper:     #F2EEE5;
          --ink:       #14181F;
          --ink-soft:  #4A4F58;
          --vermilion: #C8412B;
          --gold:      #9A8B5E;
          --rule:      rgba(20, 24, 31, 0.10);
          --rule-soft: rgba(20, 24, 31, 0.05);
        }
        .scene-stub { font-family: var(--font-display); }
        .mono { font-family: var(--font-mono); font-feature-settings: "tnum" 1; }
        .paper-grain {
          background-image: radial-gradient(rgba(20,24,31,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        .atlas-mark {
          transition: color 180ms ease-out;
          position: relative;
        }
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
        className={`scene-stub paper-grain min-h-screen text-[var(--ink)] ${fraunces.variable} ${dmMono.variable}`}
        style={{ background: "var(--paper)" }}
      >
        <header className="mx-auto max-w-[1280px] px-10 pt-14 pb-8">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-6">
              <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>
                atom <span className="italic">iii.</span> of <span className="italic">v.</span>
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
            delegated authorization
          </h1>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Grant another address permission to spend on your behalf — capped, revocable, and forever the source of
            every infinite-approval exploit ever written.
          </p>
          <div className="mt-10 h-px w-full" style={{ background: "var(--rule)" }} />
        </header>

        <section className="mx-auto max-w-[1280px] px-10 pb-24">
          <div
            className="px-8 py-10"
            style={{
              borderLeft: "2px solid var(--vermilion)",
              background: "rgba(200, 65, 43, 0.04)",
            }}
          >
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--vermilion)" }}>
              fig. ø — sketched · the bridge atom
            </div>
            <p className="text-[18px] leading-[1.65]" style={{ color: "var(--ink)", fontStyle: "italic" }}>
              This is the atom that makes Uniswap possible. It is also the atom that makes wallet drainers possible.
            </p>
            <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
              When fully drawn, the scene will introduce <span className="mono">approve</span> and{" "}
              <span className="mono">transferFrom</span> — the two-step dance where you grant a third party permission
              to move your tokens up to a cap. The right-hand panel will show the <em>allowance matrix</em>: a small
              grid of who-may-spend-whose-tokens-and-how-much, animated when an approval is granted, an allowance is
              consumed, or a cap is exceeded.
            </p>
            <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
              The Socratic question for this atom is the one the entire DeFi industry gets wrong:{" "}
              <em>why two functions, instead of one</em>? Answering it well is the difference between using a token
              contract and understanding it.
            </p>
            <p className="mt-6 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
              Builds on{" "}
              <Link
                href="/scenes/direct-authorization"
                style={{
                  color: "var(--vermilion)",
                  fontStyle: "italic",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                ii. direct authorization
              </Link>
              . Leads to —{" "}
              <span className="mono" style={{ color: "var(--gold)" }}>
                uniswap
              </span>
              .
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
