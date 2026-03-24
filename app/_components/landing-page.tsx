"use client";

import Link from "next/link";
import { useEffect } from "react";

const REVEAL_TRANSITION =
  "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)";

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

function useReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");

    els.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = REVEAL_TRANSITION;
    });

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target as HTMLElement;
          const delay = parseInt(el.dataset.delay ?? "0", 10);

          window.setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);

          obs.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
      {children}
    </p>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-8 border-t border-[var(--landing-line)]">
      {items.map((item, index) => (
        <li
          key={item}
          className="flex items-start gap-4 border-b border-[var(--landing-line)] py-4"
        >
          <span className="pt-0.5 text-[11px] font-semibold text-[var(--accent)]">
            0{index + 1}
          </span>
          <p className="max-w-[44ch] text-[15px] leading-[1.85] text-[var(--landing-muted)]">
            {item}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PlannerPreview() {
  const queue = [
    { title: "Refactor auth flow", meta: "Assigned by PM", tone: "bg-[#d8a300]" },
    { title: "Review rollout plan", meta: "Blocked by API copy", tone: "bg-[#0c66e4]" },
    { title: "Ship onboarding fix", meta: "Ready to close", tone: "bg-[#30b46c]" },
  ];

  const days = [
    {
      day: "Mon",
      date: "12",
      tasks: [
        { title: "Sprint setup", tone: "bg-[#0c66e4]" },
        { title: "Auth review", tone: "bg-[#d8a300]" },
      ],
    },
    {
      day: "Tue",
      date: "13",
      tasks: [{ title: "Refactor auth flow", tone: "bg-[#d8a300]" }],
    },
    {
      day: "Wed",
      date: "14",
      tasks: [
        { title: "Pair on rollout", tone: "bg-[#0c66e4]" },
        { title: "QA notes", tone: "bg-[#30b46c]" },
      ],
    },
    {
      day: "Thu",
      date: "15",
      tasks: [{ title: "Ship onboarding fix", tone: "bg-[#30b46c]" }],
    },
    {
      day: "Fri",
      date: "16",
      tasks: [{ title: "Week review", tone: "bg-[var(--border-strong)]" }],
    },
  ];

  const focusDay = days[0];
  const assignedPreview = queue.slice(0, 2);

  return (
    <div className="landing-frame overflow-hidden rounded-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-[var(--active)] text-[var(--accent)]">
            <BrandMark size={18} />
          </span>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Engineer Planner
            </p>
            <p className="text-[14px] font-semibold text-[var(--text)]">
              Weekframe
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[13px]">
          <span className="text-[var(--muted)]">May 12-16</span>
          <span className="font-semibold text-[var(--text)]">8/12 done</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[210px_minmax(0,1fr)] lg:p-5">
        <aside className="border-b border-[var(--border)] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Assigned
          </p>
          <div className="mt-4 space-y-2.5">
            {assignedPreview.map((task) => (
              <div
                key={task.title}
                className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel)]"
              >
                <div className="flex min-h-[54px]">
                  <div className={`w-1.5 shrink-0 ${task.tone}`} />
                  <div className="px-3 py-2.5">
                    <p className="text-[12px] font-medium text-[var(--text)]">
                      {task.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {task.meta}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 rounded-sm border border-[var(--border)] bg-[var(--pane)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[var(--text)]">
                {focusDay.day}
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                May {focusDay.date}
              </p>
            </div>
            <span className="inline-flex h-7 items-center rounded-sm border border-[var(--border)] px-2.5 text-[11px] font-medium text-[var(--muted)]">
              {focusDay.tasks.length} planned
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px]">
            <div className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--panel)]">
              <div className="border-b border-[var(--border)] px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-[var(--border)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Monday
                  </span>
                  <span className="rounded-sm border border-[var(--selected-border)] bg-[var(--active)] px-2 py-1 text-[10px] font-medium text-[var(--accent)]">
                    Focus lane
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-3">
                {focusDay.tasks.map((task) => (
                  <div
                    key={task.title}
                    className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--pane)]"
                  >
                    <div className="flex min-h-[50px]">
                      <div className={`w-1.5 shrink-0 ${task.tone}`} />
                      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-2.5">
                        <div>
                          <p className="text-[12px] font-medium text-[var(--text)]">
                            {task.title}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--muted)]">
                            Planned for Monday
                          </p>
                        </div>
                        <span className="rounded-sm border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)]">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              {[
                ["Status", "2 tasks"],
                ["Context", "Notes attached"],
                ["Shift", "Drag from queue"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-sm border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[12px] font-medium text-[var(--text)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewPreview() {
  const rows = [
    { label: "Planned", value: "12" },
    { label: "Done", value: "8" },
    { label: "In progress", value: "3" },
    { label: "Moved", value: "1" },
  ];

  const timeline = [
    { day: "Monday", detail: "Setup, auth review", status: "Clean start" },
    { day: "Tuesday", detail: "Deep work block", status: "In motion" },
    { day: "Wednesday", detail: "Rollout and QA", status: "On track" },
    { day: "Thursday", detail: "Ship and polish", status: "Done" },
    { day: "Friday", detail: "Review and carry", status: "1 moved" },
  ];

  return (
    <div className="landing-frame landing-frame-blue overflow-hidden rounded-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            PM Review
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
            Read-only weekly commitment
          </p>
        </div>
        <span className="text-[13px] text-[var(--muted)]">
          Team signal without another dashboard
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-sm border border-[var(--border)] bg-[var(--panel)] px-4 py-4"
              >
                <p className="text-[12px] text-[var(--muted)]">{row.label}</p>
                <p className="mt-3 text-[28px] font-semibold tracking-normal text-[var(--text)]">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-sm border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Completion
              </p>
              <p className="text-[12px] font-semibold text-[var(--text)]">
                67%
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-sm bg-[var(--hover)]">
              <div className="h-full w-[67%] rounded-sm bg-[var(--accent)]" />
            </div>
            <p className="mt-4 text-[12px] leading-[1.7] text-[var(--muted)]">
              Planned vs done stays readable from one surface, without a second
              reporting workflow.
            </p>
          </div>
        </div>

        <div className="rounded-sm border border-[var(--border)] bg-[var(--pane)] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            This week
          </p>
          <div className="mt-4 space-y-3">
            {timeline.map((item) => (
              <div
                key={item.day}
                className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <p className="text-[12px] font-semibold text-[var(--text)]">
                    {item.day}
                  </p>
                  <p className="mt-1 text-[11px] leading-[1.7] text-[var(--muted)]">
                    {item.detail}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[var(--accent)]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPreview() {
  const summary = [
    ["Tasks added", "14"],
    ["Completed", "8"],
    ["Still moving", "3"],
    ["Carried over", "1"],
  ] as const;

  return (
    <div className="landing-frame overflow-hidden rounded-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Friday Summary
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
            End the week with clean signal
          </p>
        </div>
        <p className="text-[13px] text-[var(--muted)]">No analytics clutter</p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid gap-4 border-b border-[var(--border)] pb-6 md:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label} className="md:border-r md:border-[var(--border)] md:last:border-r-0 md:pr-4">
              <p className="text-[12px] text-[var(--muted)]">{label}</p>
              <p className="mt-3 text-[32px] font-semibold tracking-normal text-[var(--text)]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="h-2 overflow-hidden rounded-sm bg-[var(--hover)]">
              <div className="h-full w-[72%] rounded-sm bg-[var(--accent)]" />
            </div>
            <p className="mt-4 max-w-[44ch] text-[14px] leading-[1.85] text-[var(--muted)]">
              Planned work, completed work, and carryover stay visible in one
              compact review. Enough context to improve the next week without
              turning Friday into reporting time.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Plan with real days",
              "Keep work visible",
              "Review without noise",
            ].map((line) => (
              <div
                key={line}
                className="rounded-sm border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-[12px] font-medium text-[var(--text)]"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useReveal();

  return (
    <div className="landing-page landing-page-dark relative min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--landing-line)] bg-[var(--landing-header)] backdrop-blur-xl transition-colors duration-200">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center text-[var(--accent)]">
              <BrandMark size={18} />
            </span>
            <span className="text-[14px] font-semibold tracking-normal text-[var(--landing-ink)]">
              Weekframe
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#product"
              className="text-[13px] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-ink)]"
            >
              Product
            </a>
            <a
              href="#workflow"
              className="text-[13px] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-ink)]"
            >
              Workflow
            </a>
            <a
              href="#review"
              className="text-[13px] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-ink)]"
            >
              Review
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/signin"
              className="inline-flex h-10 items-center justify-center rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-4 text-[12px] font-medium !text-white transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] hover:!text-white sm:px-5"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-4 pb-14 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div data-reveal>
                <SectionLabel>Weekly Planning For Software Teams</SectionLabel>
              </div>

              <h1
                data-reveal
                data-delay="80"
                className="mx-auto mt-6 max-w-5xl text-[44px] font-semibold leading-[0.98] tracking-normal text-[var(--landing-ink)] sm:text-[64px] lg:text-[84px]"
              >
                <span className="lg:whitespace-nowrap">
                  Turn assigned work into
                </span>
                <br />
                a clear week.
              </h1>

              <p
                data-reveal
                data-delay="160"
                className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-[1.85] text-[var(--landing-muted)] sm:text-[18px]"
              >
                Weekframe helps engineers shape realistic Monday to Friday
                plans while PMs keep commitments visible without piling on more
                process.
              </p>

              <div
                data-reveal
                data-delay="220"
                className="mt-9 flex flex-wrap items-center justify-center gap-3"
              >
                <Link
                  href="/signin"
                  className="inline-flex h-12 items-center justify-center rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-6 text-[13px] font-medium !text-white transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] hover:!text-white"
                >
                  Start planning
                </Link>
                <a
                  href="#product"
                  className="inline-flex h-12 items-center justify-center rounded-sm border border-[var(--landing-line)] px-6 text-[13px] font-medium text-[var(--landing-ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  See the planner
                </a>
              </div>
            </div>

            <div data-reveal data-delay="320" className="mt-14 sm:mt-18">
              <PlannerPreview />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-12">
          <div
            data-reveal
            className="mx-auto flex max-w-6xl flex-col gap-4 border-y border-[var(--landing-line)] py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
          >
            <p className="text-[14px] leading-[1.8] text-[var(--landing-muted)]">
              Built for teams that want less backlog theater and more readable
              execution.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--landing-muted)] sm:justify-end">
              <span>Assigned work</span>
              <span>Weekly planning</span>
              <span>PM review</span>
              <span>Friday summary</span>
            </div>
          </div>
        </section>

        <section
          id="product"
          className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div data-reveal>
              <SectionLabel>Engineer Planner</SectionLabel>
              <h2 className="mt-5 max-w-[12ch] text-[34px] font-semibold leading-[1.02] tracking-normal text-[var(--landing-ink)] sm:text-[52px]">
                The week is visible before work starts.
              </h2>
              <p className="mt-6 max-w-[46ch] text-[16px] leading-[1.9] text-[var(--landing-muted)]">
                Assigned tasks come in with context. Engineers drag them into
                real days, rebalance the week, and keep notes close to the work
                instead of splitting context across tools.
              </p>
              <FeatureList
                items={[
                  "Plan against Monday to Friday, not a backlog column.",
                  "Keep labels, notes, and status changes in one surface.",
                  "Cut Monday morning coordination overhead down to the essentials.",
                ]}
              />
            </div>

            <div data-reveal data-delay="120">
              <PlannerPreview />
            </div>
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div data-reveal data-delay="80" className="lg:order-2">
              <SectionLabel>PM Review</SectionLabel>
              <h2 className="mt-5 max-w-[13ch] text-[34px] font-semibold leading-[1.02] tracking-normal text-[var(--landing-ink)] sm:text-[52px]">
                PMs get the commitment without adding ceremony.
              </h2>
              <p className="mt-6 max-w-[46ch] text-[16px] leading-[1.9] text-[var(--landing-muted)]">
                The assigned queue, the planned week, and the weekly review stay
                connected. PMs can see what is planned, what moved, and what
                shipped without maintaining a separate reporting workflow.
              </p>
              <FeatureList
                items={[
                  "Readable weekly commitment for each engineer.",
                  "Planned versus done signal without extra status meetings.",
                  "The same calm surface in both light and dark modes.",
                ]}
              />
            </div>

            <div data-reveal className="lg:order-1">
              <ReviewPreview />
            </div>
          </div>
        </section>

        <section
          id="review"
          className="scroll-mt-28 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div data-reveal className="mx-auto max-w-3xl text-center">
              <SectionLabel>Friday Summary</SectionLabel>
              <h2 className="mt-5 text-[34px] font-semibold leading-[1.02] tracking-normal text-[var(--landing-ink)] sm:text-[56px]">
                Close the week with clean signal.
              </h2>
              <p className="mx-auto mt-6 max-w-[44ch] text-[16px] leading-[1.9] text-[var(--landing-muted)]">
                Enough detail to improve the next week, without turning Friday
                into analytics work.
              </p>
            </div>

            <div data-reveal data-delay="120" className="mt-12">
              <SummaryPreview />
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-24">
          <div data-reveal className="mx-auto max-w-4xl text-center">
            <p className="text-[42px] font-semibold leading-[1.05] tracking-normal text-[var(--landing-ink)] sm:text-[64px]">
              &ldquo;Less status theater.
              <br />
              More visible commitments.&rdquo;
            </p>
            <p className="mx-auto mt-8 max-w-[38ch] text-[15px] leading-[1.9] text-[var(--landing-muted)]">
              Weekframe stays restrained across both themes, so the planner
              feels consistent whether your team works on white or black.
            </p>
          </div>
        </section>

        <section className="px-4 pb-24 pt-8 sm:px-6 sm:pb-28">
          <div
            data-reveal
            className="mx-auto max-w-4xl border-t border-[var(--landing-line)] pt-12 text-center sm:pt-16"
          >
            <SectionLabel>Ready To Start</SectionLabel>
            <h2 className="mx-auto mt-5 max-w-[12ch] text-[36px] font-semibold leading-[1.02] tracking-normal text-[var(--landing-ink)] sm:text-[56px]">
              Plan the week with less noise.
            </h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-[16px] leading-[1.9] text-[var(--landing-muted)]">
              Start with the same planner surface your team will use every
              Monday, then keep the review readable all week.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signin"
                className="inline-flex h-12 items-center justify-center rounded-sm border border-[var(--accent)] bg-[var(--accent)] px-6 text-[13px] font-medium !text-white transition-colors hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] hover:!text-white"
              >
                Start planning
              </Link>
              <a
                href="#product"
                className="inline-flex h-12 items-center justify-center rounded-sm border border-[var(--landing-line)] px-6 text-[13px] font-medium text-[var(--landing-ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Back to product
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--landing-line)] px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center text-[var(--accent)]">
              <BrandMark size={15} />
            </span>
            <span className="text-[13px] font-medium text-[var(--landing-muted)]">
              Weekframe
            </span>
          </div>
          <p className="text-[12px] text-[var(--landing-muted)]">
            Weekly planning for software teams.
          </p>
        </div>
      </footer>
    </div>
  );
}
