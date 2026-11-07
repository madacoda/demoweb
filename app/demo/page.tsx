import type { Metadata } from "next";
import { Storefront } from "./storefront";

export const metadata: Metadata = {
  title: "Form & Field — Everyday things, thoughtfully made",
  description:
    "Discover considered stationery, desk objects, and everyday essentials from Form & Field.",
  robots: { index: false, follow: false },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ bug?: string | string[] }>;
}) {
  const bug = (await searchParams).bug;
  const scenario = bug === "1" ? "broken" : bug === "0" ? "fixed" : undefined;
  return (
    <Storefront view={scenario ? "checkout" : "home"} scenario={scenario} />
  );
}
