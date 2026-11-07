"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categories, money } from "./_lib/catalog";
import { Icon, ProductArt } from "./art";
import { useStore } from "./store-context";
import { EmptyState, PageHeading, ProductCard, Quantity } from "./components";
import s from "./demo.module.css";

export type ShopQuery = { q: string; category: string; sort: string };

export function HomeView() {
  const { state } = useStore();
  return (
    <>
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>THE ART OF EVERYDAY</p>
          <h1>
            Good things.
            <br />
            For slower days.
          </h1>
          <p>
            Thoughtful stationery and everyday objects.
            <br />A little less noise. A little more meaning.
          </p>
          <Link href="/demo/shop" className={s.primaryButton}>
            Find your everyday
            <Icon name="arrow" size={18} />
          </Link>
          <span className={s.heroFootnote}>
            Made to be used. Made to be kept.
          </span>
        </div>
        <div className={s.heroArt}>
          <span className={s.heroSeal}>
            LESS, BUT
            <br />
            <strong>better.</strong>
            <span>FORM & FIELD</span>
          </span>
          <div className={s.heroNotebook}>
            <ProductArt product={state.products[0]} />
          </div>
          <div className={s.heroPen}>
            <ProductArt product={state.products[1]} />
          </div>
          <span className={s.heroCaption}>
            A fresh page is a good place to start.
          </span>
          <span className={s.heroEdition}>COLLECTION Nº 01</span>
        </div>
      </section>
      <div className={s.valueStrip}>
        <span>
          <Icon name="leaf" size={18} />
          Considered materials
        </span>
        <span>
          <Icon name="box" size={18} />
          Free standard delivery
        </span>
        <span>
          <Icon name="heart" size={18} />
          Useful. Beautiful. Everyday.
        </span>
      </div>
      <section className={s.homeSection}>
        <div className={s.sectionHeader}>
          <div>
            <p className={s.eyebrow}>THE ONES YOU’LL REACH FOR</p>
            <h2>Everyday favorites.</h2>
          </div>
          <Link href="/demo/shop">
            Shop all objects
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className={s.productGrid}>
          {[
            state.products[0],
            state.products[1],
            state.products[4],
            state.products[3],
          ].map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section
        className={s.collectionSection}
        aria-labelledby="collections-title"
      >
        <div className={s.sectionHeader}>
          <div>
            <p className={s.eyebrow}>A PLACE FOR EVERYTHING</p>
            <h2 id="collections-title">Find your kind of everyday.</h2>
          </div>
        </div>
        <div className={s.collectionGrid}>
          {[
            {
              name: "Paper",
              title: "Room to think.",
              detail: "Notebooks & planners",
              product: state.products[2],
            },
            {
              name: "Desk",
              title: "Make space.",
              detail: "Objects for your corner",
              product: state.products[5],
            },
            {
              name: "Everyday carry",
              title: "Take it with you.",
              detail: "Good company, wherever",
              product: state.products[7],
            },
          ].map((collection) => (
            <Link
              key={collection.name}
              href={`/demo/shop?category=${encodeURIComponent(collection.name)}`}
              className={s.collectionCard}
            >
              <ProductArt product={collection.product} />
              <div>
                <span>{collection.detail}</span>
                <h3>{collection.title}</h3>
                <Icon name="arrow" size={21} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className={s.storyBand}>
        <span className={s.storyAsterisk} aria-hidden="true">
          ✳
        </span>
        <div>
          <p className={s.eyebrow}>OUR POINT OF VIEW</p>
          <h2>
            Not more things.
            <br />
            More meaning in the things we keep.
          </h2>
          <p>
            We believe the objects you use every day deserve a little thought.
            Honest materials. Quiet details. Things that feel just right.
          </p>
          <Link href="/demo/about">
            A little about us
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <span className={s.storySide}>
          THOUGHTFULLY MADE
          <br />
          SINCE DAY ONE
        </span>
      </section>
    </>
  );
}

export function ShopView({ query }: { query: ShopQuery }) {
  const { state } = useStore();
  const router = useRouter();
  const category = categories.includes(query.category) ? query.category : "All";
  let products = state.products.filter(
    (product) =>
      (category === "All" || product.category === category) &&
      `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(query.q.toLowerCase()),
  );
  if (query.sort === "price-low")
    products = [...products].sort((a, b) => a.price - b.price);
  if (query.sort === "price-high")
    products = [...products].sort((a, b) => b.price - a.price);
  if (query.sort === "name")
    products = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const filterUrl = (nextCategory: string, sort = query.sort) =>
    `/demo/shop?${new URLSearchParams({ q: query.q, category: nextCategory, sort })}`;
  return (
    <>
      <PageHeading
        eyebrow="THE COLLECTION"
        title={
          query.q
            ? `A little search for “${query.q}”.`
            : "Everyday, thoughtfully made."
        }
      >
        {query.q
          ? "Find something that feels like you."
          : "Good materials. Useful details. Objects that earn their place."}
      </PageHeading>
      <div className={s.shopToolbar}>
        <nav className={s.categoryTabs} aria-label="Product categories">
          {categories.map((name) => (
            <Link
              key={name}
              href={filterUrl(name)}
              aria-current={category === name ? "page" : undefined}
            >
              {name}
            </Link>
          ))}
        </nav>
        <label className={s.sortLabel}>
          Sort by
          <select
            value={query.sort}
            onChange={(event) =>
              router.push(filterUrl(category, event.target.value))
            }
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </label>
      </div>
      <div className={s.resultsBar}>
        <span data-testid="results-count">
          {products.length} {products.length === 1 ? "object" : "objects"}
        </span>
        {(query.q || category !== "All") && (
          <Link href="/demo/shop">Clear filters</Link>
        )}
        <form action="/demo/shop" className={s.catalogSearch}>
          <input
            type="search"
            name="q"
            aria-label="Search the collection"
            placeholder="Find your next favorite…"
            defaultValue={query.q}
            key={query.q}
          />
          <input type="hidden" name="category" value={category} />
          <button aria-label="Search products">
            <Icon name="search" size={17} />
          </button>
        </form>
      </div>
      {products.length ? (
        <div className={s.productGrid}>
          <h2 className={s.srOnly}>Products</h2>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here just yet." action="See all objects">
          Try a different word or clear your filters. A good find could be one
          search away.
        </EmptyState>
      )}
    </>
  );
}

export function ProductView({ slug }: { slug: string }) {
  const { state, act, busy } = useStore();
  const product = state.products.find((item) => item.slug === slug)!;
  const [selected, setSelected] = useState(product.colors[0].name);
  const [quantity, setQuantity] = useState(1);
  const color = product.colors.some((c) => c.name === selected)
    ? selected
    : product.colors[0].name;
  const saved = state.saved.includes(product.id);
  return (
    <>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link href="/demo/shop">The collection</Link>
        <span>/</span>
        <Link
          href={`/demo/shop?category=${encodeURIComponent(product.category)}`}
        >
          {product.category}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <section className={s.productDetail}>
        <div className={s.detailArt}>
          <ProductArt product={product} color={color} />
          <span>THOUGHTFULLY MADE. EVERY DAY.</span>
        </div>
        <div className={s.detailCopy}>
          <p className={s.eyebrow}>{product.category.toUpperCase()}</p>
          <h1>{product.name}</h1>
          <p className={s.tagline}>{product.tagline}</p>
          <p className={s.detailPrice}>{money(product.price)}</p>
          <p className={s.description}>{product.description}</p>
          <fieldset className={s.colorOptions}>
            <legend>
              Color — <strong>{color}</strong>
            </legend>
            {product.colors.map((option) => (
              <label
                key={option.name}
                style={{ background: option.hex }}
                title={option.name}
              >
                <input
                  type="radio"
                  name="color"
                  value={option.name}
                  checked={color === option.name}
                  onChange={() => setSelected(option.name)}
                  aria-label={option.name}
                />
                <span>
                  {color === option.name && <Icon name="check" size={16} />}
                </span>
              </label>
            ))}
          </fieldset>
          <p className={s.stock}>
            {product.stock
              ? `${product.stock} available · Ready for your everyday`
              : "Currently out of stock"}
          </p>
          <div className={s.addRow}>
            <Quantity
              label={product.name}
              value={quantity}
              onChange={setQuantity}
              max={product.stock}
            />
            <button
              className={s.primaryButton}
              disabled={busy || !product.stock}
              data-testid="add-to-bag"
              onClick={() =>
                void act(
                  { action: "add", productId: product.id, color, quantity },
                  `${product.name} added to your bag.`,
                )
              }
            >
              {product.stock ? "Add to bag" : "Back soon"}
              <Icon name="bag" size={18} />
            </button>
            <button
              className={`${s.outlineIcon} ${saved ? s.isSaved : ""}`}
              aria-pressed={saved}
              aria-label={`${saved ? "Unsave" : "Save"} ${product.name}`}
              disabled={busy}
              onClick={() =>
                void act({ action: "saved", productId: product.id })
              }
            >
              <Icon name="heart" />
            </button>
          </div>
          <details className={s.disclosure} open>
            <summary>The details</summary>
            <ul>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </details>
          <details className={s.disclosure}>
            <summary>Delivery & returns</summary>
            <p>
              Choose free standard delivery, express delivery for Rp 25.000, or
              free studio pickup at checkout. This sample storefront records
              orders but does not ship physical goods.
            </p>
            <Link href="/demo/help">Read our FAQs</Link>
          </details>
        </div>
      </section>
      <section className={s.homeSection}>
        <div className={s.sectionHeader}>
          <div>
            <p className={s.eyebrow}>GOOD COMPANY</p>
            <h2>A few things that go together.</h2>
          </div>
        </div>
        <div className={s.productGrid}>
          {state.products
            .filter((item) => item.id !== product.id && item.stock > 0)
            .slice(0, 4)
            .map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
        </div>
      </section>
    </>
  );
}

export function SavedView() {
  const { state } = useStore();
  return (
    <>
      <PageHeading
        eyebrow="KEEP A LITTLE SOMETHING"
        title="Your favorites, all together."
      >
        The things that caught your eye. Ready when you are.
      </PageHeading>
      {state.saved.length ? (
        <div className={s.productGrid}>
          <h2 className={s.srOnly}>Saved products</h2>
          {state.products
            .filter((product) => state.saved.includes(product.id))
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
      ) : (
        <EmptyState icon="heart" title="Something will catch your eye.">
          Tap the heart on any product to keep it here for later.
        </EmptyState>
      )}
    </>
  );
}
