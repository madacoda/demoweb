import { NextRequest, NextResponse } from "next/server";
import { DemoError, performDemoAction } from "../_lib/workspace";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = new URL(request.url);
  origin.host = request.headers.get("host") || origin.host;
  if (
    (request.headers.has("origin") &&
      request.headers.get("origin") !== origin.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { error: "Please send this request from the website." },
      { status: 403 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new DemoError("A request body is required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new DemoError("This request is too large.", 413);
      }
      chunks.push(chunk.value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new DemoError("Please send valid JSON.");
    }
    const result = await performDemoAction(
      request.cookies.get("demo_district_session")?.value,
      input,
    );
    const response = NextResponse.json(
      { state: result.state, id: result.id },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set("demo_district_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/demo/sites",
      maxAge: 30 * 86400,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof DemoError
            ? error.message
            : "We couldn't save that change. Please try again.",
      },
      {
        status: error instanceof DemoError ? error.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
