import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatInterface } from "./chat-interface";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("learning_sessions")
    .select(
      "id, mode, topic, started_at, ended_at, students(id, display_name, full_name)"
    )
    .eq("id", sessionId)
    .single();

  if (!session) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("session_messages")
    .select("id, ordinal, role, content, created_at")
    .eq("session_id", sessionId)
    .order("ordinal", { ascending: true });

  const student = session.students as any;
  const studentName = student?.display_name || student?.full_name || "Student";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="border-b border-kelvi-border bg-surface py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-serif text-lg font-semibold text-kelvi-ink">
            {session.topic || session.mode} session
          </h1>
          <p className="text-xs text-text-muted">
            {studentName} · {session.mode} mode
          </p>
        </div>
        <a
          href="/family/learn"
          className="text-sm text-text-secondary hover:text-text-primary transition"
        >
          New session
        </a>
      </header>

      <ChatInterface
        sessionId={session.id}
        initialMessages={messages ?? []}
        studentName={studentName}
        mode={session.mode}
      />
    </div>
  );
}
