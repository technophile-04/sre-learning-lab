"use client";

// atom ii. — direct authorization
//
// SCENE STUB. Reachable from the atlas, dressed in the same editorial aesthetic, but
// the live tinkering and AI integration land in a later iteration. The sketch banner
// makes the state honest — this is the v0.1 "we know this is coming" placeholder, not
// a finished atom.
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

export default function DirectAuthorizationScene() {
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
                atom <span className="italic">ii.</span> of <span className="italic">v.</span>
              </span>
              <span className="mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ink-soft)" }}>
                erc-20 — a primer
              </span>
            </div>
            <Link
              href="/"
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
            direct authorization
          </h1>
          <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Move tokens you own — and only those. The contract checks your signature before it touches the ledger.
          </p>
          <div className="mt-10 h-px w-full" style={{ background: "var(--rule)" }} />
        </header>

        <section className="mx-auto max-w-[1280px] px-10 pb-24">
          <div
            className="px-8 py-10"
            style={{
              borderLeft: "2px solid var(--gold)",
              background: "rgba(154, 139, 94, 0.04)",
            }}
          >
            <div className="mono mb-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--gold)" }}>
              fig. ø — sketched
            </div>
            <p className="text-[18px] leading-[1.65]" style={{ color: "var(--ink)", fontStyle: "italic" }}>
              This scene is sketched, not yet drawn.
            </p>
            <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
              When it lands, it will explore <span className="mono">transfer</span> as the first authorisation primitive
              — <span className="mono">msg.sender</span> as identity, balance checks as guardrails, and the moment
              ownership becomes movable. You will see a single account&apos;s view of the world: the contract from{" "}
              <em>their</em> perspective, with their signature being the only key that fits.
            </p>
            <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "var(--ink-soft)" }}>
              The atom builds directly on{" "}
              <Link
                href="/scenes/balance-ledger"
                style={{
                  color: "var(--vermilion)",
                  fontStyle: "italic",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                i. balance ledger
              </Link>
              ; if you have not walked through that one yet, that is the better place to begin.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
