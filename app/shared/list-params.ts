"use client";
import { useSyncExternalStore } from "react";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("list-params", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("list-params", callback);
  };
}
const snapshot = () => window.location.search;
export function useListSearch() {
  return useSyncExternalStore(subscribe, snapshot, () => "");
}
export function clearListParams() {
  window.history.pushState(null, "", window.location.pathname);
  window.dispatchEvent(new Event("list-params"));
}
export function useListParam(
  key: string,
  initial = "",
  allowed?: readonly string[],
): [string, (value: string) => void] {
  const search = useListSearch();
  const raw = new URLSearchParams(search).get(key);
  const value =
    raw !== null && (!allowed || allowed.includes(raw)) ? raw : initial;
  const set = (next: string) => {
    const url = new URL(window.location.href);
    if (next === initial) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    if (
      url.pathname + url.search ===
      window.location.pathname + window.location.search
    )
      return;
    window.history[key === "q" ? "replaceState" : "pushState"](
      null,
      "",
      `${url.pathname}${url.search}`,
    );
    window.dispatchEvent(new Event("list-params"));
  };
  return [value, set];
}
export function useListFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, set] = useListParam(key, "0", ["0", "1"]);
  return [value === "1", (next) => set(next ? "1" : "0")];
}
export function useListNumber(
  key: string,
  initial: number,
  choices: number[],
): [number, (value: number) => void] {
  const [value, set] = useListParam(key, String(initial), choices.map(String));
  return [Number(value), (next) => set(String(next))];
}
