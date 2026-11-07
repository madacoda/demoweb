import { NextRequest, NextResponse } from "next/server";
import { performDemoAction } from "../_lib/workspace";
import { getLab, labCookie, runWithLab } from "../../../../server/lab";
import {
  readBody,
  cookieOptions,
  errorResponse,
} from "../../../../server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request);
    const lab = await getLab(request.cookies.get(labCookie)?.value);
    const cookie = lab ? "lab_demo_district_session" : "demo_district_session";
    const { result, lost } = await runWithLab(lab, "workspace", input, () =>
      performDemoAction(request.cookies.get(cookie)?.value, input),
    );
    const response = NextResponse.json(
      lost
        ? {
            error:
              "The response was interrupted. Please retry your unchanged submission.",
          }
        : { state: result.state, id: result.id },
      { status: lost ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(
      cookie,
      result.token,
      cookieOptions(request, "/demo/sites"),
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
