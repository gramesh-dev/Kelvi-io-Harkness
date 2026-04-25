import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const ALLOWED_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS_CAP = 8192;

type AnthropicMessage = { role: string; content: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { type: "error", error: { type: "unauthorized", message: "Sign in to use Kelvi AI from this page." } },
      { status: 401 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        type: "error",
        error: {
          type: "configuration_error",
          message: "AI provider is not configured on the server.",
        },
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const model = typeof body.model === "string" ? body.model : ALLOWED_MODEL;
  if (model !== ALLOWED_MODEL) {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request", message: "Unsupported model." } },
      { status: 400 }
    );
  }

  let maxTokens = typeof body.max_tokens === "number" ? body.max_tokens : 500;
  if (!Number.isFinite(maxTokens) || maxTokens < 1) maxTokens = 500;
  maxTokens = Math.min(Math.floor(maxTokens), MAX_TOKENS_CAP);

  const system = typeof body.system === "string" ? body.system : "";
  if (system.length > 200_000) {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request", message: "System prompt too large." } },
      { status: 400 }
    );
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request", message: "messages must be a non-empty array." } },
      { status: 400 }
    );
  }

  const messages: AnthropicMessage[] = [];
  for (const m of rawMessages) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    const content = (m as { content?: string }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || content.length > 100_000) continue;
    messages.push({ role, content });
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request", message: "No valid messages." } },
      { status: 400 }
    );
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ALLOWED_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  const text = await upstream.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { type: "error", error: { type: "api_error", message: "Invalid response from AI provider." } },
      { status: 502 }
    );
  }

  return NextResponse.json(json, { status: upstream.status });
}
