import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPTS: Record<string, string> = {
  questioning: `You are Kelvi, a friendly and curious AI learning companion for children ages 5-12. 
Your job is to help children learn by asking them thought-provoking questions, not giving direct answers.
When a child asks a question, respond with guiding questions that help them discover the answer themselves.
Use simple language appropriate for young learners. Be encouraging and patient.
Keep responses concise (2-3 sentences max). Use analogies children can relate to.`,

  guided: `You are Kelvi, a patient AI tutor for children ages 5-12.
In guided mode, you explain concepts step by step, checking understanding along the way.
Break complex ideas into small, digestible pieces. Use examples from everyday life.
After explaining, ask a quick comprehension question before moving on.
Keep language simple and encouraging.`,

  exploration: `You are Kelvi, an enthusiastic AI exploration guide for children ages 5-12.
Help children explore topics freely through conversation. Follow their curiosity.
Share fascinating facts and connections between ideas. Encourage deeper investigation.
Suggest related topics they might enjoy. Keep the sense of wonder alive.
Be concise but rich with interesting details.`,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, message } = body;

  if (!sessionId || !message?.trim()) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 }
    );
  }

  const { data: session, error: sessionError } = await supabase
    .from("learning_sessions")
    .select("id, student_id, org_id, mode, message_count")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const nextOrdinal = (session.message_count ?? 0) + 1;

  const { error: userMsgError } = await serviceClient
    .from("session_messages")
    .insert({
      session_id: sessionId,
      ordinal: nextOrdinal,
      role: "user",
      content: message.trim(),
    });

  if (userMsgError) {
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }

  const { data: history } = await supabase
    .from("session_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("ordinal", { ascending: true })
    .limit(20);

  const messages =
    history?.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })) ?? [];

  const systemPrompt =
    SYSTEM_PROMPTS[session.mode] || SYSTEM_PROMPTS.questioning;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI provider not configured" },
      { status: 500 }
    );
  }

  const startTime = Date.now();

  const aiResponse = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  });

  const latencyMs = Date.now() - startTime;
  const aiData = await aiResponse.json();

  if (!aiResponse.ok) {
    return NextResponse.json(
      { error: aiData.error?.message || "AI request failed" },
      { status: aiResponse.status }
    );
  }

  const assistantContent =
    aiData.content?.[0]?.text ?? "I'm not sure how to respond to that.";
  const inputTokens = aiData.usage?.input_tokens ?? 0;
  const outputTokens = aiData.usage?.output_tokens ?? 0;

  const costMicros = Math.round(
    inputTokens * 3 + outputTokens * 15
  );

  await serviceClient.from("session_messages").insert({
    session_id: sessionId,
    ordinal: nextOrdinal + 1,
    role: "assistant",
    content: assistantContent,
  });

  await serviceClient.from("learning_sessions").update({
    message_count: nextOrdinal + 1,
  }).eq("id", sessionId);

  await serviceClient.from("ai_interactions").insert({
    session_id: sessionId,
    org_id: session.org_id,
    student_id: session.student_id,
    interaction_type: "chat",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    system_prompt: systemPrompt,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_micros: costMicros,
    latency_ms: latencyMs,
  });

  return NextResponse.json({
    content: assistantContent,
    usage: { inputTokens, outputTokens, costMicros, latencyMs },
  });
}
