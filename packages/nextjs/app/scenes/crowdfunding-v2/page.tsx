"use client";

import "../../labs/labs.css";
import { fontVars } from "../crowdfunding/_components/fonts";
import "../crowdfunding/deck.css";
import { DeckV2 } from "./_components/DeckV2";
import "./deck-v2.css";

export default function CrowdfundingV2() {
  return (
    <main className={`deck-root ${fontVars}`} style={{ minHeight: "100vh" }}>
      <DeckV2 />
    </main>
  );
}
