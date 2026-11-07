"use client";
import type { SiteId } from "./_lib/data";
import { DemoProvider, Shell } from "./ui";
import { Haven } from "./haven";
import { Thyme } from "./thyme";
import { Daybreak } from "./daybreak";
import { Gather } from "./gather";
import { Hireline } from "./hireline";
import { Careloop } from "./careloop";
export function Website({ site, path }: { site: SiteId; path: string[] }) {
  return (
    <DemoProvider key={`${site}/${path.join("/")}`}>
      <Shell site={site} path={path}>
        {site === "haven" ? (
          <Haven path={path} />
        ) : site === "thyme" ? (
          <Thyme path={path} />
        ) : site === "daybreak" ? (
          <Daybreak path={path} />
        ) : site === "gather" ? (
          <Gather path={path} />
        ) : site === "hireline" ? (
          <Hireline path={path} />
        ) : (
          <Careloop path={path} />
        )}
      </Shell>
    </DemoProvider>
  );
}
