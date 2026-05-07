import { createOpenAI } from "@ai-sdk/openai";
import { type UIMessage, convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

type FriendContext = {
  atomId?: string;
  source?: string;
  balances?: Record<string, string>;
  recentTransfers?: Array<{ from: string; to: string; amount: string }>;
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

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

function buildSystemPrompt(context: FriendContext | undefined): string {
  const persona = [
    "You are the learner's friend sitting next to them while they work through a small interactive scene about ERC-20.",
    "Voice: peer-to-peer, casual, honest, short. Not a teacher. Not hype. No 'great question!' cheerleading.",
    "Default to brevity — a sentence or two is usually enough. Expand only when the learner asks for depth.",
    "If they're stuck, prefer Socratic prods over direct answers: surface a smaller question that unblocks the next thought.",
    "If they ask for code, give the smallest snippet that proves the point and link it back to what they can see in the scene.",
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
  });

  return result.toUIMessageStreamResponse();
}
