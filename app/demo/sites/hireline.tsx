"use client";
import Link from "next/link";
import { useListFlag, useListParam } from "../../shared/list-params";
import { useRouter } from "next/navigation";
import { jobs, prettyDate } from "./_lib/data";
import {
  Action,
  Badge,
  Empty,
  Field,
  Form,
  Heading,
  Loading,
  Search,
  Submit,
  useDemo,
} from "./ui";
import s from "./sites.module.css";
export function Hireline({ path }: { path: string[] }) {
  const { state, act } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useListParam("q"),
    [team, setTeam] = useListParam("team", "All", [
      "All",
      ...jobs.map((j) => j.team),
    ]),
    [remote, setRemote] = useListFlag("remote"),
    [type, setType] = useListParam("type", "All", [
      "All",
      ...jobs.map((j) => j.type),
    ]);
  if (!state) return <Loading />;
  if (path[0] === "applications")
    return (
      <>
        <Heading
          eyebrow="The next chapter"
          title="My applications"
          description="Keep track of every opportunity you’ve reached for."
        />
        {!state.applications.length ? (
          <Empty
            title="A new possibility is waiting."
            text="Find a role that sounds like you and send your first application."
            href="/demo/sites/hireline"
            label="Explore roles"
          />
        ) : (
          <div className={s.recordGrid}>
            {state.applications.map((application) => {
              const job = jobs.find((j) => j.id === application.jobId)!;
              return (
                <article className={s.record} key={application.id}>
                  <div className={s.recordTop}>
                    <Badge>{application.status}</Badge>
                    <small>{application.id}</small>
                  </div>
                  <h2>
                    <Link href={`/demo/sites/hireline/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                  </h2>
                  <p>
                    {job.company} · {job.location}
                  </p>
                  <p>
                    Applied {prettyDate(application.created)} as{" "}
                    {application.name}
                  </p>
                  <details>
                    <summary>View submitted application</summary>
                    <p>{application.email}</p>
                    {application.portfolio && (
                      <p>
                        <a
                          href={application.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Portfolio ↗
                        </a>
                      </p>
                    )}
                    <p className={s.preserve}>{application.letter}</p>
                  </details>
                  {application.status === "Submitted" && (
                    <div className={s.actions}>
                      <Action
                        input={{
                          action: "withdraw-application",
                          id: application.id,
                        }}
                        message="Your application has been withdrawn."
                        confirm="Withdraw this application? You can submit a new application later."
                      >
                        Withdraw application
                      </Action>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </>
    );
  if (path[0] === "jobs") {
    const job = jobs.find((j) => j.id === path[1])!,
      applied = state.applications.some(
        (a) => a.jobId === job.id && a.status === "Submitted",
      );
    return (
      <>
        <Link className={s.back} href="/demo/sites/hireline">
          ← All opportunities
        </Link>
        <div className={s.detailLayout}>
          <div className={s.jobDescription}>
            <span
              className={s.companyLogo}
              style={{ background: job.color }}
              aria-hidden="true"
            >
              {job.company[0]}
            </span>
            <Heading
              eyebrow={`${job.company} / ${job.team}`}
              title={job.title}
              description={job.description}
            />
            <div className={s.pills}>
              <Badge>{job.location}</Badge>
              <Badge>{job.type}</Badge>
              <Badge>{job.salary}</Badge>
            </div>
            <section className={s.prose}>
              <h2>What you’ll bring</h2>
              <ul>
                {job.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <h2>A good place to grow</h2>
              <p>
                Join a thoughtful team that values clear communication, room to
                learn, and the craft of doing good work. We welcome different
                backgrounds and perspectives.
              </p>
              <h3>The process</h3>
              <p>
                Introduce yourself below. Your application will be saved in My
                applications, where you can review or withdraw it at any time.
              </p>
            </section>
            <Action
              input={{ action: "save-job", id: job.id }}
              message={
                state.savedJobs.includes(job.id)
                  ? "Job removed from your saved list."
                  : "Job saved for later."
              }
            >
              {state.savedJobs.includes(job.id)
                ? "Remove saved job"
                : "Save this job"}
            </Action>
          </div>
          <aside className={s.formCard}>
            <h2>A little introduction.</h2>
            {applied ? (
              <Empty
                title="You're on the list."
                text="Your application has been saved. You can review it in My applications."
                href="/demo/sites/hireline/applications"
                label="View application"
              />
            ) : (
              <Form
                onSubmit={async (data) => {
                  const result = await act({
                    ...data,
                    action: "apply-job",
                    jobId: job.id,
                  });
                  if (result) router.push("/demo/sites/hireline/applications");
                }}
              >
                <Field label="Full name">
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </Field>
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
                <Field label="Portfolio or profile URL (optional)">
                  <input
                    name="portfolio"
                    type="url"
                    maxLength={500}
                    placeholder="https://your-portfolio.example"
                  />
                </Field>
                <Field
                  label="Your introduction"
                  hint="At least 30 characters. Tell us about your experience and interest in the role."
                >
                  <textarea
                    name="letter"
                    minLength={30}
                    maxLength={5000}
                    rows={6}
                    required
                  />
                </Field>
                <Submit>Submit application →</Submit>
                <p className={s.fine}>
                  This sample saves your application. No employer is contacted
                  and these are fictional roles.
                </p>
              </Form>
            )}
          </aside>
        </div>
      </>
    );
  }
  const filtered = jobs.filter(
    (job) =>
      (path[0] !== "saved" || state.savedJobs.includes(job.id)) &&
      `${job.title} ${job.company} ${job.location}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (team === "All" || job.team === team) &&
      (!remote || job.location === "Remote") &&
      (type === "All" || job.type === type),
  );
  return (
    <>
      {path[0] === "saved" ? (
        <Heading
          eyebrow="Keep the possibilities close"
          title="Saved jobs"
          description="A shortlist for your next chapter."
        />
      ) : (
        <section className={s.jobsHero}>
          <p className={s.eyebrow}>Good work. Good people.</p>
          <h1>
            Your next chapter
            <br />
            starts with a <em>hello.</em>
          </h1>
          <p>
            Thoughtful roles at teams building something meaningful.
            <br />
            Find a place where your work can make a difference.
          </p>
          <div className={s.pills}>
            <Badge>10 open roles</Badge>
            <Badge>5 growing teams</Badge>
            <Badge>Remote-friendly</Badge>
          </div>
        </section>
      )}
      <Search
        query={query}
        setQuery={setQuery}
        placeholder="Job title, company, or location"
        options={[...new Set(jobs.map((j) => j.team))]}
        filter={team}
        setFilter={setTeam}
        filterLabel="Team"
      />
      <div className={s.resultBar}>
        <p data-testid="results-count">{filtered.length} opportunities</p>
        <div className={s.inlineFields}>
          <label className={s.checkbox}>
            <input
              type="checkbox"
              checked={remote}
              onChange={(e) => setRemote(e.target.checked)}
            />{" "}
            Remote only
          </label>
          <Field label="Employment type">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {["All", ...new Set(jobs.map((j) => j.type))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      {!filtered.length ? (
        <Empty
          title={
            path[0] === "saved"
              ? "Keep a good thing for later."
              : "No matching roles"
          }
          text={
            path[0] === "saved"
              ? "Save a job from its details page to build your shortlist, or clear your filters."
              : "Try another search, team, or employment type."
          }
          href="/demo/sites/hireline"
          label="Explore all roles"
        />
      ) : (
        <div className={s.jobList}>
          {filtered.map((job) => (
            <article className={s.jobRow} key={job.id}>
              <span
                className={s.companyLogo}
                style={{ background: job.color }}
                aria-hidden="true"
              >
                {job.company[0]}
              </span>
              <div>
                <p className={s.eyebrow}>
                  {job.company} · {job.team}
                </p>
                <h2>
                  <Link href={`/demo/sites/hireline/jobs/${job.id}`}>
                    {job.title}
                  </Link>
                </h2>
                <p>
                  {job.location} · {job.type}
                </p>
              </div>
              <div className={s.jobEnd}>
                <strong>{job.salary}</strong>
                <Action
                  input={{ action: "save-job", id: job.id }}
                  message={
                    state.savedJobs.includes(job.id)
                      ? "Job removed from your saved list."
                      : "Job saved for later."
                  }
                >
                  {state.savedJobs.includes(job.id)
                    ? `Unsave ${job.title}`
                    : `Save ${job.title}`}
                </Action>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
