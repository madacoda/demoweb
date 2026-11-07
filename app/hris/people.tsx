"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { clearListParams, useListParam } from "../shared/list-params";
import { nextWorkday, today, type HRState, type Leave } from "./model";
import s from "./people.module.css";
const empty: HRState = {
  user: null,
  people: [],
  requests: [],
  balances: [],
  audit: [],
};
const pretty = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
function form(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
}
function Status({ value }: { value: string }) {
  return (
    <span className={s.status} data-status={value}>
      {value}
    </span>
  );
}
export function People({ path }: { path: string[] }) {
  const router = useRouter();
  const [state, setState] = useState<HRState>(empty),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = useRef(false),
    pending = useRef<{ key: string; id: string } | null>(null);
  const allowanceDrafts = useRef<Record<string, number>>({});
  const [query, setQuery] = useListParam("q");
  const [status, setStatus] = useListParam("status", "All", [
    "All",
    "Pending",
    "Approved",
    "Rejected",
    "Cancelled",
  ]);
  const [team, setTeam] = useListParam("team", "All", [
    "All",
    "Product",
    "Operations",
  ]);
  const [sort, setSort] = useListParam("sort", "recent", ["recent", "start"]);
  const [pageValue, setPageValue] = useListParam("page", "1");
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
      const response = await fetch("/hris/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, requestId: pending.current.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429)
          pending.current = null;
        if (response.status === 401 && input.action !== "login")
          setState(empty);
        throw new Error(result.error || "Please try again.");
      }
      pending.current = null;
      setState(result.state);
      setNotice(message);
      return result as { state: HRState; id?: string };
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn't connect. Your form is still here; please try again.",
      );
      return null;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (locked.current || document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/hris/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bootstrap" }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted && !locked.current)
          setState(result.state);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load People. Please retry.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  const user = state.user,
    section = path[0] || "requests";
  const permitted =
    !user ||
    !(
      (section === "new" && user.role !== "employee") ||
      (section === "approvals" && user.role !== "manager") ||
      (section === "balances" && user.role !== "hr")
    );
  const filtered = state.requests
    .filter(
      (request) =>
        (section !== "approvals" || request.status === "Pending") &&
        (status === "All" || request.status === status) &&
        (team === "All" || request.team === team) &&
        `${request.id} ${request.employee} ${request.reason} ${request.type}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "start"
        ? a.start.localeCompare(b.start) || a.id.localeCompare(b.id)
        : b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const page = Math.min(
    pages,
    Math.max(1, /^\d+$/.test(pageValue) ? Number(pageValue) || 1 : 1),
  );
  const request = path[1]
    ? state.requests.find((r) => r.id === path[1])
    : undefined;
  const heading =
    section === "approvals"
      ? "A little time for your team."
      : section === "balances"
        ? "A clear view of time away."
        : section === "audit"
          ? "Every change, accounted for."
          : section === "new"
            ? "Make space for yourself."
            : "Your time, thoughtfully managed.";
  const resetPage = (set: (value: string) => void, value: string) => {
    set(value);
    setPageValue("1");
  };
  return (
    <div className={s.app}>
      <a className={s.skip} href="#people-main">
        Skip to content
      </a>
      <header className={s.header}>
        <Link className={s.brand} href="/hris">
          <span aria-hidden="true">p</span>people
          <span className={s.brandDot}>.</span>
        </Link>
        <span className={s.org}>
          Acme Studio <span>People & culture</span>
        </span>
        {user && (
          <div className={s.identity}>
            <span className={s.avatar} aria-hidden="true">
              {user.name[0]}
            </span>
            <span>
              {user.name}
              <small>
                {user.role === "hr"
                  ? "HR administrator"
                  : user.role === "manager"
                    ? "Team manager"
                    : "Employee"}
              </small>
            </span>
            <button
              disabled={busy}
              onClick={async () => {
                if (await act({ action: "logout" })) router.push("/hris/login");
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      {user && (
        <nav className={s.nav} aria-label="People navigation">
          <Link
            aria-current={section === "requests" ? "page" : undefined}
            href="/hris/requests"
          >
            {user.role === "employee" ? "My requests" : "Leave overview"}
          </Link>
          {user.role === "employee" && (
            <Link
              href="/hris/new"
              aria-current={section === "new" ? "page" : undefined}
            >
              Request leave
            </Link>
          )}
          {user.role === "manager" && (
            <Link
              href="/hris/approvals"
              aria-current={section === "approvals" ? "page" : undefined}
            >
              Approvals (
              {state.requests.filter((r) => r.status === "Pending").length})
            </Link>
          )}
          {user.role === "hr" && (
            <Link
              href="/hris/balances"
              aria-current={section === "balances" ? "page" : undefined}
            >
              Leave balances
            </Link>
          )}
          <Link
            href="/hris/audit"
            aria-current={section === "audit" ? "page" : undefined}
          >
            Activity
          </Link>
          <button
            disabled={busy}
            onClick={() =>
              void act({ action: "bootstrap" }, "You're up to date.")
            }
          >
            Refresh data ↻
          </button>
        </nav>
      )}
      <main id="people-main" className={s.main}>
        {error && (
          <div role="alert" className={s.error}>
            {error}
            {!user && !loading && (
              <button
                disabled={busy}
                onClick={() => void act({ action: "bootstrap" })}
              >
                Retry loading
              </button>
            )}
          </div>
        )}
        {notice && (
          <p role="status" className={s.notice}>
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status">Opening your workspace…</p>
        ) : !user ? (
          <div className={s.loginGrid}>
            <section className={s.loginStory}>
              <p className={s.eyebrow}>Good work starts with people</p>
              <h1>
                Room to rest.
                <br />
                <em>Space to thrive.</em>
              </h1>
              <p>
                Plan your time away, keep your team in the loop, and come back
                ready for what’s next.
              </p>
              <div className={s.illustration} aria-hidden="true">
                <span>☀</span>
                <div>
                  Make time
                  <br />
                  for a little
                  <br />
                  <strong>more life.</strong>
                </div>
              </div>
            </section>
            <section className={s.loginCard}>
              <p className={s.eyebrow}>Your everyday workspace</p>
              <h2>Welcome back.</h2>
              <p>Sign in to manage your time away.</p>
              <form
                onSubmit={async (event) => {
                  const data = form(event);
                  const result = await act({ action: "login", ...data });
                  if (result)
                    router.push(
                      result.state.user?.role === "manager"
                        ? "/hris/approvals"
                        : result.state.user?.role === "hr"
                          ? "/hris/balances"
                          : "/hris/requests",
                    );
                }}
              >
                <fieldset disabled={busy}>
                  <div className={s.field}>
                    <label htmlFor="people-field-1">Email address</label>
                    <input
                      id="people-field-1"
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder="you@company.com"
                      maxLength={254}
                    />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="people-field-2">Password</label>
                    <input
                      id="people-field-2"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      minLength={8}
                      maxLength={128}
                    />
                  </div>
                  <button className={s.primary}>
                    {busy ? "Signing in…" : "Sign in →"}
                  </button>
                </fieldset>
              </form>
              <p className={s.muted}>
                Exploring this sample company?{" "}
                <Link href="/lab#hris">View sample accounts</Link>
              </p>
            </section>
          </div>
        ) : !permitted ? (
          <section className={s.empty}>
            <h1>Access restricted</h1>
            <p>Your role does not have access to this workspace.</p>
            <Link href="/hris/requests">Return to leave overview</Link>
          </section>
        ) : (
          <>
            <section className={s.hero}>
              <div>
                <p className={s.eyebrow}>{user.team} / Time away</p>
                <h1>{heading}</h1>
                <p>
                  {section === "approvals"
                    ? "Review the details. Keep the team in balance."
                    : "A small pause makes room for good things."}
                </p>
              </div>
              {user.role === "employee" && section !== "new" && (
                <Link className={s.primary} href="/hris/new">
                  + Request leave
                </Link>
              )}
            </section>
            {user.role === "employee" && !path[1] && (
              <section
                className={s.balanceCards}
                aria-label="Your leave balances"
              >
                {state.balances.map((balance) => (
                  <article key={balance.type}>
                    <div>
                      <span className={s.balanceIcon} aria-hidden="true">
                        {balance.type === "Annual" ? "☀" : "✳"}
                      </span>
                      <span>{balance.type} leave</span>
                    </div>
                    <p>
                      <strong
                        data-testid={`${balance.type.toLowerCase()}-available`}
                      >
                        {balance.available}
                      </strong>{" "}
                      days available
                    </p>
                    <small>
                      {balance.used} approved · {balance.pending} pending ·{" "}
                      {balance.allowance} allowance
                    </small>
                  </article>
                ))}
              </section>
            )}
            {section === "new" ? (
              <section className={s.formLayout}>
                <div>
                  <h2>A little planning goes a long way.</h2>
                  <p>
                    Tell your manager when you’ll be away. Pending requests
                    reserve your balance until a decision is made.
                  </p>
                  <p className={s.muted}>
                    Working days are Monday–Friday. Half days are available for
                    a single working day. Dates use the company’s UTC calendar.
                  </p>
                </div>
                <form
                  className={s.card}
                  onSubmit={async (event) => {
                    const data = form(event);
                    const result = await act({ action: "submit", ...data });
                    if (result?.id) router.push(`/hris/requests/${result.id}`);
                  }}
                >
                  <fieldset disabled={busy}>
                    <h2>New leave request</h2>
                    <div className={s.twoCols}>
                      <div className={s.field}>
                        <label htmlFor="people-field-3">Leave type</label>
                        <select id="people-field-3" name="type">
                          <option>Annual</option>
                          <option>Sick</option>
                        </select>
                      </div>
                      <div className={s.field}>
                        <label htmlFor="people-field-4">Duration</label>
                        <select id="people-field-4" name="duration">
                          <option>Full day</option>
                          <option>Half day</option>
                        </select>
                      </div>
                      <div className={s.field}>
                        <label htmlFor="people-field-5">Start date</label>
                        <input
                          id="people-field-5"
                          type="date"
                          name="start"
                          defaultValue={nextWorkday(10)}
                          min={today()}
                          required
                        />
                      </div>
                      <div className={s.field}>
                        <label htmlFor="people-field-6">End date</label>
                        <input
                          id="people-field-6"
                          type="date"
                          name="end"
                          defaultValue={nextWorkday(10)}
                          min={today()}
                          required
                        />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label htmlFor="people-field-7">Reason</label>
                      <textarea
                        id="people-field-7"
                        name="reason"
                        minLength={10}
                        maxLength={1000}
                        rows={5}
                        required
                        placeholder="A little context for your manager…"
                      />
                    </div>
                    <p className={s.muted}>
                      10–1,000 characters. Your manager and HR can read this
                      request.
                    </p>
                    <div className={s.actions}>
                      <button className={s.primary}>
                        {busy ? "Submitting…" : "Submit request"}
                      </button>
                      <Link href="/hris/requests">Cancel</Link>
                    </div>
                  </fieldset>
                </form>
              </section>
            ) : path[1] ? (
              !request ? (
                <section className={s.empty}>
                  <h2>Request not found</h2>
                  <p>This request is unavailable or belongs to another team.</p>
                  <Link href="/hris/requests">Back to requests</Link>
                </section>
              ) : (
                <section className={s.detailGrid}>
                  <article className={s.card}>
                    <Link className={s.back} href="/hris/requests">
                      ← Leave overview
                    </Link>
                    <div className={s.cardHeading}>
                      <h2>{request.type} leave</h2>
                      <Status value={request.status} />
                    </div>
                    <p className={s.muted}>
                      {request.id} · {request.employee}
                    </p>
                    <dl className={s.details}>
                      <div>
                        <dt>Dates</dt>
                        <dd>
                          {pretty(request.start)} — {pretty(request.end)}
                        </dd>
                      </div>
                      <div>
                        <dt>Time away</dt>
                        <dd>
                          {request.days} day{request.days === 1 ? "" : "s"} ·{" "}
                          {request.duration}
                        </dd>
                      </div>
                      <div>
                        <dt>Team</dt>
                        <dd>{request.team}</dd>
                      </div>
                      <div>
                        <dt>Submitted</dt>
                        <dd>{pretty(request.createdAt)}</dd>
                      </div>
                    </dl>
                    <h3>Reason</h3>
                    <p className={s.preserve}>{request.reason}</p>
                    {request.decisionNote && (
                      <>
                        <h3>Manager’s note</h3>
                        <p className={s.preserve}>{request.decisionNote}</p>
                      </>
                    )}
                    {user.role === "employee" &&
                      ["Pending", "Approved"].includes(request.status) && (
                        <button
                          className={s.danger}
                          disabled={busy}
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Cancel this leave request? Reserved or approved days will be returned to your balance.",
                              )
                            )
                              await act(
                                {
                                  action: "cancel",
                                  id: request.id,
                                  version: request.version,
                                },
                                "Your request has been cancelled and the days returned.",
                              );
                          }}
                        >
                          Cancel request
                        </button>
                      )}
                  </article>
                  <aside>
                    {user.role === "manager" && request.status === "Pending" ? (
                      <form
                        className={s.card}
                        onSubmit={async (event) => {
                          const data = form(event);
                          await act(
                            {
                              action: "decide",
                              id: request.id,
                              version: request.version,
                              ...data,
                            },
                            "Your decision has been saved.",
                          );
                        }}
                      >
                        <fieldset disabled={busy}>
                          <h2>Review request</h2>
                          <p>
                            Your decision will update the employee’s balance
                            immediately.
                          </p>
                          <div className={s.field}>
                            <label htmlFor="people-field-8">Decision</label>
                            <select id="people-field-8" name="decision">
                              <option value="Approved">Approve</option>
                              <option value="Rejected">Reject</option>
                            </select>
                          </div>
                          <div className={s.field}>
                            <label htmlFor="people-field-9">
                              Decision note
                            </label>
                            <textarea
                              id="people-field-9"
                              name="note"
                              rows={4}
                              maxLength={1000}
                            />
                          </div>
                          <p className={s.muted}>
                            A rejection needs at least 10 characters explaining
                            the reason.
                          </p>
                          <button className={s.primary}>
                            {busy ? "Saving…" : "Save decision"}
                          </button>
                        </fieldset>
                      </form>
                    ) : (
                      <section className={s.card}>
                        <h2>What happens next?</h2>
                        <p>
                          {request.status === "Pending"
                            ? "Your manager will review this request. Your days are reserved while you wait."
                            : request.status === "Approved"
                              ? "You're all set. These days are included in your approved leave."
                              : request.status === "Rejected"
                                ? "Your reserved days have been released. You can submit a new request with different details."
                                : "Your days are back in your available balance."}
                        </p>
                      </section>
                    )}
                  </aside>
                </section>
              )
            ) : section === "balances" ? (
              <>
                <div className={s.sectionTitle}>
                  <h2>Employee balances</h2>
                  <span>{state.people.length} employees · days</span>
                </div>
                <div
                  className={s.tableWrap}
                  role="region"
                  aria-label="Employee leave balance table"
                  tabIndex={0}
                >
                  <table>
                    <caption className={s.srOnly}>
                      Leave balances by employee and type
                    </caption>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Type</th>
                        <th>Allowance</th>
                        <th>Approved</th>
                        <th>Pending</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.balances.map((balance) => (
                        <tr
                          key={`${balance.employeeId}-${balance.type}`}
                          data-testid={`balance-${balance.employeeId}-${balance.type}`}
                        >
                          <th scope="row">
                            {balance.employee}
                            <small>{balance.team}</small>
                          </th>
                          <td>{balance.type}</td>
                          <td>{balance.allowance}</td>
                          <td>{balance.used}</td>
                          <td>{balance.pending}</td>
                          <td>
                            <strong>{balance.available}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <form
                  className={`${s.card} ${s.adjust}`}
                  onChange={(event) => {
                    const employeeId = String(
                      new FormData(event.currentTarget).get("employeeId"),
                    );
                    const person = state.people.find(
                      (person) => person.id === employeeId,
                    );
                    if (
                      person &&
                      allowanceDrafts.current[employeeId] === undefined
                    )
                      allowanceDrafts.current[employeeId] = person.version;
                  }}
                  onSubmit={async (event) => {
                    const data = form(event);
                    const person = state.people.find(
                      (p) => p.id === data.employeeId,
                    )!;
                    const result = await act(
                      {
                        action: "adjust-balance",
                        ...data,
                        allowance: Number(data.allowance),
                        version:
                          allowanceDrafts.current[person.id] ?? person.version,
                      },
                      "Leave allowance updated. The change is recorded in Activity.",
                    );
                    if (result) delete allowanceDrafts.current[person.id];
                  }}
                >
                  <fieldset disabled={busy}>
                    <h2>Adjust an allowance</h2>
                    <p className={s.muted}>
                      Approved and pending days remain reserved. Changes require
                      a reason.
                    </p>
                    <div className={s.twoCols}>
                      <div className={s.field}>
                        <label htmlFor="people-field-10">Employee</label>
                        <select id="people-field-10" name="employeeId">
                          {state.people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={s.field}>
                        <label htmlFor="people-field-11">Leave type</label>
                        <select id="people-field-11" name="type">
                          <option>Annual</option>
                          <option>Sick</option>
                        </select>
                      </div>
                      <div className={s.field}>
                        <label htmlFor="people-field-12">
                          New allowance (days)
                        </label>
                        <input
                          id="people-field-12"
                          name="allowance"
                          type="number"
                          step="0.5"
                          min="0"
                          max="60"
                          defaultValue="12"
                          required
                        />
                      </div>
                    </div>
                    <div className={s.field}>
                      <label htmlFor="people-field-13">Adjustment reason</label>
                      <textarea
                        id="people-field-13"
                        name="note"
                        minLength={10}
                        maxLength={1000}
                        rows={3}
                        required
                      />
                    </div>
                    <button className={s.primary}>Save allowance</button>
                  </fieldset>
                </form>
              </>
            ) : section === "audit" ? (
              <section className={s.card}>
                <h2>Activity history</h2>
                <p className={s.muted}>
                  Changes visible to your role, newest first.
                </p>
                <ol className={s.timeline}>
                  {state.audit.map((entry) => (
                    <li key={entry.id}>
                      <span className={s.timelineDot} aria-hidden="true" />
                      <div>
                        <strong>{entry.action}</strong>{" "}
                        <span>by {entry.actor}</span>
                        <p>{entry.detail}</p>
                        <small>
                          {entry.targetId} ·{" "}
                          {new Date(entry.at).toLocaleString()}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              <>
                <section className={s.card}>
                  <div className={s.sectionTitle}>
                    <h2>
                      {section === "approvals"
                        ? "Waiting for your review"
                        : "Leave requests"}
                    </h2>
                    <span data-testid="hr-results">
                      {filtered.length} request
                      {filtered.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className={s.filters}>
                    <div className={s.field}>
                      <label htmlFor="people-field-14">Search requests</label>
                      <input
                        id="people-field-14"
                        type="search"
                        value={query}
                        onChange={(event) =>
                          resetPage(setQuery, event.target.value)
                        }
                        placeholder="Name, reason or reference…"
                      />
                    </div>
                    <div className={s.field}>
                      <label htmlFor="people-field-15">Status</label>
                      <select
                        id="people-field-15"
                        value={status}
                        onChange={(event) =>
                          resetPage(setStatus, event.target.value)
                        }
                      >
                        {[
                          "All",
                          "Pending",
                          "Approved",
                          "Rejected",
                          "Cancelled",
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                    {user.role === "hr" && (
                      <div className={s.field}>
                        <label htmlFor="people-field-16">Team</label>
                        <select
                          id="people-field-16"
                          value={team}
                          onChange={(event) =>
                            resetPage(setTeam, event.target.value)
                          }
                        >
                          <option>All</option>
                          <option>Product</option>
                          <option>Operations</option>
                        </select>
                      </div>
                    )}
                    <div className={s.field}>
                      <label htmlFor="people-field-17">Sort by</label>
                      <select
                        id="people-field-17"
                        value={sort}
                        onChange={(event) =>
                          resetPage(setSort, event.target.value)
                        }
                      >
                        <option value="recent">Newest submitted</option>
                        <option value="start">Leave start date</option>
                      </select>
                    </div>
                    <button onClick={clearListParams}>Clear filters</button>
                  </div>
                  {!filtered.length ? (
                    <div className={s.empty}>
                      <h3>Nothing to show here.</h3>
                      <p>There are no requests matching these filters.</p>
                      <button onClick={clearListParams}>Reset filters</button>
                    </div>
                  ) : (
                    <div className={s.requestList}>
                      {filtered.slice((page - 1) * 5, page * 5).map((item) => (
                        <Link
                          key={item.id}
                          href={`/hris/requests/${item.id}`}
                          className={s.requestRow}
                        >
                          <span className={s.requestIcon} aria-hidden="true">
                            {item.type === "Annual" ? "☀" : "✳"}
                          </span>
                          <div>
                            <strong>
                              {item.type} leave · {item.days} day
                              {item.days === 1 ? "" : "s"}
                            </strong>
                            <p>
                              {item.employee} · {pretty(item.start)}
                              {item.end !== item.start &&
                                ` — ${pretty(item.end)}`}
                            </p>
                            <small>{item.id}</small>
                          </div>
                          <Status value={item.status} />
                          <span aria-hidden="true">↗</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <nav className={s.pagination} aria-label="Request pages">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPageValue(String(page - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages}
                    </span>
                    <button
                      disabled={page >= pages}
                      onClick={() => setPageValue(String(page + 1))}
                    >
                      Next
                    </button>
                  </nav>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className={s.footer}>
        <span>People · A little more human.</span>
        <div>
          <Link href="/demo/sites">Explore all websites</Link>
          <Link href="/lab">Test lab</Link>
        </div>
      </footer>
    </div>
  );
}
