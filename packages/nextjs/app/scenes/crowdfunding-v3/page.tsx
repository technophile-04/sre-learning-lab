"use client";

import "../../labs/labs.css";
import "../crowdfunding/deck.css";
import { DeckV3 } from "./_components/DeckV3";
import "./deck-v3.css";

export default function CrowdfundingV3() {
  return (
    <main className="deck-root deck-root-v3" style={{ minHeight: "100vh" }}>
      <DeckV3 />
    </main>
  );
}
