import { NextRequest, NextResponse } from "next/server";
import { getLab, labCookie, LabError, startLab } from "../../../server/lab";
import { readBody, errorResponse, cookieOptions } from "../../../server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const session = await getLab(request.cookies.get(labCookie)?.value);
    return NextResponse.json(
      {
        scenario: session?.scenario || null,
        remaining: session?.remaining,
        expiresAt: session?.expires_at,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request);
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      !("action" in input)
    )
      throw new LabError("Choose a lab action.");
    if (input.action === "leave") {
      const response = NextResponse.json(
        { path: "/demo/sites" },
        { headers: { "Cache-Control": "no-store" } },
      );
      for (const [name, path] of [
        [labCookie, "/"],
        ["lab_form_field_session", "/demo"],
        ["lab_demo_district_session", "/demo/sites"],
        ["lab_people_session", "/hris"],
      ])
        response.cookies.set(name, "", {
          ...cookieOptions(request, path),
          maxAge: 0,
        });
      return response;
    }
    if (
      input.action !== "start" ||
      !("scenario" in input) ||
      typeof input.scenario !== "string"
    )
      throw new LabError("Choose a listed scenario.");
    const result = await startLab(input.scenario);
    const response = NextResponse.json(
      { path: result.scenario.path, scenario: result.scenario.id },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(labCookie, result.token, {
      ...cookieOptions(request, "/"),
      maxAge: 86400,
    });
    response.cookies.set(
      "lab_form_field_session",
      result.storeToken,
      cookieOptions(request, "/demo"),
    );
    response.cookies.set(
      "lab_demo_district_session",
      result.workspaceToken,
      cookieOptions(request, "/demo/sites"),
    );
    if (result.hrToken)
      response.cookies.set(
        "lab_people_session",
        result.hrToken,
        cookieOptions(request, "/hris"),
      );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
