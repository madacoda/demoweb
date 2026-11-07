"use client";

import Link from "next/link";
import { useState } from "react";
import { StoreProvider, useStore } from "./store-context";
import { Icon } from "./art";
import {
  HomeView,
  ProductView,
  SavedView,
  ShopView,
  type ShopQuery,
} from "./shop-views";
import { CartView, CheckoutView, OrderView } from "./checkout-views";
import {
  AccountView,
  AuthView,
  ContactView,
  OrdersView,
} from "./account-views";
import { AboutView, HelpView } from "./editorial-views";
import s from "./demo.module.css";

export type StoreView =
  | "home"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "saved"
  | "account"
  | "login"
  | "register"
  | "orders"
  | "order"
  | "about"
  | "help"
  | "contact";
type Props = {
  view: StoreView;
  slug?: string;
  query?: ShopQuery;
  scenario?: "broken" | "fixed";
};

export function Storefront(props: Props) {
  return (
    <StoreProvider key={props.scenario || "store"} scenario={props.scenario}>
      <StoreShell {...props} />
    </StoreProvider>
  );
}

function StoreShell({
  view,
  slug,
  query = { q: "", category: "All", sort: "featured" },
}: Props) {
  const { state, loading, notice, error, clearError } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const needsState = !["home", "shop", "product", "about", "help"].includes(
    view,
  );
  return (
    <div className={s.store}>
      <a className={s.skipLink} href="#main">
        Skip to content
      </a>
      <div
        className={s.announcement}
        role="region"
        aria-label="Store announcement"
      >
        A little welcome gift. <strong>SAVE10</strong> takes 10% off your good
        finds.<span>FREE STANDARD DELIVERY</span>
      </div>
      <div className={s.container}>
        <header className={s.header}>
          <Link
            href="/demo"
            className={s.wordmark}
            aria-label="form & field home"
          >
            <span aria-hidden="true">✳</span>form &amp; field
            <sup aria-hidden="true">®</sup>
          </Link>
          <nav className={s.mainNav} aria-label="Main navigation">
            <Link
              href="/demo/shop"
              aria-current={
                ["shop", "product"].includes(view) ? "page" : undefined
              }
            >
              The collection
            </Link>
            <Link
              href="/demo/about"
              aria-current={view === "about" ? "page" : undefined}
            >
              Our story
            </Link>
            <Link
              href="/demo/help"
              aria-current={view === "help" ? "page" : undefined}
            >
              A little help
            </Link>
          </nav>
          <div className={s.headerActions}>
            <button
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Icon name="search" size={19} />
            </button>
            <Link
              href="/demo/saved"
              aria-label={`Saved favorites (${state.saved.length})`}
            >
              <Icon name="heart" size={19} />
            </Link>
            <Link
              href="/demo/account"
              aria-label={state.user ? "Your account" : "Account and sign in"}
            >
              <Icon name="user" size={19} />
            </Link>
            <Link className={s.bagLink} href="/demo/cart">
              <Icon name="bag" size={19} />
              <span className={s.srOnly}>Your bag </span>
              <span data-testid="bag-count">{count}</span>
            </Link>
          </div>
        </header>
        {searchOpen && (
          <form className={s.headerSearch} action="/demo/shop">
            <Icon name="search" />
            <input
              name="q"
              type="search"
              aria-label="Search products"
              placeholder="A notebook, a mug, a little something…"
              autoFocus
            />
            <button className={s.secondaryButton}>
              Search
              <Icon name="arrow" size={16} />
            </button>
          </form>
        )}
        {error && (
          <div className={s.errorBanner} role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={clearError}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className={s.toast} role="status">
            <Icon name="check" size={16} />
            <span>{notice}</span>
            <Link href="/demo/cart">View bag</Link>
          </div>
        )}
        <main id="main" className={s.main}>
          {loading && needsState ? (
            <div className={s.loading} role="status">
              <span className={s.loadingMark} aria-hidden="true">
                ✳
              </span>
              Getting things ready…
            </div>
          ) : (
            <>
              {view === "home" && <HomeView />}
              {view === "shop" && <ShopView query={query} />}
              {view === "product" && <ProductView slug={slug!} key={slug} />}
              {view === "saved" && <SavedView />}
              {view === "cart" && <CartView />}
              {view === "checkout" && <CheckoutView />}
              {view === "order" && <OrderView id={slug!} />}
              {view === "orders" && <OrdersView />}
              {view === "account" && <AccountView />}
              {view === "login" && <AuthView key="login" />}
              {view === "register" && <AuthView key="register" register />}
              {view === "about" && <AboutView />}
              {view === "help" && <HelpView />}
              {view === "contact" && <ContactView />}
            </>
          )}
        </main>
        <footer className={s.footer}>
          <div className={s.footerTop}>
            <div>
              <Link href="/demo" className={s.footerBrand}>
                ✳ form &amp; field
              </Link>
              <p>
                Little things. Well considered.
                <br />
                For your desk, your bag, your everyday.
              </p>
            </div>
            <nav aria-label="Shop links">
              <h2>Find your everyday</h2>
              <Link href="/demo/shop">All objects</Link>
              <Link href="/demo/shop?category=Paper">Paper & planners</Link>
              <Link href="/demo/shop?category=Desk">For your desk</Link>
              <Link href="/demo/shop?category=Everyday%20carry">On the go</Link>
            </nav>
            <nav aria-label="Customer links">
              <h2>A little help</h2>
              <Link href="/demo/orders">Your orders</Link>
              <Link href="/demo/saved">Saved favorites</Link>
              <Link href="/demo/help#delivery">Delivery & payment</Link>
              <Link href="/demo/help#privacy">Your privacy</Link>
              <Link href="/demo/contact">Get in touch</Link>
            </nav>
            <div className={s.footerNote}>
              <span aria-hidden="true">✳</span>
              <p>
                Fewer things.
                <br />
                <strong>More meaning.</strong>
              </p>
              <Link href="/demo/about">
                Our story
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
          <div className={s.footerBottom}>
            <span>© 2026 Form & Field</span>
            <span>
              Sample storefront · Orders are saved; no real payments or
              shipping.
            </span>
            <Link href="/demo/sites">Explore all 7 websites ↗</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
