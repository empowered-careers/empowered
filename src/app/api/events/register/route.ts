import { NextResponse } from "next/server";

import { registerLead } from "@/app/actions/events";

/**
 * Public registration endpoint for the events landing page.
 *
 * The landing page can either call the `registerLead` server action directly
 * (preferred — no extra hop) or POST JSON here. This route exists for
 * external triggers (third-party widgets, scheduled imports) and for tests.
 *
 * Body: { eventId, email, firstName?, source, sourceRef? }
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
  if (typeof b.eventId !== "string" || typeof b.email !== "string") {
    return NextResponse.json(
      { ok: false, error: "eventId and email are required." },
      { status: 400 }
    );
  }

  const result = await registerLead({
    eventId: b.eventId,
    email: b.email,
    firstName: typeof b.firstName === "string" ? b.firstName : undefined,
    source: typeof b.source === "string" ? b.source : "direct",
    sourceRef: typeof b.sourceRef === "string" ? b.sourceRef : null,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
