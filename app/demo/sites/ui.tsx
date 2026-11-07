"use client";
import Link from "next/link";
import { clearListParams, useListSearch } from "../../shared/list-params";
import {
  createContext,
  cloneElement,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type ReactElement,
} from "react";
import { type SiteId, type Workspace, sites } from "./_lib/data";
import s from "./sites.module.css";

type Result = { state: Workspace; id?: string };
type Context = {
  state: Workspace | null;
  busy: boolean;
  error: string;
  notice: string;
  act: (
    input: Record<string, unknown>,
    message?: string,
  ) => Promise<Result | null>;
};
const DemoContext = createContext<Context | null>(null);
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("DemoProvider is missing");
  return value;
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Workspace | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = useRef(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  async function act(input: Record<string, unknown>, message = "") {
    if (locked.current) return null;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const key = JSON.stringify(input);
    if (pending.current?.key !== key)
      pending.current = { key, id: crypto.randomUUID() };
    try {
      const response = await fetch("/demo/sites/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          ...(input.action === "bootstrap"
            ? {}
            : { requestId: pending.current.id }),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429)
          pending.current = null;
        throw new Error(result.error || "Please try again.");
      }
      pending.current = null;
      setState(result.state);
      setNotice(message);
      return result as Result;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't connect. Please try again.",
      );
      return null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    let current = true;
    fetch("/demo/sites/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bootstrap" }),
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (current) setState(value.state);
      })
      .catch(() => {
        if (current)
          setError(
            "We couldn't load your workspace. Reload the page to try again.",
          );
      });
    return () => {
      current = false;
    };
  }, []);
  return (
    <DemoContext.Provider value={{ state, busy, error, notice, act }}>
      {children}
    </DemoContext.Provider>
  );
}
export function Feedback() {
  const { error, notice, state, act, busy } = useDemo();
  return (
    <>
      <div role="alert" className={error ? s.error : s.hidden}>
        {error}
        {!state && error && (
          <button
            disabled={busy}
            onClick={() => void act({ action: "bootstrap" })}
          >
            Retry loading
          </button>
        )}
      </div>
      <div role="status" className={notice ? s.notice : s.hidden}>
        {notice}
      </div>
    </>
  );
}
export const base = (site: SiteId) => `/demo/sites/${site}`;
export function Shell({
  site,
  path,
  children,
}: {
  site: SiteId;
  path: string[];
  children: ReactNode;
}) {
  const brand = sites.find((x) => x.id === site)!;
  const { state } = useDemo();
  const links: Record<SiteId, [string, string][]> = {
    haven: [
      ["Explore stays", ""],
      ["My bookings", "bookings"],
    ],
    thyme: [
      ["Our menu", ""],
      [
        `Basket${state ? ` (${state.foodCart.reduce((sum, line) => sum + line.quantity, 0)})` : ""}`,
        "basket",
      ],
      ["My orders", "orders"],
    ],
    daybreak: [
      ["Project board", ""],
      ["All tasks", "list"],
      ["New task", "new"],
    ],
    gather: [
      ["Discover", ""],
      ["My tickets", "tickets"],
    ],
    hireline: [
      ["Find a role", ""],
      ["Saved jobs", "saved"],
      ["Applications", "applications"],
    ],
    careloop: [
      ["My requests", ""],
      ["New request", "new"],
      ["Help center", "help"],
    ],
  };
  return (
    <div
      className={`${s.site} ${s[site]}`}
      style={{ "--accent": brand.color } as CSSProperties}
    >
      <a className={s.skip} href="#main-content">
        Skip to content
      </a>
      <header className={s.header}>
        <Link href={base(site)} className={s.brand}>
          <span className={s.brandMark} aria-hidden="true">
            {brand.mark}
          </span>
          {brand.name}
          <span className={s.brandDot} aria-hidden="true">
            .
          </span>
        </Link>
        <nav aria-label={`${brand.name} navigation`}>
          {links[site].map(([label, slug]) => (
            <Link
              key={slug}
              href={`${base(site)}${slug ? `/${slug}` : ""}`}
              aria-current={(path[0] || "") === slug ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className={s.headerNote}>
          {site === "daybreak"
            ? "Acme Studio · Workspace"
            : site === "careloop"
              ? "We're here to help"
              : "Made for everyday moments"}
        </span>
      </header>
      <main id="main-content" className={s.main}>
        <Feedback />
        {children}
      </main>
      <footer className={s.footer}>
        <div>
          <strong>{brand.name}.</strong>
          <p>{brand.tagline}</p>
        </div>
        <p>
          Sample website · Actions are saved in this browser’s workspace.
          <br />
          No real payments, bookings, hiring, or messages to staff.
        </p>
        <Link href="/demo/sites">Explore all 8 websites ↗</Link>
      </footer>
    </div>
  );
}
export function Loading() {
  return (
    <div className={s.loading} role="status">
      Getting everything ready…
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.pageHeading}>
      <div>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className={s.muted}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className={s.empty}>
      <span aria-hidden="true">✳</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {href && (
        <Link className={s.button} href={href}>
          {label || "Explore"} →
        </Link>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              "aria-describedby"?: string;
            }>,
            { id, "aria-describedby": hint ? `${id}-hint` : undefined },
          )
        : children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Form({
  onSubmit,
  children,
}: {
  onSubmit: (data: Record<string, string>) => void | Promise<void>;
  children: ReactNode;
}) {
  const { busy } = useDemo();
  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        void onSubmit(
          Object.fromEntries(new FormData(e.currentTarget)) as Record<
            string,
            string
          >,
        );
      }}
    >
      <fieldset disabled={busy} className={s.fieldset}>
        {children}
      </fieldset>
    </form>
  );
}
export function Submit({ children }: { children: ReactNode }) {
  const { busy } = useDemo();
  return (
    <button className={s.button} type="submit" disabled={busy}>
      {busy ? "Saving…" : children}
    </button>
  );
}
export function Action({
  children,
  input,
  message,
  confirm,
  className,
}: {
  children: ReactNode;
  input: Record<string, unknown>;
  message: string;
  confirm?: string;
  className?: string;
}) {
  const { act, busy, state } = useDemo();
  return (
    <button
      type="button"
      className={className || s.secondary}
      disabled={busy || !state}
      onClick={() => {
        if (!confirm || window.confirm(confirm)) void act(input, message);
      }}
    >
      {children}
    </button>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className={s.badge}>{children}</span>;
}
export function Search({
  query,
  setQuery,
  placeholder = "Search",
  options,
  filter,
  setFilter,
  filterLabel = "Category",
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder?: string;
  options: string[];
  filter: string;
  setFilter: (value: string) => void;
  filterLabel?: string;
}) {
  const search = useListSearch();
  return (
    <div className={s.filters}>
      <Field label="Search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
      </Field>
      <Field label={filterLabel}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["All", ...options].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      {(query || filter !== "All" || search) && (
        <button
          className={s.textButton}
          onClick={() => {
            clearListParams();
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
export function Scene({
  kind,
  color,
  variant = 0,
}: {
  kind: "stay" | "food" | "event" | "work";
  color: string;
  variant?: number;
}) {
  return (
    <svg
      className={s.scene}
      viewBox="0 0 480 320"
      aria-hidden="true"
      style={{ background: color }}
    >
      {kind === "stay" ? (
        <>
          <circle cx="390" cy="60" r="39" fill="#fff7dc" />
          <path
            d="M0 196L95 120L198 201L310 112L480 211V320H0Z"
            fill="#233e3833"
          />
          <path d="M68 155L240 60L410 155Z" fill="#344e43" />
          <path d="M93 151H389V320H93Z" fill="#f2e8d4" />
          <path d="M116 183H205V270H116ZM278 183H367V270H278Z" fill="#6f958b" />
          <path d="M225 211Q240 182 255 211V320H225Z" fill="#88674e" />
          <path
            d="M161 183V270M322 183V270M116 226H205M278 226H367"
            stroke="#eadac0"
            strokeWidth="6"
          />
          <path
            d="M0 309Q80 260 155 309T310 305T480 292V320H0"
            fill="#405f45"
          />
          <path d="M28 290V140M448 310V158" stroke="#546747" strokeWidth="8" />
          <path
            d="M28 144Q-5 78 0 156Q42 92 66 142ZM448 160Q398 102 412 175Q477 100 480 168Z"
            fill="#547552"
          />
        </>
      ) : kind === "food" ? (
        <>
          <ellipse cx="240" cy="275" rx="150" ry="18" fill="#32211119" />
          <circle cx="240" cy="163" r="121" fill="#f8f3e7" />
          <circle cx="240" cy="163" r="99" fill="#e4d7bf" />
          <circle
            cx="240"
            cy="163"
            r="83"
            fill={
              variant % 3 === 0
                ? "#a9b572"
                : variant % 3 === 1
                  ? "#bf8749"
                  : "#a78862"
            }
          />
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx={240 + Math.cos((i * Math.PI) / 4) * 55}
              cy={163 + Math.sin((i * Math.PI) / 4) * 55}
              rx="26"
              ry="16"
              transform={`rotate(${i * 45} ${240 + Math.cos((i * Math.PI) / 4) * 55} ${163 + Math.sin((i * Math.PI) / 4) * 55})`}
              fill={["#bd5835", "#eee0a4", "#6a8b48", "#ddae53"][i % 4]}
            />
          ))}
          <circle cx="240" cy="163" r="25" fill="#f6e9bf" />
          <circle cx="240" cy="163" r="12" fill="#d99b34" />
          <path
            d="M70 65V253M60 65V108H80V65M410 65V250M402 65Q378 130 410 130"
            stroke="#f4ede0"
            strokeWidth="7"
            fill="none"
          />
        </>
      ) : kind === "event" ? (
        <>
          <circle cx="240" cy="160" r="120" fill="#ffffff66" />
          <path
            d={
              variant % 2
                ? "M70 270L240 42L410 270Z"
                : "M120 270V144A120 120 0 01240 24A120 120 0 01360 144V270Z"
            }
            fill="#352d4744"
          />
          <circle cx="240" cy="160" r="65" fill="#f6ebd6" />
          <path
            d="M240 62V258M142 160H338M171 91L309 229M171 229L309 91"
            stroke="#352d47"
            strokeWidth="12"
          />
          <circle cx="240" cy="160" r="23" fill={color} />
        </>
      ) : (
        <>
          <rect x="60" y="45" width="360" height="238" rx="12" fill="#fff9" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={78 + i * 112}
                y="70"
                width="96"
                height="14"
                rx="4"
                fill="#4e477944"
              />
              <rect
                x={78 + i * 112}
                y="100"
                width="96"
                height={i === 1 ? "100" : "65"}
                rx="5"
                fill="#fff"
              />
              <rect
                x={89 + i * 112}
                y="112"
                width="65"
                height="5"
                rx="2"
                fill="#716b91"
              />
              <rect
                x={89 + i * 112}
                y="126"
                width="46"
                height="5"
                rx="2"
                fill="#c4bdd8"
              />
              <circle cx={94 + i * 112} cy="148" r="8" fill={color} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
export function Receipt({
  filename,
  text,
  label = "Download receipt",
}: {
  filename: string;
  text: string;
  label?: string;
}) {
  return (
    <a
      className={s.secondary}
      download={`${filename}.txt`}
      href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
    >
      {label} ↓
    </a>
  );
}
