import { NextResponse } from "next/server";

import { bulkMarkAttended, markAttended } from "@/app/actions/events";

/**
 * Admin-only attendance marking. Two body shapes:
 *
 *   { leadId: string }
 *   { eventId: string, emails: string[] }
 *
 * Both go through server actions that call requireAdmin() — non-admins get
 * a redirect from the action layer, which surfaces here as a thrown error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;

  if (typeof b.leadId === "string") {
    const result = await markAttended(b.leadId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (typeof b.eventId === "string" && Array.isArray(b.emails)) {
    const result = await bulkMarkAttended({
      eventId: b.eventId,
      emails: b.emails.filter((e): e is string => typeof e === "string"),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json(
    { ok: false, error: "Provide leadId or { eventId, emails[] }." },
    { status: 400 }
  );
}
