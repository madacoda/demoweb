"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { demoAccount, scenarios, workflows } from "./catalog";
import { hrAccounts, hrPassword } from "../hris/model";
import s from "./lab.module.css";
export function Lab() {
  const [active, setActive] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [query, setQuery] = useState(""),
    [area, setArea] = useState("All");
  const locked = useRef(false);
  useEffect(() => {
    fetch("/lab/api")
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        setActive(value.scenario);
      })
      .catch((error) => setError(error.message || "Could not load test run."));
  }, []);
  async function run(scenario?: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(scenario || "leave");
    setError("");
    try {
      const response = await fetch("/lab/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          scenario ? { action: "start", scenario } : { action: "leave" },
        ),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      window.location.assign(value.path);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not start this run. Please try again.",
      );
      locked.current = false;
      setBusy("");
    }
  }
  const filtered = scenarios.filter(
    (scenario) =>
      (area === "All" || scenario.area === area) &&
      `${scenario.title} ${scenario.setup} ${scenario.area}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className={s.lab}>
      <header>
        <Link className={s.brand} href="/demo/sites">
          Demo District <span> / Test lab</span>
        </Link>
        <a href="/lab/cases">Download UAT catalog ↓</a>
      </header>
      <main>
        <section className={s.hero}>
          <p className={s.eyebrow}>Beyond the happy path</p>
          <h1>
            Good tests need
            <br />
            <em>interesting problems.</em>
          </h1>
          <p>
            Real accounts. Conflicting edits. A response that never makes it
            back.
            <br />
            Start a fresh scenario, follow the workflow, and check what actually
            happens.
          </p>
          <div className={s.stats}>
            <span>
              <strong>8</strong> working websites
            </span>
            <span>
              <strong>{scenarios.length}</strong> repeatable presets
            </span>
            <span>
              <strong>{workflows.length}</strong> acceptance workflows
            </span>
          </div>
        </section>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <section className={s.run}>
          <div>
            <strong>
              {active
                ? `Active run: ${scenarios.find((scenario) => scenario.id === active)?.title || active}`
                : "Ready for a fresh run"}
            </strong>
            <p>
              Each start creates isolated PostgreSQL data for this browser.
              Normal accounts and records are preserved. Runs last 24 hours; all
              tabs in this browser share the active run.
            </p>
          </div>
          <button disabled={!!busy} onClick={() => void run()}>
            {busy === "leave" ? "Leaving…" : "Leave lab & restore normal data"}
          </button>
        </section>
        <section id="hris" className={s.hris}>
          <div>
            <p className={s.eyebrow}>People / HRIS</p>
            <h2>
              One request. <br />
              Three different responsibilities.
            </h2>
            <p>
              Employees request leave. Managers decide for their team. HR
              monitors balances and adjusts allowances with an audit trail.
            </p>
            <button disabled={!!busy} onClick={() => void run("hris-journey")}>
              Start the full HRIS journey →
            </button>
            <p className={s.hint}>
              Public sample password for all People accounts:{" "}
              <code>{hrPassword}</code>
            </p>
          </div>
          <div
            className={s.accounts}
            role="region"
            aria-label="Sample account table"
            tabIndex={0}
          >
            <table>
              <caption>People sample accounts</caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role / team</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {hrAccounts.map((person) => (
                  <tr key={person.id}>
                    <th scope="row">{person.name}</th>
                    <td>
                      {person.role === "hr" ? "HR admin" : person.role}
                      <small>{person.team}</small>
                    </td>
                    <td>
                      <code>{person.email}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className={s.controls} aria-label="Scenario filters">
          <label>
            Search scenarios
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Login, approval, filters, retry…"
            />
          </label>
          <label>
            Workflow area
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              {[
                "All",
                ...new Set(scenarios.map((scenario) => scenario.area)),
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <span role="status">{filtered.length} scenarios</span>
        </section>
        <section className={s.grid} aria-label="Test scenarios">
          {filtered.map((scenario) => (
            <article
              className={s.card}
              key={scenario.id}
              data-testid={`scenario-${scenario.id}`}
            >
              <p className={s.eyebrow}>
                {scenario.area}
                {scenario.id === "coupon-fail" ? " · intentional defect" : ""}
              </p>
              <h2>{scenario.title}</h2>
              <p>{scenario.setup}</p>
              <ol>
                {scenario.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className={s.expected}>
                <strong>Expected outcome</strong>
                <p>{scenario.expected}</p>
              </div>
              <button disabled={!!busy} onClick={() => void run(scenario.id)}>
                {busy === scenario.id
                  ? "Preparing fresh data…"
                  : "Start fresh scenario →"}
              </button>
              <small>{scenario.id}</small>
            </article>
          ))}
        </section>
        {!filtered.length && (
          <section className={s.empty}>
            <h2>No matching scenarios</h2>
            <button
              onClick={() => {
                setQuery("");
                setArea("All");
              }}
            >
              Clear filters
            </button>
          </section>
        )}
        <section className={s.notes}>
          <div>
            <h2>A repeatable starting point.</h2>
            <p>
              Start the same preset again to get fresh data. Failures such as
              503, 429, expiry and lost responses happen once at the documented
              action. Other operations use the real application and PostgreSQL.
            </p>
            <p>
              Form & Field account presets use <code>{demoAccount.email}</code>{" "}
              / <code>{demoAccount.password}</code>. These are public synthetic
              credentials for isolated sample data.
            </p>
          </div>
          <div>
            <h2>Check the outcome, not just the click.</h2>
            <p>
              The catalog includes role permissions, state transitions, totals,
              ownership, retries, filters and accessibility checks. It is an
              acceptance plan, not a Veriflow workflow import or a claim that
              every possible edge case is covered.
            </p>
            <p>
              <a href="/lab/cases">
                Download all {workflows.length} workflows as JSON →
              </a>
            </p>
          </div>
        </section>
        <details className={s.catalog}>
          <summary>Browse all {workflows.length} acceptance workflows</summary>
          <div className={s.workflowGrid}>
            {workflows.map((workflow) => (
              <article key={workflow.id}>
                <small>
                  {workflow.id} · {workflow.scenario}
                </small>
                <h3>{workflow.title}</h3>
                <p>{workflow.steps}</p>
                <p>
                  <strong>Expected:</strong> {workflow.expected}
                </p>
              </article>
            ))}
          </div>
        </details>
      </main>
      <footer>
        <Link href="/demo/sites">← Explore the websites</Link>
        <span>Demo District · Built to be put through its paces.</span>
      </footer>
    </div>
  );
}
