import { NextRequest, NextResponse } from "next/server";
import { LabError } from "./lab";
export function checkOrigin(request: NextRequest) {
  const url = new URL(request.url);
  url.host = request.headers.get("host") || url.host;
  if (
    (request.headers.has("origin") &&
      request.headers.get("origin") !== url.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new LabError("Please send this request from the website.", 403);
}
export async function readBody(request: NextRequest): Promise<unknown> {
  checkOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new LabError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new LabError("This request is too large.", 413);
    }
    chunks.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new LabError("Please send valid JSON.");
  }
}
export function errorResponse(error: unknown) {
  const known =
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number";
  return NextResponse.json(
    {
      error: known
        ? error.message
        : "We couldn't save that change. Please try again.",
    },
    {
      status: known ? (error.status as number) : 500,
      headers: {
        "Cache-Control": "no-store",
        ...(error instanceof LabError && error.retryAfter
          ? { "Retry-After": error.retryAfter }
          : {}),
      },
    },
  );
}
export function cookieOptions(request: NextRequest, path: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path,
    maxAge: 30 * 86400,
  };
}
