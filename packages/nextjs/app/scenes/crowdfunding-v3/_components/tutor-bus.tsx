"use client";

// A tiny bus so a card can hand the right-column tutor its current task and steer
// which panel the learner sees, without the shell having to know which card is
// showing. Cards call setTask/setAttempted as the learner works; "ask the tutor"
// calls open("tutor"); submitting a line calls open("build") to watch it land.
import { createContext, useContext } from "react";
import type { TutorTask } from "../../../labs/_components/TutorPanel";

export type RightTab = "build" | "tutor";

export type TutorBus = {
  setTask: (task: TutorTask | null) => void;
  setAttempted: (attempted: boolean) => void;
  /** show a specific right-column panel */
  open: (tab: RightTab) => void;
};

const noop: TutorBus = { setTask: () => {}, setAttempted: () => {}, open: () => {} };

export const TutorBusContext = createContext<TutorBus>(noop);

export function useTutorBus(): TutorBus {
  return useContext(TutorBusContext);
}
