// Grader for THINK and YOUR TURN cards. Same OpenRouter + AI-SDK wiring as the
// friend route, but non-streaming and structured: it returns { verdict, feedback }.
//
// THINK: judge an open-ended answer against the rubric concepts (meaning, not
// exact keywords). YOUR TURN: judge whether the learner's Solidity is
// functionally equivalent to the canonical line (names/formatting don't matter).
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, jsonSchema } from "ai";

export const maxDuration = 30;

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

type ThinkRequest = {
  mode: "think";
  question: string;
  rubricConcepts: string[];
  hint: string;
  answer: string;
};

type YourTurnRequest = {
  mode: "your-turn";
  prompt: string;
  canonical: string;
  answer: string;
  file: string;
};

type GradeRequest = ThinkRequest | YourTurnRequest;

const verdictSchema = jsonSchema<{ verdict: "pass" | "partial" | "miss"; feedback: string }>({
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "partial", "miss"] },
    feedback: { type: "string", description: "1-2 sentences, warm and specific. No hype, no em dashes." },
  },
  required: ["verdict", "feedback"],
  additionalProperties: false,
});

function thinkPrompt(r: ThinkRequest): { system: string; prompt: string } {
  const system = [
    "You grade a learner's open-ended answer to a Socratic question in an ERC-20 / smart-contract lesson.",
    "Judge by meaning, not exact keywords. The listed ideas are what a strong answer touches — equivalent phrasing counts.",
    "pass: captures the core idea. partial: on the right track but missing or muddling something important. miss: wrong, empty, or doesn't engage.",
    "Feedback: 1-2 sentences. Acknowledge what they got, then nudge toward what's missing WITHOUT just stating the full answer. Warm, plain, concise. No hype, no em dashes.",
  ].join(" ");
  const prompt = [
    `Question: ${r.question}`,
    `Ideas a strong answer touches: ${r.rubricConcepts.join(", ")}`,
    `Hint given to the learner: ${r.hint}`,
    `Learner's answer: ${r.answer || "(blank)"}`,
  ].join("\n");
  return { system, prompt };
}

function yourTurnPrompt(r: YourTurnRequest): { system: string; prompt: string } {
  const system = [
    "You grade a single line or short block of Solidity a learner wrote to fill a gap, against a reference solution.",
    "Judge functional equivalence, not exact text: different variable names, spacing, or equivalent expressions are fine.",
    "pass: functionally correct — it would compile and do what's asked. partial: close but with a real flaw (wrong variable, missing a step, wrong operator). miss: wrong, empty, or not an attempt.",
    "Feedback: 1-2 sentences, specific about what's right or wrong. If it's off, hint at the fix without pasting the full solution. Plain, concise. No hype, no em dashes.",
  ].join(" ");
  const prompt = [
    `Task: ${r.prompt}`,
    `Reference solution (${r.file}):\n${r.canonical}`,
    `Learner wrote:\n${r.answer || "(blank)"}`,
  ].join("\n");
  return { system, prompt };
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY is not set on the server." }, { status: 500 });
  }

  const body = (await req.json()) as GradeRequest;
  const { system, prompt } = body.mode === "think" ? thinkPrompt(body) : yourTurnPrompt(body);
  const modelId = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  try {
    const { object } = await generateObject({
      model: openrouter.chat(modelId),
      schema: verdictSchema,
      system,
      prompt,
    });
    return Response.json(object);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
