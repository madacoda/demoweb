import { NextRequest, NextResponse } from "next/server";
import { performStoreAction, StoreError } from "../_lib/store";

export const runtime = "nodejs";
const cookie = "form_field_session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url);
  requestOrigin.host = request.headers.get("host") || requestOrigin.host;
  if (
    (origin && origin !== requestOrigin.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { error: "This request must come from the store." },
      { status: 403 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new StoreError("A request body is required.");
    const parts: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new StoreError("That request is too large.", 413);
      }
      parts.push(part.value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(parts).toString("utf8"));
    } catch {
      throw new StoreError("Please send valid JSON.");
    }
    const result = await performStoreAction(
      request.cookies.get(cookie)?.value,
      input,
    );
    const response = NextResponse.json(
      {
        state: result.state,
        orderId: result.orderId,
        ticketId: result.ticketId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(cookie, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/demo",
      maxAge: 30 * 86400,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof StoreError
            ? error.message
            : "We couldn’t save your changes. Please try again.",
      },
      {
        status: error instanceof StoreError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
