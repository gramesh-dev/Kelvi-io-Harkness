import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type Payload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  organization?: string;
  roleRequested?: string;
  source?: string;
};

const ALLOWED_ROLES = new Set(["family", "school", "individual", "other"]);

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const firstName = normalize(body.firstName);
    const lastName = normalize(body.lastName);
    const email = normalize(body.email).toLowerCase();
    const organization = normalize(body.organization) || null;
    const roleRequested = normalize(body.roleRequested).toLowerCase();
    const source = normalize(body.source) || "marketing_site";

    if (!firstName || !lastName || !email || !roleRequested) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (!ALLOWED_ROLES.has(roleRequested)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const admin = createServiceClient();
    const { error } = await admin.from("waitlist_requests").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      organization,
      role_requested: roleRequested,
      source,
      status: "new",
    });

    if (error) {
      return NextResponse.json({ error: "Could not save request." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
