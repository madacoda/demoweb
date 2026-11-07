import { NextRequest, NextResponse } from "next/server";
import { performStoreAction } from "../_lib/store";
import { getLab, labCookie, runWithLab } from "../../../server/lab";
import { readBody, cookieOptions, errorResponse } from "../../../server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request);
    const lab = await getLab(request.cookies.get(labCookie)?.value);
    const cookie = lab ? "lab_form_field_session" : "form_field_session";
    const { result, lost } = await runWithLab(lab, "store", input, () =>
      performStoreAction(request.cookies.get(cookie)?.value, input),
    );
    const response = NextResponse.json(
      lost
        ? {
            error:
              "The response was interrupted. Please retry your unchanged submission.",
          }
        : {
            state: result.state,
            orderId: result.orderId,
            ticketId: result.ticketId,
          },
      { status: lost ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(cookie, result.token, cookieOptions(request, "/demo"));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
