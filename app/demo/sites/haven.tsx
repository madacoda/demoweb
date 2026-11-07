"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dateAfter, money, prettyDate, rooms } from "./_lib/data";
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

export function Haven({ path }: { path: string[] }) {
  const { state, act } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useState(""),
    [location, setLocation] = useState("All"),
    [sort, setSort] = useState("recommended"),
    [guests, setGuests] = useState(1);
  const [start, setStart] = useState(dateAfter(1)),
    [end, setEnd] = useState(dateAfter(3));
  if (!state) return <Loading />;
  if (path[0] === "bookings")
    return (
      <>
        <Heading
          eyebrow="Your next escape"
          title="My bookings"
          description="All the details, in one peaceful place."
        />
        {!state.bookings.length ? (
          <Empty
            title="A little getaway is calling."
            text="Explore our stays and find a place that feels like you."
            href="/demo/sites/haven"
            label="Find a stay"
          />
        ) : (
          <div className={s.recordGrid}>
            {state.bookings.map((booking) => {
              const room = rooms.find((r) => r.id === booking.roomId)!;
              return (
                <article
                  className={s.record}
                  key={booking.id}
                  data-testid={booking.id}
                >
                  <div className={s.recordTop}>
                    <Badge>{booking.status}</Badge>
                    <small>{booking.id}</small>
                  </div>
                  <h2>{room.name}</h2>
                  <p>
                    {room.location} · {booking.guests} guest
                    {booking.guests !== 1 ? "s" : ""}
                  </p>
                  <p>
                    {prettyDate(booking.start)} → {prettyDate(booking.end)}
                  </p>
                  <p>
                    {booking.name} · {booking.email}
                  </p>
                  <strong className={s.price}>{money(booking.total)}</strong>
                  <div className={s.actions}>
                    <Receipt
                      filename={booking.id}
                      text={`HAVEN\n${booking.id}\n${room.name}\n${booking.start} to ${booking.end}\n${booking.guests} guests\n${booking.name}\n${money(booking.total)}\n${booking.status}\nSample reservation — no physical booking.`}
                      label="Download booking"
                    />
                    {booking.status === "Confirmed" && (
                      <Action
                        input={{ action: "cancel-stay", id: booking.id }}
                        message="Your booking has been cancelled."
                        confirm="Cancel this booking? These dates will become available again."
                      >
                        Cancel booking
                      </Action>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </>
    );
  if (path[0] === "stays") {
    const room = rooms.find((r) => r.id === path[1])!;
    const nights = Math.max(
      0,
      (Date.parse(end) - Date.parse(start)) / 86400000,
    );
    const occupied = state.bookings.some(
      (b) =>
        b.roomId === room.id &&
        b.status === "Confirmed" &&
        start < b.end &&
        end > b.start,
    );
    return (
      <>
        <Link className={s.back} href="/demo/sites/haven">
          ← All stays
        </Link>
        <div className={s.detailLayout}>
          <div>
            <div className={s.detailArt}>
              <Scene kind="stay" color={room.color} />
            </div>
            <Heading
              eyebrow={`${room.location} · ${room.type}`}
              title={room.name}
              description={room.detail}
            />
            <div className={s.pills}>
              {room.amenities.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
              <Badge>Up to {room.guests} guests</Badge>
            </div>
            <section className={s.prose}>
              <h2>Settle in, feel at home.</h2>
              <p>
                Check-in from 14:00. Check-out before 11:00. Your stay includes
                fresh linens, towels, and a local guide to the neighborhood.
              </p>
              <h3>Plans can change</h3>
              <p>
                Cancel any sample booking from My bookings. Your reserved dates
                will immediately become available again.
              </p>
            </section>
          </div>
          <aside className={s.formCard}>
            <h2>Your little escape</h2>
            <p>
              <strong className={s.price}>{money(room.price)}</strong> / night
            </p>
            <Form
              onSubmit={async (data) => {
                const result = await act({
                  ...data,
                  action: "book-stay",
                  roomId: room.id,
                  guests: Number(data.guests),
                });
                if (result) router.push("/demo/sites/haven/bookings");
              }}
            >
              <div className={s.formGrid}>
                <Field label="Check-in">
                  <input
                    name="start"
                    type="date"
                    min={dateAfter(0)}
                    max={dateAfter(365)}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Check-out">
                  <input
                    name="end"
                    type="date"
                    min={start}
                    max={dateAfter(365)}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Guests">
                <select name="guests">
                  {Array.from({ length: room.guests }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </Field>
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
              <div className={s.total}>
                <span>
                  {Number.isFinite(nights) ? nights : 0} nights · total
                </span>
                <strong data-testid="stay-total">
                  {money(Number.isFinite(nights) ? room.price * nights : 0)}
                </strong>
              </div>
              {occupied && (
                <p className={s.inlineError}>
                  Already booked for these dates. Choose another date range.
                </p>
              )}
              <Submit>Reserve this stay →</Submit>
              <p className={s.fine}>
                No payment is collected. This is a saved sample reservation.
              </p>
            </Form>
          </aside>
        </div>
      </>
    );
  }
  const filtered = rooms
    .filter(
      (room) =>
        `${room.name} ${room.location} ${room.type}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (location === "All" || room.location === location) &&
        room.guests >= guests,
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : 0,
    );
  return (
    <>
      <section className={s.havenHero}>
        <div>
          <p className={s.eyebrow}>Stay a little longer</p>
          <h1>
            Somewhere worth
            <br />
            <em>slowing down.</em>
          </h1>
          <p>
            Thoughtfully chosen spaces. A change of scenery.
            <br />
            Find your own little corner of Indonesia.
          </p>
          <a href="#stays" className={s.button}>
            Find your haven ↗
          </a>
        </div>
        <Scene kind="stay" color="#b4c7a6" />
      </section>
      <section id="stays">
        <Heading
          eyebrow="Places with a little soul"
          title="Find your next stay"
          description="Nine unique spaces, from mountain mornings to ocean evenings."
        />
        <Search
          query={query}
          setQuery={setQuery}
          placeholder="Try Ubud, villa, or a name"
          options={[...new Set(rooms.map((r) => r.location))]}
          filter={location}
          setFilter={setLocation}
          filterLabel="Destination"
        />
        <div className={s.resultBar}>
          <p data-testid="results-count">{filtered.length} stays</p>
          <div className={s.inlineFields}>
            <Field label="Guests">
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sort by">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </Field>
          </div>
        </div>
        {!filtered.length ? (
          <Empty
            title="No stays found"
            text="Try another destination, fewer guests, or a different search."
          />
        ) : (
          <div className={s.cardGrid}>
            {filtered.map((room) => (
              <Link
                className={s.card}
                href={`/demo/sites/haven/stays/${room.id}`}
                key={room.id}
              >
                <Scene kind="stay" color={room.color} />
                <div className={s.cardBody}>
                  <p className={s.eyebrow}>
                    {room.location} · {room.type}
                  </p>
                  <h2>
                    {room.name}
                    <span>↗</span>
                  </h2>
                  <p>
                    Up to {room.guests} guests · {room.amenities[0]}
                  </p>
                  <p>
                    <strong>{money(room.price)}</strong> / night
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
