"use client";
import Link from "next/link";
import { sites } from "./_lib/data";
import { Action, DemoProvider, Feedback, Scene } from "./ui";
import s from "./sites.module.css";
export function Directory() {
  return (
    <DemoProvider>
      <div className={s.directory}>
        <header className={s.directoryHeader}>
          <Link href="/demo/sites">
            The Demo District<span>↗</span>
          </Link>
          <span>EIGHT PLACES TO EXPLORE</span>
        </header>
        <main>
          <div className={s.directoryHero}>
            <p className={s.eyebrow}>A small world of working websites</p>
            <h1>
              Different worlds.
              <br />
              <em>Real interactions.</em>
            </h1>
            <p>
              Book a getaway. Order lunch. Find your next role.
              <br />
              Eight independent websites, ready to put through their paces.
            </p>
            <div className={s.directoryStats}>
              <span>
                <strong>8</strong> websites
              </span>
              <span>
                <strong>74</strong> seeded records
              </span>
              <span>
                <strong>∞</strong> ways to explore
              </span>
            </div>
          </div>
          <p>
            <Link href="/lab">
              Open the test lab → HRIS roles, login, filters, approval conflicts
              & recovery
            </Link>
          </p>
          <div className={s.directoryGrid}>
            <Link className={s.directoryCard} href="/hris">
              <div className={s.directoryArt} style={{ background: "#dce5f4" }}>
                <span className={s.previewBrand}>
                  People<span>Time away, thoughtfully managed.</span>
                </span>
                <Scene kind="work" color="#afc5e6" />
              </div>
              <div className={s.directoryCardBody}>
                <p className={s.eyebrow}>HRIS · 6 accounts · 3 roles</p>
                <h2>
                  People <span>↗</span>
                </h2>
                <p>
                  Request leave, approve your team’s time away, and manage
                  balances with a complete activity history.
                </p>
                <small>Employee → manager approval → HR balances & audit</small>
              </div>
            </Link>
            <Link className={s.directoryCard} href="/demo">
              <div className={s.directoryArt} style={{ background: "#e7e0cd" }}>
                <span className={s.previewBrand}>
                  Form & Field<span>Objects for a slower everyday.</span>
                </span>
                <Scene kind="work" color="#c4c9a5" />
              </div>
              <div className={s.directoryCardBody}>
                <p className={s.eyebrow}>Shopping & lifestyle · 8 products</p>
                <h2>
                  Form & Field <span>↗</span>
                </h2>
                <p>
                  Browse thoughtful everyday goods, save favorites, create an
                  account, and place an order.
                </p>
                <small>Browse → cart → checkout → account & orders</small>
              </div>
            </Link>
            {sites.map((site, i) => (
              <Link
                href={`/demo/sites/${site.id}`}
                key={site.id}
                className={s.directoryCard}
              >
                <div className={`${s.directoryArt} ${s[site.id]}`}>
                  <span className={s.previewBrand}>
                    {site.name}
                    <span>{site.tagline}</span>
                  </span>
                  <Scene
                    kind={
                      site.id === "haven"
                        ? "stay"
                        : site.id === "thyme"
                          ? "food"
                          : site.id === "gather"
                            ? "event"
                            : "work"
                    }
                    color={
                      [
                        "#b4c7a6",
                        "#d9b576",
                        "#beb4db",
                        "#c4a5bd",
                        "#a8c1da",
                        "#a0c6bd",
                      ][i]
                    }
                    variant={i}
                  />
                </div>
                <div className={s.directoryCardBody}>
                  <p className={s.eyebrow}>
                    {site.category} · {site.count}
                  </p>
                  <h2>
                    {site.name} <span>↗</span>
                  </h2>
                  <p>{site.description}</p>
                  <small>{site.flow}</small>
                </div>
              </Link>
            ))}
          </div>
          <section className={s.directoryNotes}>
            <div>
              <h2>Room to try things.</h2>
              <p>
                Every site has working forms, search, saved state, and
                meaningful success and error states. The six new sites use a
                private sample workspace tied to this browser. Form & Field has
                its own accounts and storage.
              </p>
              <p>
                Payments, physical bookings, hiring, and staff responses are
                simulated. Submitted records are saved locally; no messages are
                sent to anyone.
              </p>
            </div>
            <div>
              <h3>A fresh start</h3>
              <p>
                Restore the six new sites to their original sample data. This
                clears your bookings, food orders, applications, and edits. The
                store and People HRIS are kept separately.
              </p>
              <Action
                input={{ action: "reset", confirm: "RESET" }}
                message="Your six sample workspaces have been reset."
                confirm="Reset all six new websites? Your bookings, orders, applications, tickets, and task edits will be cleared. Form & Field will stay unchanged."
              >
                Reset sample workspaces
              </Action>
              <Feedback />
            </div>
          </section>
        </main>
        <footer className={s.directoryFooter}>
          The Demo District{" "}
          <span>Built for exploring, learning, and testing.</span>
        </footer>
      </div>
    </DemoProvider>
  );
}
