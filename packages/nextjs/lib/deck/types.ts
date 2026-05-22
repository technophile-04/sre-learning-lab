// The deck model — a challenge is an ordered array of typed cards the learner
// walks through one at a time (a quire of leaves). Each card type carries its
// own payload; the deck container switches on `type` to render it.
//
// Two-tier naming: `tier1` is the plain label the learner reads (THE IDEA,
// YOUR TURN, …); `tier2` is the faint Sanskrit word behind it (sutra, lekhana,
// …). tier2 is decorative — never load-bearing for comprehension.

export type SolFile = "CrowdFund.sol" | "FundingRecipient.sol";

type CardBase = {
  id: string;
  tier1: string;
  tier2: string;
  /** short section heading shown atop the card (e.g. "Standards") */
  title: string;
};

/** THE IDEA · sutra — concept prose (markdown). No interaction. */
export type ConceptCard = CardBase & {
  type: "concept";
  body: string;
};

/** THE CODE · darshan — show the running source for a file. With anchors, the
 *  surroundings dim and the hand hovers the focused region; without them the whole
 *  file shows (orientation cards). Read-only. Anchors match against the running
 *  source so they survive edits (line numbers shift; text doesn't). */
export type CodeCard = CardBase & {
  type: "code";
  file: SolFile;
  fromAnchor?: string;
  toAnchor?: string;
  /** the explanation the teacher gives about the focused region */
  note: string;
};

/** YOUR TURN · lekhana — learner writes a line/block; AI grades it. The blank
 *  in the skeleton is marked by `slot`; on completion the store fills that slot
 *  with the learner's line (if judged equivalent) or the canonical one. */
export type YourTurnCard = CardBase & {
  type: "your-turn";
  file: SolFile;
  /** the slot token in the skeleton this card fills, e.g. "__MINT__" */
  slot: string;
  prompt: string;
  /** starter text shown in the editable field */
  placeholder: string;
  /** the reference solution that always threads forward if the learner is wrong */
  canonical: string;
};

/** THINK · prashna — open-ended Socratic question, AI-graded against keyword
 *  rubric (from CONCEPTS.yaml). Non-blocking. */
export type ThinkCard = CardBase & {
  type: "think";
  question: string;
  /** ideas a good answer should touch — the grader's rubric */
  rubricConcepts: string[];
  hint: string;
};

export type TryItScenario = "contribute" | "failure-refund" | "success-forward";

/** TRY IT · prayoga — run a function on the learner's own (auto-deployed) code
 *  and watch state change. Plugged to the running source. */
export type TryItCard = CardBase & {
  type: "try-it";
  scenario: TryItScenario;
  body: string;
};

/** SHIP IT · prakashana — deploy the finished contracts to the in-browser chain. */
export type ShipItCard = CardBase & {
  type: "ship-it";
  body: string;
};

/** WHAT YOU BUILT · samhita — the assembled contracts the learner co-authored. */
export type RecapCard = CardBase & {
  type: "recap";
  body: string;
};

export type Card = ConceptCard | CodeCard | YourTurnCard | ThinkCard | TryItCard | ShipItCard | RecapCard;

export type Deck = {
  id: string;
  /** human title shown in the atlas + deck header */
  title: string;
  /** the SRE challenge this maps to */
  challenge: string;
  /** skeleton sources with `__SLOT__` tokens the YOUR TURN cards fill */
  skeleton: Record<SolFile, string>;
  cards: Card[];
};
