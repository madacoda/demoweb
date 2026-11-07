import { notFound } from "next/navigation";
import { events, isSite, jobs, rooms, sites } from "../../_lib/data";
import { Website } from "../../website";
type Props = { params: Promise<{ site: string; path?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const { site } = await params;
  const brand = sites.find((s) => s.id === site);
  return {
    title: brand ? `${brand.name} — ${brand.tagline}` : "Page not found",
    description: brand?.description,
    robots: { index: false, follow: false },
  };
}
export default async function Page({ params }: Props) {
  const { site, path = [] } = await params;
  if (!isSite(site)) notFound();
  const single = {
    haven: ["bookings"],
    thyme: ["basket", "orders"],
    daybreak: ["list", "new"],
    gather: ["tickets"],
    hireline: ["saved", "applications"],
    careloop: ["new", "help"],
  };
  const valid =
    path.length === 0 ||
    (path.length === 1 && single[site].includes(path[0])) ||
    (path.length === 2 &&
      ((site === "haven" &&
        path[0] === "stays" &&
        rooms.some((r) => r.id === path[1])) ||
        (site === "gather" &&
          path[0] === "events" &&
          events.some((e) => e.id === path[1])) ||
        (site === "hireline" &&
          path[0] === "jobs" &&
          jobs.some((j) => j.id === path[1])) ||
        (site === "daybreak" &&
          path[0] === "tasks" &&
          /^(task-\d+|DB-[A-F0-9]{8})$/.test(path[1])) ||
        (site === "careloop" &&
          path[0] === "tickets" &&
          /^CL-(\d{4}|[A-F0-9]{8})$/.test(path[1]))));
  if (!valid) notFound();
  return <Website site={site} path={path} />;
}
