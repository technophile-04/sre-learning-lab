// Type system for the Indigo Study Deck.
//   Instrument Serif      — display: card titles, concept lead-ins (elegant, high-contrast)
//   Hanken Grotesk        — body / UI text
//   JetBrains Mono        — code + the tier-1 labels (technical, tracked-out)
//   Noto Serif Devanagari — the giant tier-2 watermark glyphs (सूत्र, दर्शन, …)
import { Hanken_Grotesk, Instrument_Serif, JetBrains_Mono, Noto_Serif_Devanagari } from "next/font/google";

export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  variable: "--font-deva",
});

export const fontVars = `${display.variable} ${body.variable} ${mono.variable} ${devanagari.variable}`;
