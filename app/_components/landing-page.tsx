"use client";

import Link from "next/link";
import { useEffect } from "react";

// ─── Brand mark ───────────────────────────────────────────────────────────────
function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="m16.1325 4.33451-2.5233-1.40664c-.4721-.26314-1.0678-.1036-1.3452.36025-.5301.88653-.995 1.16623-1.5715 1.51306l-.0109.00653c-.68512.41222-1.48439.89668-2.26786 2.20693-.78556 1.31373-.82234 2.23251-.84978 3.01976l-.00064.0183c-.02242.6445-.04051 1.1644-.56688 2.0447-.53011.8866-.99504 1.1663-1.57156 1.5131l-.01086.0065c-.68515.4122-1.48441.8967-2.26789 2.207-.13881.2321-.17767.5106-.10769.7719.06998.2612.24281.483.47907.6147l2.62175 1.4615c.14127-.4135.30621-.7369.42823-.941.78347-1.3102 1.58276-1.7947 2.26791-2.2069l.01085-.0066c.57652-.3468 1.04146-.6265 1.57155-1.513.5264-.8803.5445-1.4003.5669-2.0448l.0006-.0183c.0275-.7872.0643-1.706.8498-3.01973.7835-1.31024 1.5828-1.79471 2.2679-2.20692l.0109-.00653c.5738-.34523 1.0371-.62397 1.5642-1.50087.1235-.22119.2956-.5451.4544-.87294ZM7.93136 19.6711l2.42894 1.354c.4721.2632 1.0678.1037 1.3452-.3602.5301-.8865.995-1.1662 1.5715-1.513l.0109-.0066c.6852-.4122 1.4844-.8967 2.2679-2.2069.7855-1.3137.8223-2.2325.8498-3.0198l.0006-.0183c.0224-.6444.0405-1.1644.5669-2.0447.5301-.8865.995-1.1662 1.5715-1.5131l.0109-.0065c.6852-.41221 1.4844-.89667 2.2679-2.20692.1388-.23214.1777-.51061.1077-.77188-.07-.26128-.2428-.48306-.479-.61477L17.882 5.30974c-.1678.34035-.34.6625-.4657.88717-.0047.00832-.0095.01658-.0143.02476-.7835 1.31025-1.5828 1.79471-2.2679 2.20693l-.0109.00653c-.5765.34683-1.0415.62653-1.5716 1.51306-.5263.88031-.5444 1.40031-.5668 2.04471l-.0007.0183c-.0274.7873-.0642 1.7061-.8498 3.0198-.7834 1.3102-1.5827 1.7947-2.26785 2.2069l-.01085.0065c-.57651.3469-1.04144.6266-1.57154 1.5131-.10167.17-.25746.4945-.3527.9136Z"
      />
    </svg>
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
const REVEAL_TRANSITION =
  "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");

    // Hide elements via JS only (so SSR renders them fully visible)
    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = REVEAL_TRANSITION;
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.delay ?? "0", 10);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -32px 0px" }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// ─── Pill label ───────────────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--toolbar)] px-3 text-[11.5px] font-medium tracking-[-0.01em] text-[var(--muted)] backdrop-blur-sm">
      {children}
    </span>
  );
}

// ─── Hero planner preview ─────────────────────────────────────────────────────
function HeroPlannerPreview() {
  const days = [
    {
      day: "Mon",
      date: "16",
      tasks: [
        { title: "API auth review", tone: "bg-[#dfe1e6]" },
        { title: "Refactor drag state", tone: "bg-[#ffe380]" },
      ],
    },
    {
      day: "Tue",
      date: "17",
      tasks: [
        { title: "Sprint planning sync", tone: "bg-[#57d9a3]" },
        { title: "PR review", tone: "bg-[#dfe1e6]" },
      ],
    },
    {
      day: "Wed",
      date: "18",
      tasks: [{ title: "Deep work block", tone: "bg-[#ffe380]" }],
    },
    {
      day: "Thu",
      date: "19",
      tasks: [{ title: "Ship onboarding fix", tone: "bg-[#57d9a3]" }],
    },
    {
      day: "Fri",
      date: "20",
      tasks: [{ title: "Week review", tone: "bg-[#dfe1e6]" }],
    },
  ];

  return (
    <div className="overflow-hidden">
      <div className="glass-toolbar flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-[var(--text)]">
            March 16–20
          </span>
          <span className="text-[12px] text-[var(--muted)]">This week</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="control-surface inline-flex h-6 items-center rounded-sm px-2.5 text-[11px] text-[var(--muted)]">
            12 tasks
          </span>
          <span className="inline-flex h-6 items-center rounded-sm bg-[var(--accent)] px-2.5 text-[11px] font-medium !text-white">
            8 done
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 p-3">
        {days.map((col) => (
          <div
            key={col.day}
            className="control-surface min-h-[160px] rounded-sm p-2.5"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-[var(--text)]">
                {col.day}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {col.date}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {col.tasks.map((task) => (
                <div
                  key={task.title}
                  className="control-surface overflow-hidden rounded-sm"
                >
                  <div className="flex min-h-[40px]">
                    <div className={`w-1.5 shrink-0 ${task.tone}`} />
                    <div className="flex-1 px-2 py-1.5">
                      <p className="text-[10px] font-medium leading-tight text-[var(--text)]">
                        {task.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bento card ───────────────────────────────────────────────────────────────
function BentoCard({
  title,
  body,
  preview,
  className = "",
  delay = 0,
}: {
  title: string;
  body: string;
  preview: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <article
      data-reveal
      data-delay={delay}
      className={`landing-card-fade control-surface relative overflow-hidden rounded-sm ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgba(12,102,228,0.05)_0%,transparent_48%)]" />
      <div className="relative flex h-full flex-col p-5">
        <div className="relative mb-5 min-h-[160px] flex-1 overflow-hidden">
          {preview}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,var(--panel),transparent)]" />
        </div>
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--text)]">
            {title}
          </p>
          <p className="mt-1.5 max-w-[36ch] text-[12px] leading-[1.75] text-[var(--muted)]">
            {body}
          </p>
        </div>
      </div>
    </article>
  );
}

// ─── Testimonial card ─────────────────────────────────────────────────────────
function Testimonial({
  quote,
  name,
  role,
  delay = 0,
}: {
  quote: string;
  name: string;
  role: string;
  delay?: number;
}) {
  return (
    <article
      data-reveal
      data-delay={delay}
      className="control-surface rounded-sm p-6"
    >
      <p className="text-[13px] leading-[1.85] text-[var(--text)]">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--active)] text-[11px] font-semibold text-[var(--accent)]">
          {name[0]}
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[var(--text)]">{name}</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{role}</p>
        </div>
      </div>
    </article>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  useReveal();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--active)] text-[var(--accent)]">
              <BrandMark size={18} />
            </span>
            <span className="text-[13px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Weekframe
            </span>
          </Link>
          <Link
            href="/signin"
            className="inline-flex h-8 items-center justify-center rounded-sm bg-[var(--accent)] px-4 text-[12px] font-medium !text-white transition-colors duration-150 hover:bg-[var(--accent-strong)]"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-12 pt-28 text-center sm:px-6">
          <div data-reveal data-delay="0">
            <Pill>Weekly execution planning for software teams</Pill>
          </div>

          <h1
            data-reveal
            data-delay="80"
            className="mt-7 max-w-3xl text-[46px] font-semibold leading-[1.03] tracking-[-0.055em] text-[var(--text)] sm:text-[68px]"
          >
            Plan the week.
            <br />
            <span className="text-[var(--accent)]">Ship what matters.</span>
          </h1>

          <p
            data-reveal
            data-delay="160"
            className="mx-auto mt-6 max-w-[38ch] text-[15px] leading-[1.85] text-[var(--muted)] sm:text-[16px]"
          >
            Weekframe turns your backlog into a clear Monday‑to‑Friday
            commitment — so engineers know exactly what to build, and PMs know
            exactly what to expect.
          </p>

          <div
            data-reveal
            data-delay="220"
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/signin"
              className="inline-flex h-10 items-center justify-center rounded-sm bg-[var(--accent)] px-5 text-[13px] font-medium !text-white transition-colors duration-150 hover:bg-[var(--accent-strong)]"
            >
              Start planning free
            </Link>
            <a
              href="#product"
              className="control-surface inline-flex h-10 items-center justify-center rounded-sm px-5 text-[13px] font-medium text-[var(--text)] transition-colors duration-150 hover:bg-[var(--hover)]"
            >
              See how it works
            </a>
          </div>

          {/* Hero app preview */}
          <div
            data-reveal
            data-delay="320"
            className="relative mt-16 w-full max-w-5xl"
          >
            <div className="app-shell landing-card-fade overflow-hidden rounded-sm">
              <HeroPlannerPreview />
            </div>
            {/* Bleed gradient into next section */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--bg),transparent)]" />
          </div>
        </section>

        {/* ── 2. Bento ───────────────────────────────────────────────────────── */}
        <section id="product" className="px-4 py-28 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div data-reveal>
              <Pill>Why Weekframe</Pill>
            </div>
            <h2
              data-reveal
              data-delay="60"
              className="mt-5 max-w-2xl text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--text)] sm:text-[44px]"
            >
              Every workflow in
              <br />
              one frame.
            </h2>
            <p
              data-reveal
              data-delay="100"
              className="mt-4 max-w-[44ch] text-[15px] leading-[1.85] text-[var(--muted)]"
            >
              Assigned work comes in, engineers place it into the week, and
              progress stays visible — all in one calm, minimal interface.
            </p>

            {/* 5-card bento grid: 4+2 / 4+2 / 3+3 */}
            <div className="mt-12 grid gap-4 lg:grid-cols-6">
              {/* Card 1 — Full week view (large, spans 2 rows) */}
              <BentoCard
                className="lg:col-span-4 lg:row-span-2"
                delay={0}
                title="See the whole week at once"
                body="Shape a realistic plan before work starts. Drag tasks between days and rebalance the week in seconds."
                preview={
                  <div className="overflow-hidden rounded-sm">
                    <HeroPlannerPreview />
                  </div>
                }
              />

              {/* Card 2 — PM → Engineer flow */}
              <BentoCard
                className="lg:col-span-2"
                delay={60}
                title="Bridge PM and engineering"
                body="PMs assign work. Engineers turn it into an actual week they can commit to — not a vague backlog promise."
                preview={
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
                    <div className="control-surface rounded-sm p-3">
                      <p className="mb-2 text-[11px] font-semibold text-[var(--text)]">
                        PM queue
                      </p>
                      <div className="space-y-1.5">
                        <div className="h-7 rounded-sm bg-[var(--hover)]" />
                        <div className="h-7 rounded-sm bg-[var(--hover)]" />
                        <div className="h-7 rounded-sm bg-[var(--hover)]" />
                      </div>
                    </div>
                    <span className="text-[16px] text-[var(--accent)]">→</span>
                    <div className="control-surface rounded-sm p-3">
                      <p className="mb-2 text-[11px] font-semibold text-[var(--text)]">
                        Your week
                      </p>
                      <div className="space-y-1.5">
                        <div className="h-7 rounded-sm bg-[var(--active)]" />
                        <div className="h-7 rounded-sm bg-[var(--hover)]" />
                        <div className="h-7 rounded-sm bg-[var(--active)]" />
                      </div>
                    </div>
                  </div>
                }
              />

              {/* Card 3 — Drag & drop */}
              <BentoCard
                className="lg:col-span-2"
                delay={120}
                title="Drag work into days"
                body="The planner feels direct. Drop tasks where they belong and watch the week reshape instantly."
                preview={
                  <div className="space-y-2 py-2">
                    <div className="control-surface flex overflow-hidden rounded-sm">
                      <div className="w-1.5 shrink-0 bg-[#ffe380]" />
                      <div className="flex flex-1 items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-[11px] font-medium text-[var(--text)]">
                            Refactor auth layer
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                            Wednesday
                          </p>
                        </div>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="text-[var(--muted)]"
                        >
                          <circle cx="9" cy="6" r="2" fill="currentColor" />
                          <circle cx="15" cy="6" r="2" fill="currentColor" />
                          <circle cx="9" cy="12" r="2" fill="currentColor" />
                          <circle cx="15" cy="12" r="2" fill="currentColor" />
                          <circle cx="9" cy="18" r="2" fill="currentColor" />
                          <circle cx="15" cy="18" r="2" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex h-11 items-center justify-center overflow-hidden rounded-sm border border-dashed border-[var(--accent-soft)] bg-[var(--active)]">
                      <span className="text-[11px] text-[var(--accent)]">
                        Drop here → Thursday
                      </span>
                    </div>
                    <div className="control-surface flex overflow-hidden rounded-sm">
                      <div className="w-1.5 shrink-0 bg-[#57d9a3]" />
                      <div className="px-3 py-2">
                        <p className="text-[11px] font-medium text-[var(--text)]">
                          Ship onboarding fix
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                          Thursday
                        </p>
                      </div>
                    </div>
                  </div>
                }
              />

              {/* Card 4 — Status tracking */}
              <BentoCard
                className="lg:col-span-3"
                delay={60}
                title="Track status at a glance"
                body="Open, in-progress, or done — visible straight from the weekly view without ever opening a task."
                preview={
                  <div className="space-y-2 py-2">
                    {[
                      {
                        label: "API auth review",
                        tone: "bg-[#dfe1e6]",
                        status: "Todo",
                      },
                      {
                        label: "Refactor drag state",
                        tone: "bg-[#ffe380]",
                        status: "In progress",
                      },
                      {
                        label: "Sprint planning sync",
                        tone: "bg-[#57d9a3]",
                        status: "Done",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="control-surface flex overflow-hidden rounded-sm"
                      >
                        <div className={`w-1.5 shrink-0 ${item.tone}`} />
                        <div className="flex flex-1 items-center justify-between px-3 py-2">
                          <p className="text-[11px] font-medium text-[var(--text)]">
                            {item.label}
                          </p>
                          <span className="control-surface rounded-sm px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              />

              {/* Card 5 — Week review */}
              <BentoCard
                className="lg:col-span-3"
                delay={120}
                title="End the week with clarity"
                body="A quick summary of what was planned, shipped, and postponed — no dashboard noise, just the numbers."
                preview={
                  <div className="space-y-3 py-2">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--hover)]">
                      <div className="h-full w-[62%] rounded-full bg-[var(--accent)]" />
                    </div>
                    {[
                      { label: "Tasks added", value: 14, accent: false },
                      { label: "Done", value: 8, accent: true },
                      { label: "In progress", value: 3, accent: false },
                      { label: "Postponed", value: 3, accent: false },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="control-surface flex items-center justify-between rounded-sm px-3 py-2"
                      >
                        <span className="text-[11px] text-[var(--muted)]">
                          {row.label}
                        </span>
                        <span
                          className={`text-[12px] font-semibold ${row.accent ? "text-[var(--accent)]" : "text-[var(--text)]"}`}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                }
              />
            </div>
          </div>
        </section>

        {/* ── 3. Testimonials ────────────────────────────────────────────────── */}
        <section id="stories" className="px-4 py-28 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div data-reveal>
              <Pill>Team stories</Pill>
            </div>
            <h2
              data-reveal
              data-delay="60"
              className="mt-5 max-w-xl text-[30px] font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--text)] sm:text-[44px]"
            >
              Teams that plan,
              <br />
              ship.
            </h2>
            <p
              data-reveal
              data-delay="100"
              className="mt-4 max-w-[44ch] text-[15px] leading-[1.85] text-[var(--muted)]"
            >
              The clearest signal from this workflow: everyone knows what the
              week looks like before it gets messy.
            </p>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Testimonial
                delay={0}
                quote="I finally had one place to turn assigned work into an honest week instead of mentally juggling Jira and my calendar."
                name="Asha R."
                role="Frontend Engineer"
              />
              <Testimonial
                delay={80}
                quote="The best part was seeing what the engineer actually committed to for Tuesday and Thursday — not just what I had assigned."
                name="Daniel M."
                role="Product Manager"
              />
              <Testimonial
                delay={160}
                quote="Our weekly review stopped being vague. We could see what was planned, what slipped, and what actually got finished."
                name="Neel P."
                role="Engineering Lead"
              />
            </div>
          </div>
        </section>

        {/* ── 4. CTA ─────────────────────────────────────────────────────────── */}
        <section className="px-4 pb-32 pt-4 sm:px-6">
          <div data-reveal className="mx-auto w-full max-w-4xl py-20 text-center">
            <Pill>Ready to plan better?</Pill>
            <h2 className="mx-auto mt-6 max-w-2xl text-[32px] font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--text)] sm:text-[52px]">
              Ready to frame
              <br />
              your week?
            </h2>
            <p className="mx-auto mt-5 max-w-[38ch] text-[15px] leading-[1.85] text-[var(--muted)]">
              Start with the same calm planner your team will use every Monday.
              Drag work into days, keep commitments visible, and end every
              Friday with a cleaner review.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signin"
                className="inline-flex h-11 items-center justify-center rounded-sm bg-[var(--accent)] px-7 text-[13px] font-medium !text-white transition-colors duration-150 hover:bg-[var(--accent-strong)]"
              >
                Start planning free
              </Link>
              <a
                href="#product"
                className="control-surface inline-flex h-11 items-center justify-center rounded-sm px-7 text-[13px] font-medium text-[var(--text)] transition-colors duration-150 hover:bg-[var(--hover)]"
              >
                See the product
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--active)] text-[var(--accent)]">
              <BrandMark size={13} />
            </span>
            <span className="text-[12px] font-medium tracking-[-0.02em] text-[var(--muted)]">
              Weekframe
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">© 2025 Weekframe</p>
        </div>
      </footer>
    </div>
  );
}
