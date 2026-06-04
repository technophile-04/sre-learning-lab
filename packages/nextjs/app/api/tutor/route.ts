// Contextual AI tutor for the /labs alternatives. Same OpenRouter + AI-SDK wiring
// as /api/grade, but a free-form chat reply instead of a structured verdict. It
// knows the current task, the learner's code, and the reference answer — and is
// told, hard, not to paste the answer (Boot.dev's protect-the-struggle rule).
//
// Non-streaming on purpose: returns { reply } so the lab clients can stay simple,
// and degrade to their offline hint ladders when the key is missing.
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 30;

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

type TutorMessage = { role: "user" | "assistant"; content: string };

type TutorContext = {
  /** which lab is asking — only used for light framing */
  surface?: string;
  /** the stage / lesson title the learner is on */
  stage?: string;
  /** the concept prose for the current beat */
  concept?: string;
  /** the active task prompt, if any */
  task?: string;
  /** the learner's current code or draft answer, if any */
  learnerCode?: string;
  /** the reference solution — the tutor may reason about it but must NOT paste it */
  canonical?: string;
  /** how far up the hint ladder the learner has climbed (0 = first ask) */
  ladderRung?: number;
};

type TutorRequest = {
  messages: TutorMessage[];
  context?: TutorContext;
};

function systemPrompt(ctx: TutorContext | undefined): string {
  const base = [
    "You are a contextual coding tutor inside an interactive Solidity lesson about a crowdfunding contract.",
    "You teach Socratically: start with the smallest nudge that could unblock the learner, ask a guiding question, and escalate only if they're still stuck.",
    "HARD RULE: never paste the full reference solution. You may name the relevant concept, point at the line that needs work, give a pseudocode shape, or correct a specific mistake — but the learner writes the code.",
    "Voice: a senior dev helping a junior. Lead with the situation, be concise (2-4 sentences), plain. No hype, no em dashes, no bullet lists unless asked.",
  ];
  if (ctx?.ladderRung && ctx.ladderRung >= 3) {
    base.push(
      "The learner has asked for help several times and is clearly stuck. You may now give a near-complete pseudocode walkthrough, but still leave the final syntax for them to type.",
    );
  }
  const lines = [base.join(" ")];
  if (ctx?.stage) lines.push(`\nCurrent lesson: ${ctx.stage}`);
  if (ctx?.concept) lines.push(`Concept being taught: ${ctx.concept}`);
  if (ctx?.task) lines.push(`The task the learner is on: ${ctx.task}`);
  if (ctx?.learnerCode) lines.push(`What the learner has written so far:\n${ctx.learnerCode}`);
  if (ctx?.canonical)
    lines.push(`Reference solution (for your reasoning only — do NOT paste it back):\n${ctx.canonical}`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY is not set on the server." }, { status: 500 });
  }

  const { messages, context } = (await req.json()) as TutorRequest;
  const modelId = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  try {
    const { text } = await generateText({
      model: openrouter.chat(modelId),
      system: systemPrompt(context),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    return Response.json({ reply: text });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
