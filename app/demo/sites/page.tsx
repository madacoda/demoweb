import type { Metadata } from "next";
import { Directory } from "./directory";
export const metadata: Metadata = {
  title: "The Demo District — seven working websites",
  description:
    "Seven independent sample websites with complete, persistent user journeys.",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Directory />;
}
