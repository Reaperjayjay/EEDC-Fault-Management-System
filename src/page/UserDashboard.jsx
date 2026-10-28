import { useState, useEffect } from "react";
import { getCustomerDashboard } from "../services/api";
import { Link } from "react-router-dom";
import {
  Menu,
  FileText,
  Zap,
  CheckCircle2,
  MessageSquare,
  Plus,
  Clock,
  Check,
  Megaphone,
  CalendarClock,
  Bell,
  Phone,
  Mail,
  ChevronDown,
  ArrowRight,
  AlertOctagon,
  Headphones,
  Activity,
} from "lucide-react";

import Sidebar from "../components/sideBar.jsx";

/* ---------- Existing sample data ---------- */

const TRACK_STEPS = [
  "Report submitted",
  "Under review",
  "Engineer assigned",
  "Repair in progress",
  "Resolved",
];

const announcements = [
  {
    type: "Outage",
    title: "Unplanned outage: Borokiri and surrounding streets",
    text: "A transformer fault is being repaired. Supply is expected back by 6:00 PM today.",
    time: "Today, 9:40 AM",
  },
  {
    type: "Planned",
    title: "Planned maintenance: Rumuola feeder",
    text: "Supply will be off from 9:00 AM to 1:00 PM while we replace aging insulators.",
    time: "Sat, 24 Oct",
  },
  {
    type: "Planned",
    title: "Planned maintenance: Trans-Amadi",
    text: "Short interruptions (up to 30 minutes) between 10:00 AM and 2:00 PM.",
    time: "Tue, 27 Oct",
  },
];

const serviceNotifications = [
  {
    icon: Activity,
    tone: "bg-blue-50 text-blue-600",
    text: "Your report F-2051 is now in progress. An engineer is on site.",
    time: "1 hour ago",
  },
  {
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-600",
    text: "Your report F-2044 was resolved. Thank you for reporting it.",
    time: "5 days ago",
  },
  {
    icon: Bell,
    tone: "bg-amber-50 text-amber-600",
    text: "We need more information on report F-2046. Please reply.",
    time: "2 days ago",
  },
];

const faqs = [
  {
    q: "How do I report a fault?",
    a: "Use the Report a New Fault button on this page. Add a description, the location and, if you can, a photo. You'll get a fault ID straight away.",
  },
  {
    q: "How long will it take to fix?",
    a: "It depends on how serious the fault is and what's needed. Critical faults are handled first. You can follow progress any time under Track My Fault.",
  },
  {
    q: "What should I do if I see a fallen wire?",
    a: "Stay well away and keep others away. Never touch it, even if it looks dead. Report it as Critical and call the control room or emergency services.",
  },
  {
    q: "Why was my report rejected?",
    a: "Common reasons are that the fault isn't on our network or that it duplicates another report. The reason is always shown on the report.",
  },
];

/* ---------- Existing styles & helpers ---------- */

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";
const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

function CardTitle({ icon: Icon, tone, children, right }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h2 className={h2}>{children}</h2>
      </div>
      {right}
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, sub, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

/* ---------- Dashboard ---------- */

export default function CustomerDashboard() {
  console.log("USER DASHBOARD COMPONENT RENDERED");
  const [open, setOpen] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches,
  );

  // Live dashboard data from the backend
  const [reports, setReports] = useState([]);

  const [summary, setSummary] = useState({
    totalReports: 0,
    resolvedReports: 0,
    activeReports: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("USER DASHBOARD USEEFFECT STARTED");
    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        console.log("ABOUT TO CALL CUSTOMER DASHBOARD API");

        const data = await getCustomerDashboard();

        console.log("API RESPONSE RECEIVED:", data);

        if (!isMounted) return;

        setSummary({
          totalReports: Number(data.summary?.totalReports ?? 0),
          resolvedReports: Number(data.summary?.resolvedReports ?? 0),
          activeReports: Number(data.summary?.activeReports ?? 0),
        });

        setReports(
          Array.isArray(data.recentFaultReports) ? data.recentFaultReports : [],
        );
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your dashboard.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const active = reports.find(
    (r) => !["resolved", "cancelled"].includes(r.status),
  );

  const resolved = summary.resolvedReports;

  // Keep the existing sample outage information.
  const outages = announcements.filter((a) => a.type === "Outage").length;

  const statusLabels = {
    pending: "Under Review",
    assigned: "Engineer Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    cancelled: "Cancelled",
  };

  const stageByStatus = {
    pending: 1,
    assigned: 2,
    in_progress: 3,
    resolved: 4,
    cancelled: 1,
  };

  const activeStage = active ? (stageByStatus[active.status] ?? 1) : 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        id="app-sidebar"
        className={`${
          sidebarOpen ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 shadow-xl lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:shadow-none`}
      >
        <Sidebar />

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-2xl font-medium text-slate-900">
              Customer Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, Customer
            </p>
          </div>
        </div>

        {/* Statistics cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileText}
            tone="bg-blue-50 text-blue-600"
            label="My Fault Reports"
            sub="Reports you've submitted"
            value={loading ? "..." : summary.totalReports}
          />

          <StatCard
            icon={Zap}
            tone="bg-orange-50 text-orange-600"
            label="Outage Information"
            sub="Known outages in your area"
            value={outages}
          />

          <StatCard
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-600"
            label="Resolved Reports"
            sub="Previously resolved faults"
            value={loading ? "..." : resolved}
          />

          <StatCard
            icon={MessageSquare}
            tone="bg-violet-50 text-violet-600"
            label="Support Requests"
            sub="Enquiries and complaints"
            value={1}
          />
        </div>

        {/* Quick report */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-600 p-6 text-white">
          <div>
            <h2 className="text-lg font-medium">
              Having a problem with your electricity supply?
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Report a fault in a couple of minutes and track it until it's
              fixed.
            </p>
          </div>

          <Link
            to="/report-fault"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Report a new fault
          </Link>
        </section>

        {/* Reports and timeline */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_420px]">
          {/* Recent report history */}
          <section className={card}>
            <CardTitle
              icon={FileText}
              tone="bg-blue-50 text-blue-600"
              right={
                <Link
                  to="/my-fault-reports"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              Recent fault report history
            </CardTitle>

            {loading ? (
              <p className="py-6 text-sm text-slate-500">
                Loading your fault reports...
              </p>
            ) : error ? (
              <div className="py-6">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm font-medium text-blue-600"
                >
                  Try again
                </button>
              </div>
            ) : reports.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">
                You have not reported any faults yet.
              </p>
            ) : (
              <ul className="space-y-5">
                {reports.map((r, i) => {
                  const label = statusLabels[r.status] || r.status;

                  const badgeClass =
                    r.status === "resolved"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      : ["assigned", "in_progress"].includes(r.status)
                        ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                        : r.status === "cancelled"
                          ? "bg-slate-100 text-slate-600 ring-slate-500/20"
                          : "bg-amber-50 text-amber-700 ring-amber-600/20";

                  return (
                    <li key={r.id} className="relative flex gap-4">
                      {i < reports.length - 1 && (
                        <span className="absolute left-[19px] top-10 h-[calc(100%-1rem)] w-px bg-slate-200" />
                      )}

                      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <FileText className="h-[18px] w-[18px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {r.description ||
                              (r.fault_type || "Fault report").replaceAll(
                                "_",
                                " ",
                              )}
                          </p>

                          <span className={`${pill} ${badgeClass}`}>
                            {label}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500">
                          <span className="font-mono text-xs">
                            F-{String(r.id).padStart(4, "0")}
                          </span>
                          {" · "}
                          {r.site_name}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {r.reported_at
                            ? new Date(r.reported_at).toLocaleDateString()
                            : "Date unavailable"}
                        </p>
                      </div>

                      <Link
                        to="/track-fault"
                        className="self-start text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Track
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Tracking timeline */}
          <section className={card}>
            <CardTitle icon={Activity} tone="bg-indigo-50 text-indigo-600">
              Fault tracking timeline
            </CardTitle>

            {loading ? (
              <p className="py-6 text-sm text-slate-500">
                Loading tracking information...
              </p>
            ) : error ? (
              <p className="py-6 text-sm text-red-600">
                Unable to load tracking information.
              </p>
            ) : active ? (
              <>
                <p className="text-sm font-medium text-slate-900">
                  {active.description ||
                    (active.fault_type || "Fault report").replaceAll("_", " ")}
                </p>

                <p className="mb-5 text-xs text-slate-500">
                  <span className="font-mono">
                    F-{String(active.id).padStart(4, "0")}
                  </span>
                  {" · "}reported{" "}
                  {active.reported_at
                    ? new Date(active.reported_at).toLocaleDateString()
                    : "date unavailable"}
                </p>

                <ol>
                  {TRACK_STEPS.map((s, i) => {
                    const done = i < activeStage;
                    const current = i === activeStage;

                    return (
                      <li
                        key={s}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {i < TRACK_STEPS.length - 1 && (
                          <span
                            className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${
                              i < activeStage
                                ? "bg-emerald-400"
                                : "bg-slate-200"
                            }`}
                          />
                        )}

                        <span
                          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            done
                              ? "bg-emerald-500 text-white"
                              : current
                                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                : "bg-white text-slate-400 ring-2 ring-slate-200"
                          }`}
                        >
                          {done ? (
                            <Check className="h-4 w-4" strokeWidth={3} />
                          ) : (
                            i + 1
                          )}
                        </span>

                        <p
                          className={`pt-1 text-sm ${
                            current
                              ? "font-semibold text-blue-700"
                              : done
                                ? "font-medium text-slate-800"
                                : "text-slate-400"
                          }`}
                        >
                          {s}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                <Link
                  to="/track-fault"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Full tracking details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                You have no active reports to track.
              </p>
            )}
          </section>
        </div>

        {/* Outage announcements and notifications */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Announcements */}
          <section className={card}>
            <CardTitle icon={Megaphone} tone="bg-orange-50 text-orange-600">
              Outage & planned maintenance
            </CardTitle>

            <ul className="space-y-3">
              {announcements.map((a, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        a.type === "Outage"
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {a.type === "Outage" ? (
                        <AlertOctagon className="h-4 w-4" />
                      ) : (
                        <CalendarClock className="h-4 w-4" />
                      )}
                    </span>

                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {a.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {a.text}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {a.time}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Notifications */}
          <section className={card}>
            <CardTitle icon={Bell} tone="bg-amber-50 text-amber-600">
              Customer service notifications
            </CardTitle>

            <ul className="space-y-5">
              {serviceNotifications.map((n, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${n.tone}`}
                  >
                    <n.icon className="h-[18px] w-[18px]" />
                  </span>

                  <div>
                    <p className="text-sm text-slate-800">{n.text}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {n.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Contact information and FAQs */}
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          {/* Contact */}
          <section className={card}>
            <CardTitle icon={Headphones} tone="bg-cyan-50 text-cyan-600">
              Contact information
            </CardTitle>

            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                <Phone className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Customer care line</p>
                  <p className="font-medium text-slate-900">0800 000 0000</p>
                </div>
              </li>

              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                <Mail className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">
                    support@example.com
                  </p>
                </div>
              </li>

              <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Hours</p>
                  <p className="font-medium text-slate-900">
                    Mon–Sat, 8:00 AM – 6:00 PM
                  </p>
                </div>
              </li>
            </ul>

            <p className="mt-4 text-xs text-slate-400">
              These are placeholder contact details. Replace them with your real
              ones.
            </p>
          </section>

          {/* FAQs */}
          <section className={card}>
            <CardTitle icon={MessageSquare} tone="bg-violet-50 text-violet-600">
              Frequently asked questions
            </CardTitle>

            <ul className="divide-y divide-slate-100">
              {faqs.map((f, i) => (
                <li key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                    aria-expanded={open === i}
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {f.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                        open === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {open === i && (
                    <p className="pb-4 text-sm leading-relaxed text-slate-600">
                      {f.a}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
