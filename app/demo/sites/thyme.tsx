"use client";
import Link from "next/link";
import { useListFlag, useListParam } from "../../shared/list-params";
import { useRouter } from "next/navigation";
import { dishes, money, prettyDate } from "./_lib/data";
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
export function Thyme({ path }: { path: string[] }) {
  const { state, act, busy } = useDemo(),
    router = useRouter();
  const [query, setQuery] = useListParam("q"),
    [category, setCategory] = useListParam("category", "All", [
      "All",
      ...dishes.map((d) => d.category),
    ]),
    [vegan, setVegan] = useListFlag("vegan");
  if (!state) return <Loading />;
  if (path[0] === "orders")
    return (
      <>
        <Heading
          eyebrow="From our kitchen"
          title="My orders"
          description="Your saved pickup orders and receipts."
        />
        {!state.foodOrders.length ? (
          <Empty
            title="Something delicious awaits."
            text="Explore the menu and put together your first order."
            href="/demo/sites/thyme"
            label="See the menu"
          />
        ) : (
          <div className={s.recordGrid}>
            {state.foodOrders.map((order) => (
              <article className={s.record} key={order.id}>
                <div className={s.recordTop}>
                  <Badge>{order.status}</Badge>
                  <small>{order.id}</small>
                </div>
                <h2>Order for {order.name}</h2>
                <p>
                  {prettyDate(order.created)} · {order.pickup}
                </p>
                <ul className={s.lineItems}>
                  {order.items.map((item) => (
                    <li key={item.name}>
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <strong>{money(item.quantity * item.price)}</strong>
                    </li>
                  ))}
                </ul>
                {order.note && <p>Kitchen note: {order.note}</p>}
                <div className={s.total}>
                  <span>Total paid at pickup</span>
                  <strong>{money(order.total)}</strong>
                </div>
                <div className={s.actions}>
                  <Receipt
                    filename={order.id}
                    text={`TABLE & THYME\n${order.id}\n${order.name}\n${order.items.map((i) => `${i.quantity} x ${i.name}: ${money(i.price * i.quantity)}`).join("\n")}\nSubtotal: ${money(order.subtotal)}\nDiscount: ${money(order.discount)}\nPackaging: ${money(order.fee)}\nTotal: ${money(order.total)}\n${order.status}\nSample order — no food is prepared.`}
                  />
                  {order.status === "Received" && (
                    <Action
                      input={{ action: "cancel-food", id: order.id }}
                      message="Your order has been cancelled."
                      confirm="Cancel this pickup order?"
                    >
                      Cancel order
                    </Action>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </>
    );
  if (path[0] === "basket") {
    const subtotal = state.foodCart.reduce(
        (sum, line) =>
          sum + dishes.find((d) => d.id === line.id)!.price * line.quantity,
        0,
      ),
      discount = state.coupon ? Math.round(subtotal * 0.1) : 0;
    return (
      <>
        <Heading
          eyebrow="Freshly made, just for you"
          title="Your basket"
          description="Pickup at Table & Thyme, 24 Garden Lane, Jakarta."
        />
        {!state.foodCart.length ? (
          <Empty
            title="What's for lunch?"
            text="Your basket is waiting for something good."
            href="/demo/sites/thyme"
            label="Explore the menu"
          />
        ) : (
          <div className={s.detailLayout}>
            <section className={s.panel}>
              <h2>A little of what you love</h2>
              {state.foodCart.map((line) => {
                const dish = dishes.find((d) => d.id === line.id)!;
                return (
                  <div className={s.basketLine} key={line.id}>
                    <div className={s.miniArt}>
                      <Scene kind="food" color={dish.color} />
                    </div>
                    <div>
                      <h3>{dish.name}</h3>
                      <p>{money(dish.price)}</p>
                      <button
                        className={s.textButton}
                        disabled={busy}
                        onClick={() =>
                          void act(
                            {
                              action: "food-quantity",
                              id: line.id,
                              quantity: 0,
                            },
                            `${dish.name} removed.`,
                          )
                        }
                      >
                        Remove {dish.name}
                      </button>
                    </div>
                    <div className={s.quantity}>
                      <button
                        aria-label={`Decrease ${dish.name}`}
                        disabled={busy}
                        onClick={() =>
                          void act({
                            action: "food-quantity",
                            id: line.id,
                            quantity: line.quantity - 1,
                          })
                        }
                      >
                        −
                      </button>
                      <span aria-label={`${dish.name} quantity`}>
                        {line.quantity}
                      </span>
                      <button
                        aria-label={`Increase ${dish.name}`}
                        disabled={busy || line.quantity >= 20}
                        onClick={() =>
                          void act({
                            action: "food-quantity",
                            id: line.id,
                            quantity: line.quantity + 1,
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                    <strong>{money(dish.price * line.quantity)}</strong>
                  </div>
                );
              })}
              <Link href="/demo/sites/thyme" className={s.back}>
                ← Add something else
              </Link>
              <div className={s.offer}>
                <Form
                  onSubmit={async (data) => {
                    await act(
                      { action: "food-coupon", coupon: data.coupon },
                      "Your offer has been updated.",
                    );
                  }}
                >
                  <Field
                    label="Offer code"
                    hint="A little treat: LUNCH10 takes 10% off your food."
                  >
                    <input
                      name="coupon"
                      defaultValue={state.coupon}
                      placeholder="Enter your code"
                      maxLength={30}
                    />
                  </Field>
                  <Submit>Apply offer</Submit>
                </Form>
              </div>
            </section>
            <aside className={s.formCard}>
              <h2>Ready when you are.</h2>
              <dl className={s.summary}>
                <div>
                  <dt>Food subtotal</dt>
                  <dd>{money(subtotal)}</dd>
                </div>
                <div>
                  <dt>Offer {state.coupon}</dt>
                  <dd>−{money(discount)}</dd>
                </div>
                <div>
                  <dt>Packaging</dt>
                  <dd>{money(5000)}</dd>
                </div>
              </dl>
              <div className={s.total}>
                <span>Total</span>
                <strong data-testid="food-total">
                  {money(subtotal - discount + 5000)}
                </strong>
              </div>
              <Form
                onSubmit={async (data) => {
                  const result = await act({ ...data, action: "food-order" });
                  if (result) router.push("/demo/sites/thyme/orders");
                }}
              >
                <Field label="Name for your order">
                  <input
                    name="name"
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    type="tel"
                    name="phone"
                    minLength={7}
                    maxLength={24}
                    autoComplete="tel"
                    required
                  />
                </Field>
                <Field label="Pickup time">
                  <select name="pickup">
                    <option>As soon as possible</option>
                    <option>In 30 minutes</option>
                    <option>In 60 minutes</option>
                  </select>
                </Field>
                <Field label="Note for the kitchen (optional)">
                  <textarea
                    name="note"
                    maxLength={500}
                    placeholder="Anything we should know?"
                  />
                </Field>
                <Submit>Place pickup order →</Submit>
                <p className={s.fine}>
                  Pay at pickup. This sample saves your order; no food is
                  prepared or payment collected.
                </p>
              </Form>
            </aside>
          </div>
        )}
      </>
    );
  }
  const filtered = dishes.filter(
    (d) =>
      `${d.name} ${d.description}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (category === "All" || d.category === category) &&
      (!vegan || d.dietary === "Vegan"),
  );
  return (
    <>
      <section className={s.foodHero}>
        <div>
          <p className={s.eyebrow}>Seasonal food. Everyday joy.</p>
          <h1>
            Good food.
            <br />
            <em>Good mood.</em>
          </h1>
          <p>
            A thoughtful little menu, made with the season.
            <br />
            Pick your favorites. We’ll take it from here.
          </p>
          <div className={s.pills}>
            <Badge>Pickup only</Badge>
            <Badge>Freshly prepared</Badge>
            <Badge>Plant-friendly</Badge>
          </div>
        </div>
        <Scene kind="food" color="#d9b576" />
      </section>
      <Heading
        eyebrow="Made with care"
        title="The everyday menu"
        description="Bowls, toasts, sweet things, and something to sip."
      />
      <Search
        query={query}
        setQuery={setQuery}
        placeholder="Find your favorite dish"
        options={[...new Set(dishes.map((d) => d.category))]}
        filter={category}
        setFilter={setCategory}
      />
      <div className={s.resultBar}>
        <p data-testid="results-count">{filtered.length} dishes</p>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={vegan}
            onChange={(e) => setVegan(e.target.checked)}
          />{" "}
          Vegan dishes only
        </label>
      </div>
      {!filtered.length ? (
        <Empty
          title="Nothing on the menu matches."
          text="Try another search or category."
        />
      ) : (
        <div className={s.cardGrid}>
          {filtered.map((dish, i) => (
            <article className={s.card} key={dish.id}>
              <Scene kind="food" color={dish.color} variant={i} />
              <div className={s.cardBody}>
                <div className={s.recordTop}>
                  <p className={s.eyebrow}>{dish.category}</p>
                  {dish.dietary && <Badge>{dish.dietary}</Badge>}
                </div>
                <h2>{dish.name}</h2>
                <p>{dish.description}</p>
                <div className={s.recordTop}>
                  <strong>{money(dish.price)}</strong>
                  <button
                    className={s.button}
                    disabled={busy || !dish.available}
                    onClick={() =>
                      void act(
                        { action: "food-add", id: dish.id, quantity: 1 },
                        `${dish.name} added to your basket.`,
                      )
                    }
                    aria-label={
                      dish.available
                        ? `Add ${dish.name}`
                        : `${dish.name} sold out`
                    }
                  >
                    {dish.available ? "Add" : "Sold out"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className={s.banner}>
        <div>
          <h2>A little treat for your lunch break.</h2>
          <p>
            Use LUNCH10 for 10% off your food. Good things taste even better
            together.
          </p>
        </div>
        <Link className={s.button} href="/demo/sites/thyme/basket">
          View your basket →
        </Link>
      </div>
    </>
  );
}
