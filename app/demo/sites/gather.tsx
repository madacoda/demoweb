"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { events, money, prettyDate } from "./_lib/data";
import {
  Action,
  Badge,
  Empty,
  Field,
  Form,
  Heading,
  Loading,
  Receipt,
  Scene,
  Search,
  Submit,
  useDemo,
} from "./ui";
import s from "./sites.module.css";
export function Gather({ path }: { path: string[] }) {
  const { state, act } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [quantity, setQuantity] = useState(1);
  if (!state) return <Loading />;
  const available = (eventId: string) =>
    events.find((e) => e.id === eventId)!.capacity -
    state.registrations
      .filter((r) => r.eventId === eventId && r.status === "Confirmed")
      .reduce((sum, r) => sum + r.quantity, 0);
  if (path[0] === "tickets")
    return (
      <>
        <Heading
          eyebrow="Good things on the calendar"
          title="My tickets"
          description="Your next good story is right here."
        />
        {!state.registrations.length ? (
          <Empty
            title="Make a little room for something new."
            text="Find an event, bring a friend, and see where the day goes."
            href="/demo/sites/gather"
            label="Discover events"
          />
        ) : (
          <div className={s.recordGrid}>
            {state.registrations.map((ticket) => (
              <article className={`${s.record} ${s.ticket}`} key={ticket.id}>
                <div className={s.recordTop}>
                  <Badge>{ticket.status}</Badge>
                  <small>{ticket.id}</small>
                </div>
                <h2>{ticket.title}</h2>
                <p>
                  {prettyDate(ticket.date)} · {ticket.venue}
                </p>
                <p>
                  {ticket.quantity} ticket{ticket.quantity !== 1 ? "s" : ""} ·{" "}
                  {ticket.name}
                </p>
                <strong className={s.price}>
                  {ticket.total ? money(ticket.total) : "Free admission"}
                </strong>
                <div className={s.actions}>
                  <Receipt
                    filename={ticket.id}
                    label="Download tickets"
                    text={`GATHER\n${ticket.id}\n${ticket.title}\n${ticket.date}\n${ticket.venue}\n${ticket.quantity} tickets for ${ticket.name}\n${ticket.status}\nSample tickets — not valid for admission.`}
                  />
                  {ticket.status === "Confirmed" && (
                    <Action
                      input={{ action: "cancel-event", id: ticket.id }}
                      message="Your tickets have been cancelled."
                      confirm="Cancel these tickets? The places will become available again."
                    >
                      Cancel tickets
                    </Action>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </>
    );
  if (path[0] === "events") {
    const event = events.find((e) => e.id === path[1])!,
      remaining = available(event.id);
    return (
      <>
        <Link className={s.back} href="/demo/sites/gather">
          ← Discover events
        </Link>
        <div className={s.detailLayout}>
          <div>
            <div className={s.detailArt}>
              <Scene kind="event" color={event.color} />
            </div>
            <Heading
              eyebrow={event.category}
              title={event.title}
              description={event.description}
            />
            <div className={s.pills}>
              <Badge>
                {prettyDate(event.date)} · {event.time}
              </Badge>
              <Badge>{event.venue}</Badge>
            </div>
            <section className={s.prose}>
              <h2>A few things to know</h2>
              <p>
                Doors open 15 minutes before the event. Bring your ticket
                confirmation and your curiosity. This is a welcoming space for
                everyone.
              </p>
              <p>
                Plans changed? Cancel from My tickets to release your places.
                Each reservation can include up to eight people.
              </p>
            </section>
          </div>
          <aside className={s.formCard}>
            <p className={s.eyebrow}>Save your spot</p>
            <h2>{event.price ? money(event.price) : "Free admission"}</h2>
            <p>
              Per person ·{" "}
              <strong data-testid="tickets-remaining">
                {remaining} places left
              </strong>
            </p>
            {remaining ? (
              <Form
                onSubmit={async (data) => {
                  const result = await act({
                    ...data,
                    action: "reserve-event",
                    eventId: event.id,
                    quantity: Number(data.quantity),
                  });
                  if (result) router.push("/demo/sites/gather/tickets");
                }}
              >
                <Field label="Tickets">
                  <select
                    name="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.min(8, remaining) }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Full name">
                  <input
                    name="name"
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
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
                <div className={s.total}>
                  <span>Total</span>
                  <strong data-testid="ticket-total">
                    {money(quantity * event.price)}
                  </strong>
                </div>
                <Submit>Reserve tickets →</Submit>
                <p className={s.fine}>
                  A sample reservation. No payment is collected and no real
                  tickets are issued.
                </p>
              </Form>
            ) : (
              <Empty
                title="All booked up"
                text="There are no places left for this event. Find something else you’ll love."
                href="/demo/sites/gather"
                label="More events"
              />
            )}
          </aside>
        </div>
      </>
    );
  }
  const filtered = events.filter(
    (e) =>
      `${e.title} ${e.location} ${e.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All" || e.category === category),
  );
  return (
    <>
      <section className={s.eventHero}>
        <div>
          <p className={s.eyebrow}>Less scrolling. More showing up.</p>
          <h1>
            Your next
            <br />
            <em>“you had to be there.”</em>
          </h1>
          <p>Small gatherings. New faces. Things worth making time for.</p>
          <a href="#events" className={s.lightButton}>
            Find your people ↗
          </a>
        </div>
        <Scene kind="event" color="#c4a5bd" />
      </section>
      <section id="events">
        <Heading eyebrow="Coming up" title="Good things are happening." />
        <Search
          query={query}
          setQuery={setQuery}
          placeholder="Search an event, city, or interest"
          options={[...new Set(events.map((e) => e.category))]}
          filter={category}
          setFilter={setCategory}
        />
        <p className={s.results} data-testid="results-count">
          {filtered.length} events
        </p>
        {!filtered.length ? (
          <Empty
            title="Nothing here just yet."
            text="Try another interest or city."
          />
        ) : (
          <div className={s.cardGrid}>
            {filtered.map((event, i) => (
              <Link
                className={s.card}
                href={`/demo/sites/gather/events/${event.id}`}
                key={event.id}
              >
                <div className={s.eventArt}>
                  <Scene kind="event" color={event.color} variant={i} />
                  <span className={s.dateChip}>
                    {prettyDate(event.date).split(" ").slice(0, 2).join(" ")}
                  </span>
                </div>
                <div className={s.cardBody}>
                  <p className={s.eyebrow}>
                    {event.category} · {event.location}
                  </p>
                  <h2>{event.title}</h2>
                  <p>
                    {event.venue} · {event.time}
                  </p>
                  <div className={s.recordTop}>
                    <strong>{event.price ? money(event.price) : "Free"}</strong>
                    <Badge>
                      {available(event.id)
                        ? `${available(event.id)} places left`
                        : "Sold out"}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
