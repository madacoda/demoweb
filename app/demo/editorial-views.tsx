"use client";
import Link from "next/link";
import { catalog } from "./_lib/catalog";
import { Icon, ProductArt } from "./art";
import { PageHeading } from "./components";
import s from "./demo.module.css";

export function AboutView() {
  return (
    <>
      <PageHeading
        eyebrow="OUR POINT OF VIEW"
        title="Everyday deserves a little thought."
      >
        A small collection. A simple idea. Things you’ll want to keep.
      </PageHeading>
      <div className={s.aboutHero}>
        <div>
          <ProductArt product={catalog[2]} />
          <ProductArt product={catalog[4]} />
        </div>
        <blockquote>
          “The things we use every day have a quiet way of shaping how we feel.”
          <cite>THE FORM & FIELD PHILOSOPHY</cite>
        </blockquote>
      </div>
      <div className={s.aboutCopy}>
        <p className={s.eyebrow}>LESS, BUT BETTER</p>
        <h2>
          Good design starts
          <br />
          with a good reason.
        </h2>
        <div>
          <p>
            We started with the things closest to hand. A notebook that opens
            flat. A pen with just the right weight. A mug that makes you pause
            for a moment before the day begins.
          </p>
          <p>
            Form & Field is a collection of useful, considered objects for your
            desk, your bag, and the little rituals in between. Nothing loud.
            Nothing complicated. Just things that do their job beautifully.
          </p>
          <p>
            Our collection stays deliberately small. Every piece has a purpose,
            and every detail has a reason to be there.
          </p>
        </div>
      </div>
      <div className={s.principles}>
        {[
          {
            number: "01",
            title: "Useful first.",
            text: "An object earns its place by making an ordinary moment a little better.",
          },
          {
            number: "02",
            title: "Honest materials.",
            text: "Paper, cotton, wood, ceramic. Familiar materials with a character of their own.",
          },
          {
            number: "03",
            title: "Room to breathe.",
            text: "A quieter palette. A simpler shape. Space for the things that matter to you.",
          },
        ].map((item) => (
          <div key={item.number}>
            <span>{item.number}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className={s.editorialCta}>
        <h2>Find something for your everyday.</h2>
        <Link className={s.primaryButton} href="/demo/shop">
          Explore the collection
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </>
  );
}

const faqGroups = [
  {
    id: "ordering",
    title: "Orders & accounts",
    questions: [
      [
        "Do I need an account to place an order?",
        "No. You can checkout as a guest. Your orders stay available in this browser. Create an account or sign in to bring your guest orders, favorites, and bag into your account.",
      ],
      [
        "Can I change or cancel my order?",
        "Before checkout, edit quantities, colors, and delivery options in your bag. After placing an order, open its details from Your orders and select Cancel order. Confirmed orders can be cancelled; their items return to stock.",
      ],
      [
        "How do discount codes work?",
        "Enter SAVE10 in your bag or at checkout for 10% off your item subtotal. Apply it once per order. Delivery fees are not discounted, and repeating the code does not stack discounts.",
      ],
      [
        "Where is my receipt?",
        "Open any order from Your orders and choose Download receipt. The receipt shows the items, discounts, delivery charge, and total saved when you placed that order.",
      ],
    ],
  },
  {
    id: "delivery",
    title: "Delivery & payment",
    questions: [
      [
        "What delivery options can I choose?",
        "Standard delivery is free, express delivery adds Rp 25.000, and studio pickup is free. Your selection and its price are saved with your order.",
      ],
      [
        "How do I pay?",
        "Checkout uses pay on delivery and does not ask for card details. This is a sample storefront: orders are saved, but no money is collected and no physical goods are shipped.",
      ],
      [
        "Can I order an out-of-stock item?",
        "Out-of-stock products cannot be added to your bag. Availability is checked again when you place an order. You can save the product to your favorites for later.",
      ],
    ],
  },
  {
    id: "privacy",
    title: "Your details",
    questions: [
      [
        "What information does this store save?",
        "The store saves your account details, bag, favorites, orders, and contact messages. A session cookie keeps your browser connected to your guest or signed-in account. Use sample information while exploring this demonstration store.",
      ],
      [
        "What happens when I sign out?",
        "Your account's orders, favorites, and bag remain saved. Signing out starts a separate guest session, so another person using the browser cannot see your account's information.",
      ],
      [
        "Will I receive emails?",
        "No. Registration, order placement, and contact forms save records in the store without sending email. Contact messages appear in your account.",
      ],
    ],
  },
];

export function HelpView() {
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CLARITY"
        title="Good questions. Simple answers."
      >
        Everything you need for a more considered checkout.
      </PageHeading>
      <div className={s.helpLayout}>
        <nav aria-label="Help topics">
          {faqGroups.map((group) => (
            <a key={group.id} href={`#${group.id}`}>
              {group.title}
              <Icon name="arrow" size={16} />
            </a>
          ))}
          <Link href="/demo/contact">
            Something else?
            <Icon name="arrow" size={16} />
          </Link>
        </nav>
        <div>
          {faqGroups.map((group) => (
            <section id={group.id} className={s.faqGroup} key={group.id}>
              <h2>{group.title}</h2>
              {group.questions.map(([question, answer]) => (
                <details key={question} className={s.disclosure}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
      </div>
      <div className={s.editorialCta}>
        <h2>Still something on your mind?</h2>
        <Link className={s.primaryButton} href="/demo/contact">
          Get in touch
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </>
  );
}
