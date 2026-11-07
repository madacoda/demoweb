import { notFound } from "next/navigation";
import { People } from "../people";
export const metadata = { title: "People | Time away, thoughtfully managed" };
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  if (
    path.length > 2 ||
    (path.length &&
      !["login", "requests", "new", "approvals", "balances", "audit"].includes(
        path[0],
      )) ||
    (path.length === 2 &&
      (path[0] !== "requests" || !/^LV-[A-Z0-9-]+$/.test(path[1])))
  )
    notFound();
  return <People path={path} />;
}
