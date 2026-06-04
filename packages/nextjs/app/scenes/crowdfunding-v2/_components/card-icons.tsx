"use client";

// v2 card presentation: a clean line-icon + a plain English label per card type,
// replacing the original deck's faint Devanagari watermark/glyph. The student
// should be able to glance at the index (or a card's kicker) and know what kind
// of beat it is — read, write, run, think — without decoding a second script.
//
// Some cards are GOTCHAS: the Ethereum traps that cost real money (reentrancy,
// money arriving after the deadline, double-funding). Those get a distinct
// warning label + accent so they read as "pay attention, this is the trap",
// not as just another concept card. Gotcha-ness is derived here by card id so
// the shared deck content stays untouched.
import type { Card } from "~~/lib/deck/types";

type IconProps = { size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Idea({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M9 18h6M10 21h4" />
      <path {...stroke} d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.5 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  );
}
function CodeI({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
    </svg>
  );
}
function Pencil({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" />
      <path {...stroke} d="m14 7 3 3" />
    </svg>
  );
}
function Think({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M4 5h16v11H9l-4 3v-3H4V5Z" />
      <path {...stroke} d="M12 8.2a1.6 1.6 0 0 1 1.6 1.6c0 1.1-1.6 1.3-1.6 2.4M12 14.2h.01" />
    </svg>
  );
}
function Play({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle {...stroke} cx="12" cy="12" r="9" />
      <path {...stroke} d="M10 8.5 16 12l-6 3.5v-7Z" />
    </svg>
  );
}
function Ship({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M12 3c2.5 1.8 4 4.6 4 8a8 8 0 0 1-.6 3l-3.4 2-3.4-2A8 8 0 0 1 8 11c0-3.4 1.5-6.2 4-8Z" />
      <circle {...stroke} cx="12" cy="10" r="1.6" />
      <path {...stroke} d="M8.5 17 6 19l1 2 2-1M15.5 17l2.5 2-1 2-2-1" />
    </svg>
  );
}
function Recap({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M5 4h11l3 3v13H5V4Z" />
      <path {...stroke} d="m8.5 11 2 2 4-4" />
    </svg>
  );
}
function Warning({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path {...stroke} d="M12 4 3 19h18L12 4Z" />
      <path {...stroke} d="M12 10v4M12 16.5h.01" />
    </svg>
  );
}

type Meta = { label: string; Icon: (p: IconProps) => React.ReactElement };

const BY_TYPE: Record<Card["type"], Meta> = {
  concept: { label: "Idea", Icon: Idea },
  code: { label: "Code", Icon: CodeI },
  "your-turn": { label: "Your turn", Icon: Pencil },
  think: { label: "Think", Icon: Think },
  "try-it": { label: "Try it", Icon: Play },
  "ship-it": { label: "Ship it", Icon: Ship },
  recap: { label: "Recap", Icon: Recap },
};

// The Ethereum traps. These are the whole reason the course exists, so they get
// their own label + warning accent instead of blending in as plain concepts.
export const GOTCHA_IDS: ReadonlySet<string> = new Set([
  "sending-eth", // reentrancy: external call before zeroing the balance
  "zero-first", // checks-effects-interactions
  "too-late", // ETH arriving after the deadline / via selfdestruct
  "modifier", // double-funding guard
]);

// The reentrancy run-the-bug demo is mounted on this card (the one that first
// raises "sending ETH is where it gets scary").
export const REENTRANCY_DEMO_ID = "sending-eth";

export function isGotcha(card: Card): boolean {
  return GOTCHA_IDS.has(card.id);
}

export function cardMeta(card: Card): { label: string; Icon: (p: IconProps) => React.ReactElement; gotcha: boolean } {
  if (isGotcha(card)) return { label: "Gotcha", Icon: Warning, gotcha: true };
  const m = BY_TYPE[card.type];
  return { label: m.label, Icon: m.Icon, gotcha: false };
}

// type icon without the gotcha override — used in the index where we still show
// the structural type but flag gotchas with a separate dot.
export function typeMeta(card: Card): Meta {
  return BY_TYPE[card.type];
}
