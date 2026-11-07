"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { type Customer, type Order, money } from "./_lib/catalog";
import { Icon, ProductArt } from "./art";
import { useStore } from "./store-context";
import {
  EmptyState,
  Field,
  formValues,
  OrderSummary,
  PageHeading,
  Quantity,
} from "./components";
import s from "./demo.module.css";

export function CartView() {
  const { state, act, busy } = useStore();
  return (
    <>
      <PageHeading eyebrow="THE GOOD THINGS YOU FOUND" title="Your bag.">
        A few considered things. Almost yours.
      </PageHeading>
      {!state.cart.length ? (
        <EmptyState title="Your bag is taking a little breather.">
          Fill it with things you’ll reach for every day.
        </EmptyState>
      ) : (
        <div className={s.checkoutGrid}>
          <div>
            <div className={s.cartHeading}>
              <span>OBJECT</span>
              <span>QUANTITY / TOTAL</span>
            </div>
            {state.cart.map((line) => {
              const product = state.products.find(
                (p) => p.id === line.productId,
              )!;
              return (
                <article
                  className={s.cartLine}
                  key={`${line.productId}-${line.color}`}
                  data-testid={`cart-${line.productId}-${line.color}`}
                >
                  <Link
                    className={s.cartArt}
                    href={`/demo/products/${product.slug}`}
                    aria-label={`View ${product.name}`}
                  >
                    <ProductArt product={product} color={line.color} />
                  </Link>
                  <div className={s.cartLineInfo}>
                    <h2>
                      <Link href={`/demo/products/${product.slug}`}>
                        {product.name}
                      </Link>
                    </h2>
                    <p>
                      {line.color} · {money(product.price)} each
                    </p>
                    <button
                      className={s.textButton}
                      disabled={busy}
                      onClick={() =>
                        void act({
                          action: "quantity",
                          productId: product.id,
                          color: line.color,
                          quantity: 0,
                        })
                      }
                      aria-label={`Remove ${product.name} ${line.color}`}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={s.cartLineActions}>
                    <Quantity
                      label={`${product.name} ${line.color}`}
                      value={line.quantity}
                      max={product.stock}
                      onChange={(quantity) =>
                        void act({
                          action: "quantity",
                          productId: product.id,
                          color: line.color,
                          quantity,
                        })
                      }
                    />
                    <strong>{money(product.price * line.quantity)}</strong>
                  </div>
                </article>
              );
            })}
            <div className={s.cartFooter}>
              <Link href="/demo/shop">← Keep exploring</Link>
              <button
                className={s.textButton}
                disabled={busy}
                onClick={() => void act({ action: "clear" })}
              >
                Clear bag
              </button>
            </div>
            <div className={s.softNote}>
              <Icon name="box" />
              <div>
                <strong>A little extra, on us.</strong>
                <p>
                  Standard delivery is free. Choose express or pickup at
                  checkout.
                </p>
              </div>
            </div>
          </div>
          <OrderSummary>
            <Link href="/demo/checkout" className={s.primaryButton}>
              Continue to checkout
              <Icon name="arrow" size={18} />
            </Link>
            <p className={s.hintCenter}>
              No account needed. Checkout as a guest.
            </p>
          </OrderSummary>
        </div>
      )}
    </>
  );
}

export function CheckoutView() {
  const { state, act, busy } = useStore();
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [delivery, setDelivery] = useState(state.delivery);
  const user = state.user;
  return (
    <>
      <PageHeading
        eyebrow="ONE LAST LITTLE THING"
        title="Good things, almost yours."
      >
        A fresh page. A favorite pen. A little space to think.
      </PageHeading>
      {!state.cart.length ? (
        <EmptyState title="Let’s find you something first.">
          Add your favorites to your bag, then come back to checkout.
        </EmptyState>
      ) : (
        <>
          <nav className={s.checkoutSteps} aria-label="Checkout progress">
            <Link href="/demo/cart">
              <Icon name="check" size={13} />
              Your bag
            </Link>
            <span aria-current="step">02 Checkout</span>
            <span>03 All yours</span>
          </nav>
          <div className={s.checkoutGrid}>
            <div>
              <form
                id="checkout-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  const customer = formValues(event.currentTarget) as Customer;
                  requestId.current ||= crypto.randomUUID();
                  const result = await act({
                    action: "checkout",
                    customer,
                    requestId: requestId.current,
                  });
                  if (result?.orderId)
                    router.push(`/demo/orders/${result.orderId}`);
                }}
              >
                <section className={s.formCard}>
                  <div className={s.sectionTitle}>
                    <h2>
                      <span>01</span>Your details
                    </h2>
                    {!user && (
                      <Link href="/demo/login">Already have an account?</Link>
                    )}
                  </div>
                  <div className={s.fieldGrid}>
                    <Field
                      label="Full name"
                      name="name"
                      value={user?.name}
                      maxLength={100}
                      placeholder="Alex Morgan"
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      value={user?.email}
                      placeholder="alex@example.com"
                      maxLength={254}
                    />
                    <Field
                      label="Phone number"
                      name="phone"
                      type="tel"
                      value={user?.phone}
                      maxLength={30}
                      placeholder="0812 3456 7890"
                    />
                  </div>
                </section>
                <section className={s.formCard}>
                  <div className={s.sectionTitle}>
                    <h2>
                      <span>02</span>Getting it to you
                    </h2>
                  </div>
                  <fieldset className={s.deliveryOptions}>
                    <legend className={s.srOnly}>Delivery preference</legend>
                    {[
                      {
                        value: "standard",
                        title: "Standard delivery",
                        detail: "3–5 business days",
                        price: "Free",
                      },
                      {
                        value: "express",
                        title: "Express delivery",
                        detail: "1–2 business days",
                        price: "Rp 25.000",
                      },
                      {
                        value: "pickup",
                        title: "Studio pickup",
                        detail: "Collect at the studio",
                        price: "Free",
                      },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={
                          delivery === option.value ? s.selectedDelivery : ""
                        }
                      >
                        <input
                          type="radio"
                          name="delivery"
                          value={option.value}
                          checked={delivery === option.value}
                          disabled={busy}
                          onChange={async () => {
                            setDelivery(option.value as typeof delivery);
                            const result = await act({
                              action: "delivery",
                              delivery: option.value,
                            });
                            if (!result) setDelivery(state.delivery);
                          }}
                        />
                        <span>
                          <strong>{option.title}</strong>
                          <small>{option.detail}</small>
                        </span>
                        <span>{option.price}</span>
                      </label>
                    ))}
                  </fieldset>
                  <div
                    className={s.addressFields}
                    hidden={delivery === "pickup"}
                  >
                    <Field
                      label="Street address"
                      name="address"
                      required={delivery !== "pickup"}
                      value={user?.address}
                      placeholder="Street, building, apartment"
                    />
                    <div className={s.fieldGrid}>
                      <Field
                        label="City"
                        name="city"
                        required={delivery !== "pickup"}
                        value={user?.city}
                        placeholder="Jakarta"
                        maxLength={100}
                      />
                      <Field
                        label="Postal code"
                        name="postalCode"
                        required={delivery !== "pickup"}
                        value={user?.postalCode}
                        pattern="[0-9]{5}"
                        placeholder="12345"
                        maxLength={5}
                      />
                    </div>
                  </div>
                  {delivery === "pickup" && (
                    <p className={s.softNote}>
                      Pickup orders are saved with your contact details. No
                      shipping address is needed.
                    </p>
                  )}
                  <label className={s.field}>
                    Order note <span>Optional</span>
                    <textarea
                      name="note"
                      rows={3}
                      maxLength={300}
                      placeholder="Anything you’d like us to know?"
                    />
                  </label>
                </section>
                <section className={s.formCard}>
                  <div className={s.sectionTitle}>
                    <h2>
                      <span>03</span>Payment
                    </h2>
                  </div>
                  <div className={s.paymentOption}>
                    <Icon name="check" />
                    <div>
                      <strong>Pay on delivery</strong>
                      <p>No card details needed. Your order is saved now.</p>
                    </div>
                  </div>
                  <p className={s.hint}>
                    This is a sample store. Checkout saves a real order record;
                    no money is collected and no goods are shipped.
                  </p>
                </section>
              </form>
              <Link className={s.backLink} href="/demo/cart">
                ← Back to your bag
              </Link>
            </div>
            <OrderSummary items>
              <button
                type="submit"
                form="checkout-form"
                className={s.primaryButton}
                disabled={busy}
                data-testid="place-order"
              >
                {busy ? "Saving…" : "Place order"}
                <Icon name="arrow" size={18} />
              </button>
              <p className={s.hintCenter}>
                Your order will appear in your order history.
              </p>
            </OrderSummary>
          </div>
        </>
      )}
    </>
  );
}

function receipt(order: Order) {
  const body = [
    "FORM & FIELD",
    `Order ${order.id}`,
    `Placed ${new Date(order.createdAt).toISOString()}`,
    `Status: ${order.status}`,
    "",
    ...order.items.map(
      (item) =>
        `${item.name} / ${item.color} × ${item.quantity} — ${money(item.price * item.quantity)}`,
    ),
    "",
    `Subtotal: ${money(order.subtotal)}`,
    `Discount: -${money(order.discount)}`,
    `Delivery: ${money(order.shipping)}`,
    `Total: ${money(order.total)}`,
    "Payment method: pay on delivery",
    "Sample store order. No payment has been collected.",
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([body], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.id}-receipt.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OrderView({ id }: { id: string }) {
  const { state, act, busy } = useStore();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const order = state.orders.find((item) => item.id === id);
  if (!order)
    return (
      <>
        <PageHeading
          eyebrow="YOUR ORDERS"
          title="We couldn’t find that order."
        />
        <EmptyState
          icon="box"
          title="It may belong to another account."
          link="/demo/login"
          action="Sign in"
        >
          Use the account or browser that placed the order to see its details.
        </EmptyState>
      </>
    );
  return (
    <>
      <div className={s.orderSuccess}>
        <span className={s.emptyIcon}>
          <Icon
            name={order.status === "cancelled" ? "close" : "check"}
            size={28}
          />
        </span>
        <p className={s.eyebrow}>{order.id}</p>
        <h1>
          {order.status === "cancelled"
            ? "Your order is cancelled."
            : "A little joy, on its way."}
        </h1>
        <p>
          {order.status === "cancelled"
            ? "The items are back in stock. You’re welcome to find something else."
            : `Thanks, ${order.customer.name.split(" ")[0]}. Your order has been saved.`}
        </p>
        <span className={s.statusBadge} data-testid="order-status">
          {order.status === "cancelled" ? "Cancelled" : "Confirmed"}
        </span>
      </div>
      <div className={s.orderLayout}>
        <section className={s.formCard} data-testid="order-confirmation">
          <div className={s.sectionTitle}>
            <h2>Order details</h2>
            <span>
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {order.items.map((line) => {
            const product = state.products.find(
              (p) => p.id === line.productId,
            )!;
            return (
              <div
                className={s.orderLine}
                key={`${line.productId}-${line.color}`}
              >
                <div className={s.miniArt}>
                  <ProductArt product={product} color={line.color} />
                </div>
                <div>
                  <Link href={`/demo/products/${line.slug}`}>{line.name}</Link>
                  <p>
                    {line.color} · Qty {line.quantity}
                  </p>
                </div>
                <strong>{money(line.price * line.quantity)}</strong>
              </div>
            );
          })}
          <dl className={s.totals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>− {money(order.discount)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.shipping ? money(order.shipping) : "Free"}</dd>
            </div>
            <div className={s.receiptTotal}>
              <dt>Total</dt>
              <dd data-testid="receipt-total">{money(order.total)}</dd>
            </div>
          </dl>
          <button className={s.secondaryButton} onClick={() => receipt(order)}>
            <Icon name="download" size={17} />
            Download receipt
          </button>
        </section>
        <div>
          <section className={s.formCard}>
            <h2>Delivery details</h2>
            <div className={s.addressBlock}>
              <strong>{order.customer.name}</strong>
              <p>{order.customer.email}</p>
              <p>{order.customer.phone}</p>
              {order.delivery !== "pickup" && (
                <>
                  <p>{order.customer.address}</p>
                  <p>
                    {order.customer.city}, {order.customer.postalCode}
                  </p>
                </>
              )}
              <span>
                {order.delivery === "pickup"
                  ? "Studio pickup"
                  : order.delivery === "express"
                    ? "Express delivery"
                    : "Standard delivery"}
              </span>
            </div>
            {order.customer.note && (
              <p className={s.hint}>Note: {order.customer.note}</p>
            )}
            <p className={s.hint}>
              Sample store: nothing will be charged, shipped, or emailed.
            </p>
          </section>
          {order.status === "confirmed" && (
            <section className={s.formCard}>
              <h2>A change of plans?</h2>
              {confirmCancel ? (
                <div className={s.cancelConfirm}>
                  <p>Cancel this order and return its items to stock?</p>
                  <div>
                    <button
                      className={s.dangerButton}
                      disabled={busy}
                      onClick={async () => {
                        const result = await act(
                          { action: "cancel", orderId: order.id },
                          "Your order has been cancelled.",
                        );
                        if (result) setConfirmCancel(false);
                      }}
                    >
                      Yes, cancel order
                    </button>
                    <button
                      className={s.textButton}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Keep order
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={s.hint}>
                    You can cancel your order while it is confirmed.
                  </p>
                  <button
                    className={s.textButton}
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel order
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </div>
      <div className={s.centerActions}>
        <Link href="/demo/shop" className={s.primaryButton}>
          Keep exploring
          <Icon name="arrow" size={17} />
        </Link>
        <Link href="/demo/orders" className={s.textButton}>
          View all orders
        </Link>
      </div>
    </>
  );
}
