// Per-card-type presentation: the tier-2 Devanagari watermark glyph and a short
// transliteration. The tier-1 label + tier-2 latin word live on each card; this
// adds the script glyph that bleeds off the card edge as the type's signature.
import type { Card } from "~~/lib/deck/types";

export const DEVANAGARI: Record<Card["type"], string> = {
  concept: "सूत्र", // sutra
  code: "दर्शन", // darshan
  "your-turn": "लेखन", // lekhana
  think: "प्रश्न", // prashna
  "try-it": "प्रयोग", // prayoga
  "ship-it": "प्रकाशन", // prakashana
  recap: "संहिता", // samhita
};
