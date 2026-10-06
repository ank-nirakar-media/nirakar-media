import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomToken } from "@/lib/crypto";
import { askPurple } from "@/lib/ask/sales";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VISITOR_COOKIE = "ap_visitor";

// The website chat posts here: { conversationId?, message, page? }. A random visitor id in a
// cookie ties a visitor's chats together for the daily limit. No IP address is stored.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { conversationId?: unknown; message?: unknown; page?: unknown };
  const jar = await cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(visitor)) {
    visitor = randomToken(16);
    jar.set(VISITOR_COOKIE, visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  try {
    const result = await askPurple({
      conversationId: typeof body.conversationId === "string" ? body.conversationId : undefined,
      message: typeof body.message === "string" ? body.message : "",
      page: typeof body.page === "string" ? body.page : "",
      visitor,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Ask Purple failed", e);
    return NextResponse.json({ error: "Ask Purple is unavailable right now. Please use the contact form." }, { status: 500 });
  }
}
