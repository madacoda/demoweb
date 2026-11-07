"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { type Product, money } from "./_lib/catalog";
import { Icon, ProductArt } from "./art";
import { useStore } from "./store-context";
import s from "./demo.module.css";

export function ProductCard({ product }: { product: Product }) {
  const { state, act, busy } = useStore();
  const saved = state.saved.includes(product.id);
  return (
    <article className={s.productCard} data-testid={`product-${product.id}`}>
      <div className={s.productImage}>
        <ProductArt product={product} />
        <Link
          className={s.productImageLink}
          href={`/demo/products/${product.slug}`}
          aria-label={`View ${product.name}`}
        />
        {product.badge && (
          <span className={s.productBadge}>
            {product.stock ? product.badge : "Back soon"}
          </span>
        )}
        <button
          className={`${s.saveButton} ${saved ? s.isSaved : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${product.name}`}
          aria-pressed={saved}
          disabled={busy}
          onClick={() => void act({ action: "saved", productId: product.id })}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>
      <div className={s.productMeta}>
        <p>{product.category}</p>
        <h3>
          <Link href={`/demo/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className={s.productBottom}>
          <span>{money(product.price)}</span>
          <span
            className={s.swatches}
            role="img"
            aria-label={`${product.colors.length} color options`}
          >
            {product.colors.map((color) => (
              <span key={color.name} style={{ background: color.hex }} />
            ))}
          </span>
        </div>
      </div>
      <button
        className={s.quickAdd}
        disabled={busy || product.stock === 0}
        onClick={() =>
          void act(
            {
              action: "add",
              productId: product.id,
              color: product.colors[0].name,
              quantity: 1,
            },
            `${product.name} added to your bag.`,
          )
        }
      >
        {product.stock ? (
          <>
            Add to bag
            <Icon name="plus" size={14} />
          </>
        ) : (
          "Currently out of stock"
        )}
      </button>
    </article>
  );
}

export function Quantity({
  value,
  onChange,
  label,
  max = 10,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
}) {
  const { busy } = useStore();
  return (
    <div className={s.quantity} role="group" aria-label={`${label} quantity`}>
      <button
        type="button"
        disabled={busy || value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={`Decrease ${label} quantity`}
      >
        <Icon name="minus" size={13} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        disabled={busy || value >= Math.min(10, max)}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label} quantity`}
      >
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}

export function Coupon() {
  const { state, act, busy } = useStore();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <div className={s.couponArea}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!code.trim()) {
            setInvalid(true);
            return;
          }
          const result = await act({ action: "coupon", code });
          setInvalid(!result);
          if (result) setCode("SAVE10");
        }}
      >
        <label htmlFor="coupon">Have a discount code?</label>
        <div className={s.inputButton}>
          <input
            id="coupon"
            name="coupon"
            data-testid="coupon-input"
            placeholder="Enter your code"
            maxLength={40}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid}
            aria-describedby="coupon-hint"
            autoComplete="off"
          />
          <button type="submit" disabled={busy} data-testid="apply-coupon">
            Apply
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <p id="coupon-hint" className={invalid ? s.errorText : s.hint}>
          {invalid ? (
            "Enter a valid code. SAVE10 takes 10% off your items."
          ) : (
            <>
              A little welcome gift. Use <strong>SAVE10</strong> for 10% off.
            </>
          )}
        </p>
      </form>
      {state.coupon && (
        <div className={s.appliedCoupon}>
          <span data-testid="coupon-status">
            <Icon name="check" size={14} />
            SAVE10 applied
          </span>
          <button
            disabled={busy}
            onClick={() => {
              void act({ action: "coupon", code: "" });
              setCode("");
            }}
            aria-label="Remove SAVE10 coupon"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export function OrderSummary({
  children,
  items = false,
}: {
  children?: ReactNode;
  items?: boolean;
}) {
  const { state } = useStore();
  return (
    <aside className={s.summary} aria-label="Order summary">
      <h2>
        Your order
        <span>
          {state.cart.reduce((sum, line) => sum + line.quantity, 0)} items
        </span>
      </h2>
      {items && (
        <div className={s.summaryItems}>
          {state.cart.map((line) => {
            const product = state.products.find(
              (p) => p.id === line.productId,
            )!;
            return (
              <div key={`${line.productId}-${line.color}`}>
                <div className={s.miniArt}>
                  <ProductArt product={product} color={line.color} />
                </div>
                <p>
                  <strong>{product.name}</strong>
                  <small>
                    {line.color} · Qty {line.quantity}
                  </small>
                </p>
                <span>{money(product.price * line.quantity)}</span>
              </div>
            );
          })}
        </div>
      )}
      <Coupon />
      <dl className={s.totals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(state.subtotal)}</dd>
        </div>
        {state.coupon && (
          <div>
            <dt>
              Discount <span>SAVE10</span>
            </dt>
            <dd data-testid="discount-amount">− {money(state.discount)}</dd>
          </div>
        )}
        <div>
          <dt>
            {state.delivery === "pickup"
              ? "Studio pickup"
              : state.delivery === "express"
                ? "Express delivery"
                : "Standard delivery"}
          </dt>
          <dd>{state.shipping ? money(state.shipping) : "On the house"}</dd>
        </div>
      </dl>
      <div className={s.totalRow}>
        <div>
          <h3>Total</h3>
          <small>IDR · all taxes included</small>
        </div>
        <strong>
          <small>Rp </small>
          <span data-testid="order-total" aria-live="polite">
            {state.total}
          </span>
        </strong>
      </div>
      {children}
      <div className={s.promise}>
        <span aria-hidden="true">✳</span>
        <p>
          Fewer things.
          <br />
          <strong>More meaning.</strong>
        </p>
      </div>
    </aside>
  );
}

export function EmptyState({
  title,
  children,
  icon = "bag",
  link = "/demo/shop",
  action = "Explore the collection",
}: {
  title: string;
  children: ReactNode;
  icon?: "bag" | "heart" | "user" | "box";
  link?: string;
  action?: string;
}) {
  return (
    <div className={s.emptyState}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className={s.primaryButton} href={link}>
        {action}
        <Icon name="arrow" size={17} />
      </Link>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.pageHeading}>
      <p className={s.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className={s.subtitle}>{children}</p>}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = true,
  value,
  maxLength = 200,
  pattern,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <label className={s.field}>
      {label}
      {!required && <span>Optional</span>}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={value}
        maxLength={maxLength}
        pattern={
          pattern || (required && type === "text" ? ".*\\S.*" : undefined)
        }
        placeholder={placeholder}
        autoComplete={
          name === "password"
            ? "current-password"
            : name === "email"
              ? "email"
              : name === "name"
                ? "name"
                : undefined
        }
      />
    </label>
  );
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form)].map(([key, value]) => [key, String(value)]),
  );
}
