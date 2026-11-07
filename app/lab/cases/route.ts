import { scenarios, workflows, demoAccount } from "../catalog";
export function GET() {
  return Response.json(
    {
      schemaVersion: 1,
      format: "demo-district-acceptance-catalog",
      note: "Acceptance plans, not a Veriflow workflow-schema import. Start each scenario with POST /lab/api {action:start, scenario:id} in the same browser context before following its steps. Test runs use isolated PostgreSQL data. The sample credential is public synthetic data only.",
      demoAccount,
      scenarios,
      workflows,
    },
    {
      headers: {
        "Content-Disposition":
          'attachment; filename="demo-district-uat-cases.json"',
      },
    },
  );
}
