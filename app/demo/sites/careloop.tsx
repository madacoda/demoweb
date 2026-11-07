"use client";
import Link from "next/link";
import { useListParam } from "../../shared/list-params";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { prettyDate, priorities, ticketCategories } from "./_lib/data";
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
const articles = [
  [
    "How do I open a support request?",
    "Choose New request, add a clear subject and description, then select the category and priority. Your request is saved immediately and appears in My requests.",
  ],
  [
    "Can I add information after submitting?",
    "Yes. Open any request and use the reply box to add details. Every message stays in the conversation. If the request is resolved, reopen it first.",
  ],
  [
    "What do the priorities mean?",
    "Low is for general questions. Medium is for an issue affecting part of your work. High is for an issue that prevents you from continuing. You choose a priority when opening a request.",
  ],
  [
    "How do I close or reopen a request?",
    "Open the request and choose Mark as resolved. If you need more help later, choose Reopen request from the same page. Your conversation is kept.",
  ],
  [
    "Where are my requests stored?",
    "Requests are saved on the local server in your browser's sample workspace. Reloading or restarting the server preserves them. A new browser context starts a separate workspace.",
  ],
  [
    "Will someone respond to my message?",
    "Careloop is a functional sample support portal. New messages are saved, but no support staff are notified. The initial conversations include fictional replies to show what a conversation looks like.",
  ],
];
export function Careloop({ path }: { path: string[] }) {
  const { state, act } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useListParam("q"),
    [status, setStatus] = useListParam("status", "All", [
      "All",
      "Open",
      "Resolved",
    ]),
    [reply, setReply] = useState("");
  if (!state) return <Loading />;
  if (path[0] === "help")
    return (
      <>
        <Heading
          eyebrow="A little clarity"
          title="How can we help?"
          description="Quick answers to help you find your way."
        />
        <div className={s.helpGrid}>
          <section>
            <h2>Using Careloop</h2>
            {articles.map(([question, answer]) => (
              <details className={s.faq} key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>
          <aside className={s.formCard}>
            <h2>Need something else?</h2>
            <p>
              Give us a little context and keep the conversation in one place.
            </p>
            <Link href="/demo/sites/careloop/new" className={s.button}>
              Open a request →
            </Link>
          </aside>
        </div>
      </>
    );
  if (path[0] === "new")
    return (
      <>
        <Link className={s.back} href="/demo/sites/careloop">
          ← My requests
        </Link>
        <Heading
          eyebrow="Let's work through it"
          title="Open a request"
          description="The more context you can share, the easier it is to help."
        />
        <div className={s.editor}>
          <Form
            onSubmit={async (data) => {
              const result = await act({ ...data, action: "ticket-create" });
              if (result?.id)
                router.push(`/demo/sites/careloop/tickets/${result.id}`);
            }}
          >
            <Field label="Subject">
              <input
                name="subject"
                minLength={5}
                maxLength={120}
                placeholder="A short description of what you need"
                required
              />
            </Field>
            <div className={s.formGrid}>
              <Field label="Category">
                <select name="category">
                  {ticketCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="Medium">
                  {priorities.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="What's happening?"
              hint="Include what you expected, what happened, and any steps that help explain the issue."
            >
              <textarea
                name="body"
                minLength={10}
                maxLength={5000}
                rows={7}
                required
              />
            </Field>
            <Submit>Submit request →</Submit>
            <p className={s.fine}>
              Your request is saved in this sample portal. No message is sent to
              support staff.
            </p>
          </Form>
        </div>
      </>
    );
  if (path[0] === "tickets") {
    const ticket = state.tickets.find((t) => t.id === path[1]);
    if (!ticket)
      return (
        <Empty
          title="Request not found"
          text="This request may belong to another workspace."
          href="/demo/sites/careloop"
          label="Back to requests"
        />
      );
    return (
      <>
        <Link className={s.back} href="/demo/sites/careloop">
          ← My requests
        </Link>
        <Heading
          eyebrow={ticket.id}
          title={ticket.subject}
          description={`Opened ${prettyDate(ticket.created)} · ${ticket.category}`}
          action={
            <Action
              input={{
                action: "ticket-status",
                id: ticket.id,
                status: ticket.status === "Open" ? "Resolved" : "Open",
              }}
              message={
                ticket.status === "Open"
                  ? "Request marked as resolved."
                  : "Request reopened."
              }
            >
              {ticket.status === "Open" ? "Mark as resolved" : "Reopen request"}
            </Action>
          }
        />
        <div className={s.helpGrid}>
          <section className={s.conversation}>
            <h2>Conversation</h2>
            {ticket.messages.map((message) => (
              <article
                className={s.message}
                data-author={message.author}
                key={message.id}
              >
                <div className={s.recordTop}>
                  <strong>{message.author}</strong>
                  <time dateTime={message.created}>
                    {prettyDate(message.created)}
                  </time>
                </div>
                <p className={s.preserve}>{message.body}</p>
              </article>
            ))}
            {ticket.status === "Open" ? (
              <Form
                onSubmit={async () => {
                  const result = await act(
                    { action: "ticket-reply", id: ticket.id, body: reply },
                    "Your reply has been saved.",
                  );
                  if (result) setReply("");
                }}
              >
                <Field label="Your reply">
                  <textarea
                    name="body"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    minLength={1}
                    maxLength={5000}
                    rows={4}
                    placeholder="Add a little more context…"
                    required
                  />
                </Field>
                <Submit>Send reply →</Submit>
              </Form>
            ) : (
              <p className={s.resolved}>
                This request is resolved. Reopen it to continue the
                conversation.
              </p>
            )}
          </section>
          <aside className={s.formCard}>
            <h2>Request details</h2>
            <dl className={s.summary}>
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge>{ticket.status}</Badge>
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{ticket.priority}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div>
                <dt>Messages</dt>
                <dd>{ticket.messages.length}</dd>
              </div>
            </dl>
            <p className={s.fine}>
              Sample conversation. Messages are saved here; no staff are
              notified.
            </p>
            <Link href="/demo/sites/careloop/help" className={s.back}>
              Visit the help center ↗
            </Link>
          </aside>
        </div>
      </>
    );
  }
  const filtered = state.tickets.filter(
    (ticket) =>
      `${ticket.subject} ${ticket.id} ${ticket.category}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (status === "All" || ticket.status === status),
  );
  return (
    <>
      <section className={s.supportHero}>
        <div>
          <p className={s.eyebrow}>A good conversation changes things</p>
          <h1>
            Hello. Let’s get
            <br />
            you <em>sorted.</em>
          </h1>
          <p>A calm place for questions, updates, and a little help.</p>
        </div>
        <div className={s.supportBubble} aria-hidden="true">
          <span>How can we help?</span>
          <span>Let’s figure it out, together.</span>
          <span>✓ You’re in the right place.</span>
        </div>
      </section>
      <Heading
        eyebrow="Your support space"
        title="My requests"
        description="Every question and conversation, together."
        action={
          <Link className={s.button} href="/demo/sites/careloop/new">
            + New request
          </Link>
        }
      />
      <div className={s.stats}>
        <div>
          <span>All requests</span>
          <strong>{state.tickets.length}</strong>
        </div>
        <div>
          <span>Open</span>
          <strong>
            {state.tickets.filter((t) => t.status === "Open").length}
          </strong>
        </div>
        <div>
          <span>Resolved</span>
          <strong>
            {state.tickets.filter((t) => t.status === "Resolved").length}
          </strong>
        </div>
      </div>
      <Search
        query={query}
        setQuery={setQuery}
        placeholder="Find a request by subject or ID"
        options={["Open", "Resolved"]}
        filter={status}
        setFilter={setStatus}
        filterLabel="Status"
      />
      <p className={s.results} data-testid="results-count">
        {filtered.length} requests
      </p>
      {!filtered.length ? (
        <Empty
          title="Nothing in this view."
          text="Try a different search, or open a new request."
          href="/demo/sites/careloop/new"
          label="Open a request"
        />
      ) : (
        <div className={s.requestList}>
          {filtered.map((ticket) => (
            <Link
              href={`/demo/sites/careloop/tickets/${ticket.id}`}
              className={s.requestRow}
              key={ticket.id}
            >
              <span className={s.requestIcon} aria-hidden="true">
                {ticket.status === "Resolved" ? "✓" : "↗"}
              </span>
              <div>
                <p className={s.eyebrow}>
                  {ticket.id} · {ticket.category}
                </p>
                <h2>{ticket.subject}</h2>
                <p>
                  {prettyDate(ticket.created)} · {ticket.messages.length}{" "}
                  messages
                </p>
              </div>
              <div className={s.requestEnd}>
                <Badge>{ticket.status}</Badge>
                <span>{ticket.priority} priority</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className={s.banner}>
        <div>
          <h2>The answer might be right here.</h2>
          <p>Find your way around with our quick help articles.</p>
        </div>
        <Link className={s.secondary} href="/demo/sites/careloop/help">
          Browse help center ↗
        </Link>
      </div>
    </>
  );
}
