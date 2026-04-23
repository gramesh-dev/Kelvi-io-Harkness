import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = request.nextUrl.searchParams.get("student_id");
  if (!studentId) return NextResponse.json({ error: "student_id required" }, { status: 400 });

  // Verify access
  const { data: student } = await supabase
    .from("students").select("id").eq("id", studentId).maybeSingle();
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch sessions
  const { data: sessions, error } = await serviceClient
    .from("learning_sessions")
    .select("id, topic, started_at, ended_at, message_count, metadata")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch all messages for these sessions in one query
  const sessionIds = (sessions ?? []).map((s) => s.id);
  let messagesBySession: Record<string, { role: string; content: string; question_type: string | null }[]> = {};

  if (sessionIds.length > 0) {
    const { data: messages } = await serviceClient
      .from("session_messages")
      .select("session_id, ordinal, role, content, question_type")
      .in("session_id", sessionIds)
      .order("ordinal", { ascending: true });

    for (const m of messages ?? []) {
      if (!messagesBySession[m.session_id]) messagesBySession[m.session_id] = [];
      messagesBySession[m.session_id].push({
        role: m.role,
        content: m.content,
        question_type: m.question_type,
      });
    }
  }

  const result = (sessions ?? []).map((s) => ({
    ...s,
    messages: messagesBySession[s.id] ?? [],
  }));

  return NextResponse.json({ sessions: result });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { student_id, topic, message_count, started_at, ended_at, planet, messages } = body;

  if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 });

  // Verify access
  const { data: student } = await supabase
    .from("students").select("id, org_id").eq("id", student_id).maybeSingle();
  if (!student) return NextResponse.json({ error: "Student not found or access denied" }, { status: 404 });

  const { data: session, error } = await serviceClient
    .from("learning_sessions")
    .insert({
      student_id: student.id,
      org_id: student.org_id,
      initiated_by: user.id,
      mode: "exploration",
      topic: topic || (planet ? `${planet} Planet` : "Galaxy exploration"),
      started_at: started_at || new Date().toISOString(),
      ended_at: ended_at || new Date().toISOString(),
      message_count: message_count ?? 0,
      metadata: { source: "galaxy", planet: planet ?? null },
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bulk-insert transcript if provided
  if (Array.isArray(messages) && messages.length > 0) {
    const rows = messages.map((m: { role: string; content: string }, i: number) => ({
      session_id: session.id,
      ordinal: i + 1,
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
    await serviceClient.from("session_messages").insert(rows);
  }

  return NextResponse.json({ id: session.id });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_id, pcg } = body;

  if (!session_id || !pcg) return NextResponse.json({ error: "session_id and pcg required" }, { status: 400 });

  // Verify session belongs to a student this user can access
  const { data: session } = await supabase
    .from("learning_sessions").select("id, metadata").eq("id", session_id).maybeSingle();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updatedMeta = { ...(session.metadata as object ?? {}), pcg };
  await serviceClient
    .from("learning_sessions")
    .update({ metadata: updatedMeta })
    .eq("id", session_id);

  return NextResponse.json({ ok: true });
}
