"use client";

import { Deck } from "./_components/Deck";
import { fontVars } from "./_components/fonts";
import "./deck.css";

export default function TokenVendorScene() {
  return (
    <main className={`deck-root ${fontVars}`}>
      <Deck />
    </main>
  );
}
