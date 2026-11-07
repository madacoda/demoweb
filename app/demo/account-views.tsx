"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "./_lib/catalog";
import { Icon } from "./art";
import { useStore } from "./store-context";
import { EmptyState, Field, formValues, PageHeading } from "./components";
import s from "./demo.module.css";

export function AuthView({ register = false }: { register?: boolean }) {
  const { act, busy, state } = useStore();
  const router = useRouter();
  const [mismatch, setMismatch] = useState(false);
  if (state.user)
    return (
      <>
        <PageHeading
          eyebrow="A FAMILIAR PLACE"
          title={`Hello, ${state.user.name.split(" ")[0]}.`}
        />
        <EmptyState
          icon="user"
          title="You’re already signed in."
          link="/demo/account"
          action="Go to your account"
        >
          Your saved favorites and orders are ready for you.
        </EmptyState>
      </>
    );
  return (
    <div className={s.authLayout}>
      <div className={s.authEditorial}>
        <span aria-hidden="true">✳</span>
        <p className={s.eyebrow}>A LITTLE PLACE OF YOUR OWN</p>
        <h1>
          {register ? (
            <>
              Make yourself
              <br />
              at home.
            </>
          ) : (
            <>
              Good to have
              <br />
              you back.
            </>
          )}
        </h1>
        <p>
          Your favorites, your orders, your everyday.
          <br />
          All in one thoughtful little place.
        </p>
        <Link href="/demo/shop">
          Take a look around
          <Icon name="arrow" size={17} />
        </Link>
      </div>
      <section className={s.authCard}>
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p>
          {register
            ? "Keep your good finds close."
            : "Sign in to pick up where you left off."}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const values = formValues(event.currentTarget);
            if (register && values.password !== values.confirmPassword) {
              setMismatch(true);
              return;
            }
            setMismatch(false);
            const result = await act({
              action: register ? "register" : "login",
              ...values,
            });
            if (result) router.push("/demo/account");
          }}
        >
          {register && (
            <Field
              name="name"
              label="Full name"
              maxLength={100}
              placeholder="Alex Morgan"
            />
          )}
          <Field
            name="email"
            label="Email address"
            type="email"
            maxLength={254}
            placeholder="alex@example.com"
          />
          <Field
            name="password"
            label="Password"
            type="password"
            maxLength={128}
            pattern=".{8,128}"
            placeholder="At least 8 characters"
          />
          {register && (
            <Field
              name="confirmPassword"
              label="Confirm password"
              type="password"
              maxLength={128}
            />
          )}
          {mismatch && (
            <p role="alert" className={s.errorText}>
              Your passwords don’t match.
            </p>
          )}
          <button className={s.primaryButton} disabled={busy}>
            {busy ? "One moment…" : register ? "Create account" : "Sign in"}
            <Icon name="arrow" size={17} />
          </button>
        </form>
        <p className={s.authSwitch}>
          {register ? "Already feel at home?" : "New around here?"}{" "}
          <Link href={register ? "/demo/login" : "/demo/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <p className={s.hint}>
          Your bag and saved items stay with you when you sign in.
        </p>
      </section>
    </div>
  );
}

export function OrdersView() {
  const { state } = useStore();
  return (
    <>
      <PageHeading eyebrow="THE THINGS YOU CHOSE" title="Your orders.">
        All your good finds, in one place.
      </PageHeading>
      {state.orders.length ? (
        <div className={s.orderList}>
          {state.orders.map((order) => (
            <Link
              href={`/demo/orders/${order.id}`}
              className={s.orderListRow}
              key={order.id}
            >
              <div>
                <strong>{order.id}</strong>
                <span>
                  {new Date(order.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  items
                </span>
              </div>
              <span className={s.statusBadge}>
                {order.status === "confirmed" ? "Confirmed" : "Cancelled"}
              </span>
              <strong>{money(order.total)}</strong>
              <Icon name="arrow" size={19} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="box" title="Your story starts with a good find.">
          When you place an order, you’ll find it right here.
        </EmptyState>
      )}
      {!state.user && (
        <p className={s.guestNote}>
          These orders belong to this browser.{" "}
          <Link href="/demo/register">Create an account</Link> to keep them with
          you across devices.
        </p>
      )}
    </>
  );
}

export function AccountView() {
  const { state, act, busy } = useStore();
  const router = useRouter();
  const user = state.user;
  if (!user)
    return (
      <>
        <PageHeading
          eyebrow="YOUR LITTLE CORNER"
          title="Make yourself at home."
        />
        <EmptyState
          icon="user"
          title="Everything, together."
          link="/demo/login"
          action="Sign in"
        >
          Save your favorites, follow your orders, and keep your details for
          next time.
        </EmptyState>
        <div className={s.centerActions}>
          <Link href="/demo/register">Create an account</Link>
          <Link href="/demo/orders">View guest orders</Link>
        </div>
      </>
    );
  return (
    <>
      <div className={s.accountHeading}>
        <PageHeading
          eyebrow="YOUR LITTLE CORNER"
          title={`Hello, ${user.name.split(" ")[0]}.`}
        >
          Good to see you again. Here’s your everyday, all together.
        </PageHeading>
        <button
          className={s.textButton}
          disabled={busy}
          onClick={async () => {
            if (await act({ action: "logout" })) router.push("/demo/login");
          }}
        >
          Sign out
        </button>
      </div>
      <div className={s.accountShortcuts}>
        <Link href="/demo/orders">
          <Icon name="box" />
          <div>
            <strong>{state.orders.length} orders</strong>
            <span>Your past good finds</span>
          </div>
          <Icon name="arrow" size={17} />
        </Link>
        <Link href="/demo/saved">
          <Icon name="heart" />
          <div>
            <strong>{state.saved.length} favorites</strong>
            <span>A little something for later</span>
          </div>
          <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className={s.accountColumns}>
        <section className={s.formCard}>
          <h2>Your details</h2>
          <p className={s.hint}>
            Your saved address fills in automatically at checkout.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await act(
                { action: "profile", ...formValues(event.currentTarget) },
                "Your details have been saved.",
              );
            }}
          >
            <Field
              name="name"
              label="Full name"
              value={user.name}
              maxLength={100}
            />
            <label className={s.field}>
              Email address
              <input value={user.email} readOnly type="email" />
            </label>
            <Field
              name="phone"
              label="Phone number"
              type="tel"
              value={user.phone}
              required={false}
              maxLength={30}
            />
            <Field
              name="address"
              label="Street address"
              value={user.address}
              required={false}
            />
            <div className={s.fieldGrid}>
              <Field
                name="city"
                label="City"
                value={user.city}
                required={false}
                maxLength={100}
              />
              <Field
                name="postalCode"
                label="Postal code"
                value={user.postalCode}
                required={false}
                pattern="[0-9]{5}"
                maxLength={5}
              />
            </div>
            <button className={s.primaryButton} disabled={busy}>
              Save details
              <Icon name="check" size={17} />
            </button>
          </form>
        </section>
        <section className={s.formCard}>
          <h2>Your messages</h2>
          {state.tickets.length ? (
            state.tickets.map((ticket) => (
              <div className={s.ticket} key={ticket.id}>
                <span>{ticket.id} · Received</span>
                <h3>{ticket.subject}</h3>
                <p>{ticket.message}</p>
              </div>
            ))
          ) : (
            <p className={s.hint}>
              Messages you send through the contact form will appear here.
            </p>
          )}
          <Link className={s.secondaryButton} href="/demo/contact">
            Get in touch
            <Icon name="arrow" size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}

export function ContactView() {
  const { state, act, busy } = useStore();
  const [ticket, setTicket] = useState("");
  return (
    <>
      <PageHeading eyebrow="A CONVERSATION STARTS HERE" title="Let’s talk.">
        A question, a thought, a little hello. There’s room for all of it.
      </PageHeading>
      <div className={s.contactLayout}>
        <div className={s.contactIntro}>
          <h2>A little help goes a long way.</h2>
          <p>
            Questions about your order, materials, or choosing the right
            notebook? Leave a message here.
          </p>
          <Link href="/demo/help">
            You might find it in our FAQs
            <Icon name="arrow" size={17} />
          </Link>
          <div className={s.contactNote}>
            <Icon name="box" />
            <h3>About this store</h3>
            <p>
              This is a working sample storefront. Messages are saved and linked
              to your account, but no email is sent and no support team is
              notified.
            </p>
          </div>
        </div>
        <section className={s.formCard}>
          {ticket ? (
            <div className={s.messageSuccess} role="status">
              <span className={s.emptyIcon}>
                <Icon name="check" size={25} />
              </span>
              <h2>Your message is saved.</h2>
              <p>
                Reference <strong data-testid="ticket-id">{ticket}</strong>
              </p>
              <p className={s.hint}>
                You can find it in your account after signing in.
              </p>
              <button
                className={s.secondaryButton}
                onClick={() => setTicket("")}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await act({
                  action: "contact",
                  ...formValues(event.currentTarget),
                });
                if (result?.ticketId) setTicket(result.ticketId);
              }}
            >
              <div className={s.fieldGrid}>
                <Field
                  label="Your name"
                  name="name"
                  value={state.user?.name}
                  maxLength={100}
                />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={state.user?.email}
                  maxLength={254}
                />
              </div>
              <label className={s.field}>
                What’s on your mind?
                <select name="subject" defaultValue="" required>
                  <option value="" disabled>
                    Choose a topic
                  </option>
                  <option>My order</option>
                  <option>Product question</option>
                  <option>Delivery & returns</option>
                  <option>Just saying hello</option>
                </select>
              </label>
              <label className={s.field}>
                Your message
                <textarea
                  name="message"
                  rows={6}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Tell us a little more…"
                />
              </label>
              <button className={s.primaryButton} disabled={busy}>
                Send message
                <Icon name="arrow" size={17} />
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
