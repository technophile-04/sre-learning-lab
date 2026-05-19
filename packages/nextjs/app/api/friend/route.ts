import { createOpenAI } from "@ai-sdk/openai";
import { type UIMessage, convertToModelMessages, jsonSchema, stepCountIs, streamText, tool } from "ai";

export const maxDuration = 30;

type FriendContext = {
  atomId?: string;
  source?: string;
  balances?: Record<string, string>;
  recentTransfers?: Array<{ from: string; to: string; amount: string }>;
  /** the line the learner's cursor is on — the teacher points here. */
  cursorLine?: { number: number; text: string };
};

type FriendRequestBody = {
  messages: UIMessage[];
  context?: FriendContext;
};

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// deepseek v4 flash — fast, cheap, 1M context. The whole walkthrough leans on
// it calling pointAtLine every turn; if tool adherence is shaky, override with
// OPENROUTER_MODEL (e.g. anthropic/claude-sonnet-4.5) to isolate model vs code.
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

// client-forwarded tool (no execute) — the teacher's pointing hand. Calling
// it moves the learner's cursor + the gutter manicule to that line.
const tools = {
  pointAtLine: tool({
    description:
      "Move the learner's cursor and your pointing hand to a specific line of the contract. Call this whenever you want them to look at a line — never tell them to scroll there themselves.",
    inputSchema: jsonSchema<{ line: number; note?: string }>({
      type: "object",
      properties: {
        line: { type: "number", description: "1-based line number to point at" },
        note: { type: "string", description: "optional short reason for your own continuity" },
      },
      required: ["line"],
      additionalProperties: false,
    }),
  }),
};

function buildSystemPrompt(context: FriendContext | undefined): string {
  const persona = [
    "You are the learner's teacher, walking them line by line through a small ERC-20 contract inside an interactive scene. You run a guided tour — you never lecture or dump the whole file.",
    "Your pointing hand is the pointAtLine tool. HARD RULE: at the very start of every turn, call pointAtLine for the exact line you are about to teach, so your finger and your words always agree. Skip blank lines and lines that are only a brace; point at meaningful code only.",
    "First turn: call pointAtLine(1), greet in one short sentence, say you'll walk them through the contract together, explain line 1 in one sentence, then ask ONE small question that moves things forward (for example, what they think the next line of code does) and tell them to answer and you'll move on.",
    "Every later turn: in one line, react to their answer — confirm it, or gently correct it. Then call pointAtLine for the next meaningful line, say what it does in a sentence OR ask them what they think it does, and end with exactly one question. One line of code, or one tight logical group, per turn. Keep moving; never dump ahead.",
    "Core rule: if they ask 'what is this line', answer it in a sentence. But the understanding-bearing 'why' and 'what if' stays a question — point, then ask, never pre-empt a question with its answer.",
    "Voice: warm, exacting, concise, plain. No cheerleading, no hype, no walls of text, no em dashes. Ground questions in what they can see — the balances, the recent transfers, the line you're pointing at.",
  ].join(" ");

  if (!context) return persona;

  const lines: string[] = [persona, "", "Scene context (what the learner is looking at right now):"];

  if (context.atomId) {
    lines.push(`- Current atom: ${context.atomId}`);
  }
  if (context.source) {
    lines.push(`- Curated from: ${context.source}`);
  }
  if (context.balances && Object.keys(context.balances).length > 0) {
    const formatted = Object.entries(context.balances)
      .map(([addr, amount]) => `${addr}=${amount}`)
      .join(", ");
    lines.push(`- Live balances: ${formatted}`);
  }
  if (context.recentTransfers && context.recentTransfers.length > 0) {
    const formatted = context.recentTransfers
      .slice(-5)
      .map(t => `${t.from} → ${t.to} (${t.amount})`)
      .join("; ");
    lines.push(`- Recent transfers: ${formatted}`);
  }
  if (context.cursorLine) {
    lines.push(`- Cursor is on line ${context.cursorLine.number}: \`${context.cursorLine.text.trim()}\``);
    lines.push("Anchor your reply to that line unless they ask about something else.");
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json({ error: "OPENROUTER_API_KEY is not set on the server." }, { status: 500 });
  }

  const { messages, context } = (await req.json()) as FriendRequestBody;

  const modelId = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const result = streamText({
    model: openrouter.chat(modelId),
    system: buildSystemPrompt(context),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
