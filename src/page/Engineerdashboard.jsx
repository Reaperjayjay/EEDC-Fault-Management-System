import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  ClipboardList,
  Wrench,
  CheckCircle2,
  Trophy,
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
  FileText,
  Bell,
  ArrowRight,
  Check,
  RefreshCw,
  RotateCcw,
  Menu,
  Star,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { apiRequest } from "../services/api";
import Sidebar from "../components/sideBar.jsx";

/* -------------------- CONSTANTS -------------------- */

const STEPS = [
  "Assigned",
  "Accepted",
  "Repairing",
  "Completed",
];

const UNDERWAY = [
  "Repairing",
  "En Route",
  "Arrived",
  "Inspecting",
  "Testing",
];

const STATUS_LABELS = {
  assigned: "Assigned",
  pending: "Assigned",
  accepted: "Accepted",
  en_route: "En Route",
  arrived: "Arrived",
  inspecting: "Inspecting",
  repairing: "Repairing",
  in_progress: "Repairing",
  testing: "Testing",
  completed: "Completed",
  resolved: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const PPE_ITEMS = [
  "Hard hat",
  "Insulated gloves (rated for the voltage)",
  "Safety boots",
  "High-visibility vest",
  "Face shield / arc-flash protection",
  "Voltage tester checked and working",
  "Lock-out / tag-out applied",
  "Site hazard assessment done",
];

const PRIORITY_RANK = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
};

const PRIORITY_COLORS = {
  Low: "#94a3b8",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;

const btnSuccess =
  `${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/20`;

const btnOutline =
  `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;

const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/* -------------------- HELPERS -------------------- */

function toLabel(status) {
  const value = String(status || "assigned").toLowerCase();

  return (
    STATUS_LABELS[value] ||
    value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toPriority(severity) {
  const value = String(severity || "medium");
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) {
    return "Not available";
  }

  const value = Number(minutes);

  if (!Number.isFinite(value)) {
    return "Not available";
  }

  if (value < 60) {
    return `${Math.round(value)} min`;
  }

  const hours = value / 60;

  return `${Number(hours.toFixed(1))} hr`;
}

// Scores arrive from the API as strings (e.g. "3.450000").
function formatScore(value) {
  const number = toNumber(value);
  return number === null ? "N/A" : `${number.toFixed(2)}/5`;
}

function hasCoords(job) {
  return (
    Number.isFinite(job.lat) &&
    Number.isFinite(job.lng) &&
    job.lat >= -90 &&
    job.lat <= 90 &&
    job.lng >= -180 &&
    job.lng <= 180
  );
}

function mapAssignment(item) {
  const priority = toPriority(item.severity);

  return {
    id: item.assignment_id,
    faultId: `F-${item.fault_id}`,
    title: item.fault_type
      ? String(item.fault_type)
          .replaceAll("_", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Electrical fault",
    site:
      item.site_name ||
      item.address ||
      "Site location unavailable",
    priority:
      PRIORITY_RANK[priority] !== undefined ? priority : "Medium",
    rawStatus: String(
      item.assignment_status || "assigned"
    ).toLowerCase(),
    status: toLabel(item.assignment_status),
    lat: toNumber(
      item.site_latitude ?? item.latitude ?? item.detected_latitude
    ),
    lng: toNumber(
      item.site_longitude ?? item.longitude ?? item.detected_longitude
    ),
    description: item.description || "",
    faultStatus: item.fault_status || "",
    assignedAt: item.assigned_at,
    acceptedAt: item.accepted_at,
    startedAt: item.started_at,
    completedAt: item.completed_at,
    severity: priority,
    notes: item.notes || "",
  };
}

/* -------------------- SMALL COMPONENTS -------------------- */

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

function StatCard({ icon: Icon, tone, label, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm text-slate-500">{label}</p>

      <div className="mt-1 text-3xl text-slate-900">
        {children}
      </div>

      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

/* -------------------- GPS MAP -------------------- */

function SitesMap({ jobs }) {
  const mapElement = useRef(null);

  const locatedJobs = jobs.filter(hasCoords);

  const locationKey = locatedJobs
    .map((job) => `${job.id}:${job.lat}:${job.lng}:${job.priority}`)
    .join("|");

  useEffect(() => {
    if (!mapElement.current || locatedJobs.length === 0) {
      return;
    }

    const map = L.map(mapElement.current).setView(
      [locatedJobs[0].lat, locatedJobs[0].lng],
      10
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map);

    const points = [];

    locatedJobs.forEach((job) => {
      L.circleMarker([job.lat, job.lng], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor:
          PRIORITY_COLORS[job.priority] ||
          PRIORITY_COLORS.Medium,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(`${job.faultId} · ${job.site}`);

      points.push([job.lat, job.lng]);
    });

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, {
        padding: [30, 30],
        maxZoom: 15,
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [locationKey]);

  if (locatedJobs.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        <MapPin className="mb-2 h-6 w-6" />
        GPS coordinates are not available for your assigned sites.
      </div>
    );
  }

  return (
    <div
      ref={mapElement}
      className="isolate h-64 w-full overflow-hidden rounded-xl bg-slate-100"
    />
  );
}

/* -------------------- MAIN DASHBOARD -------------------- */

export default function EngineerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Performance summary (separate endpoint)
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 1024px)").matches
  );

  // Safety checklist remains local until a safety API is created.
  const [checked, setChecked] = useState({});
  const [verifiedAt, setVerifiedAt] = useState(null);

  const allChecked = PPE_ITEMS.every((item) => checked[item]);

  /* Request all dashboard information from one endpoint (no state here). */
  const fetchDashboard = useCallback(async () => {
    const response = await apiRequest("/engineer-dashboard");
    const data = response.data?.dashboard;

    if (!data) {
      throw new Error("Dashboard data was not returned by the server.");
    }

    return data;
  }, []);

  /* Request the performance summary (no state here). */
  const fetchSummary = useCallback(async () => {
    const response = await apiRequest(
      "/performance-reviews/my-performance-summary"
    );
    return response.data?.summary || null;
  }, []);

  /* Put the server response into state. */
  const applyDashboard = useCallback((data) => {
    const assignments = Array.isArray(data.assignments)
      ? data.assignments
      : [];

    setDashboard(data);
    setJobs(assignments.map(mapAssignment));
  }, []);

  /* Used by the Refresh and "Try again" buttons and after status updates. */
  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoadingJobs(true);
        }

        setJobsError("");

        applyDashboard(await fetchDashboard());
      } catch (error) {
        setJobsError(
          error.message || "Unable to load your engineer dashboard."
        );
      } finally {
        setLoadingJobs(false);
        setRefreshing(false);
      }

      // Refresh the performance summary alongside the dashboard.
      try {
        setSummary(await fetchSummary());
        setSummaryError("");
      } catch (error) {
        setSummaryError(
          error.message || "Unable to load your performance summary."
        );
      }
    },
    [fetchDashboard, applyDashboard, fetchSummary]
  );

  /* First load. State starts as loading, so nothing is set synchronously. */
  useEffect(() => {
    let cancelled = false;

    fetchDashboard()
      .then((data) => {
        if (!cancelled) applyDashboard(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setJobsError(
            error.message || "Unable to load your engineer dashboard."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingJobs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchDashboard, applyDashboard]);

  /* First load of the performance summary. */
  useEffect(() => {
    let cancelled = false;

    fetchSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setSummaryError(
            error.message || "Unable to load your performance summary."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  /* Derived values: calculated from actual dashboard response. */
  const stats = dashboard?.stats || {};

  const engineer = dashboard?.engineer || {};

  const performance = dashboard?.performance || {};

  const reviews = Array.isArray(dashboard?.reviews)
    ? dashboard.reviews
    : [];

  const activity = Array.isArray(dashboard?.activity)
    ? dashboard.activity
    : [];

  const inProgress = jobs.filter((job) =>
    UNDERWAY.includes(job.status)
  ).length;

  const upcoming = [...jobs]
    .filter(
      (job) =>
        job.status !== "Completed" &&
        job.status !== "Rejected" &&
        job.status !== "Cancelled"
    )
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 99) -
        (PRIORITY_RANK[b.priority] ?? 99)
    );

  const summaryCards = summary
    ? [
        {
          label: "Total reviews",
          value: summary.total_reviews ?? 0,
          icon: FileText,
          tone: "bg-blue-50 text-blue-600",
        },
        {
          label: "Average score",
          value: formatScore(summary.average_score),
          icon: Star,
          tone: "bg-violet-50 text-violet-600",
        },
        {
          label: "Highest score",
          value: formatScore(summary.highest_score),
          icon: TrendingUp,
          tone: "bg-emerald-50 text-emerald-600",
        },
        {
          label: "Lowest score",
          value: formatScore(summary.lowest_score),
          icon: TrendingDown,
          tone: "bg-orange-50 text-orange-600",
        },
        {
          label: "Completed jobs",
          value: summary.completed_jobs ?? 0,
          icon: CheckCircle2,
          tone: "bg-emerald-50 text-emerald-600",
        },
      ]
    : [];

  /* Update assignment status through the existing API. */
  async function advance(jobId) {
    const job = jobs.find(
      (item) => Number(item.id) === Number(jobId)
    );

    if (!job) return;

    let nextStatus;

    if (job.rawStatus === "assigned") {
      nextStatus = "accepted";
    } else if (job.rawStatus === "accepted") {
      nextStatus = "in_progress";
    } else {
      return;
    }

    try {
      setUpdatingId(job.id);
      setUpdateError("");

      await apiRequest(`/assignments/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      // Reload actual database state and calculated statistics.
      await loadDashboard(true);
    } catch (error) {
      setUpdateError(
        error.message || "Unable to update the assignment."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function handleSidebarClick(event) {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024 &&
      event.target.closest("a")
    ) {
      setSidebarOpen(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        id="app-sidebar"
        onClick={handleSidebarClick}
        className={`${
          sidebarOpen ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 shadow-xl lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:shadow-none`}
      >
        <Sidebar />

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen((open) => !open)
                }
                aria-label={
                  sidebarOpen ? "Close sidebar" : "Open sidebar"
                }
                aria-expanded={sidebarOpen}
                aria-controls="app-sidebar"
                className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-2xl font-medium text-slate-900">
                  Engineer Dashboard
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Welcome back
                  {engineer.name ? `, ${engineer.name}` : ", Engineer"}
                </p>

                {engineer.specialization && (
                  <p className="mt-1 text-xs capitalize text-slate-400">
                    {String(engineer.specialization).replaceAll(
                      "_",
                      " "
                    )}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={loadingJobs || refreshing}
              className={btnOutline}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>

          {/* Loading and errors */}
          {loadingJobs && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading your dashboard from the database...
            </div>
          )}

          {jobsError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">
                Could not load your dashboard.
              </p>
              <p className="mt-1">{jobsError}</p>
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="mt-3 underline"
              >
                Try again
              </button>
            </div>
          )}

          {updateError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {updateError}
            </div>
          )}

          {!loadingJobs &&
            !jobsError &&
            jobs.length === 0 && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No assignments are currently linked to your account.
              </div>
            )}

          {/* Live statistics */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ClipboardList}
              tone="bg-blue-50 text-blue-600"
              label="My Assignments"
              sub="Total assigned jobs"
            >
              {stats.totalAssignments ?? jobs.length}
            </StatCard>

            <StatCard
              icon={Wrench}
              tone="bg-orange-50 text-orange-600"
              label="In Progress"
              sub="Repairs currently underway"
            >
              {stats.inProgressAssignments ?? inProgress}
            </StatCard>

            <StatCard
              icon={CheckCircle2}
              tone="bg-emerald-50 text-emerald-600"
              label="Completed Jobs"
              sub="Completed assignments"
            >
              {stats.completedAssignments ?? 0}
            </StatCard>

            <StatCard
              icon={Trophy}
              tone="bg-violet-50 text-violet-600"
              label="Average Performance"
              sub={
                performance.reviewCount
                  ? `${performance.reviewCount} performance review(s)`
                  : "Awaiting performance reviews"
              }
            >
              {performance.averageScore == null
                ? "N/A"
                : `${Number(performance.averageScore).toFixed(2)}/5`}
            </StatCard>
          </div>

          {/* Upcoming assignments and GPS */}
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <section className={card}>
              <CardTitle
                icon={AlertTriangle}
                tone="bg-red-50 text-red-600"
                right={
                  <Link
                    to="/my-assignments"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              >
                Upcoming & urgent assignments
              </CardTitle>

              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No upcoming assignments.
                </p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((job) => (
                    <li
                      key={job.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {job.title}
                        </p>

                        <span
                          className={`${pill} ${
                            PRIORITY_STYLES[job.priority] ||
                            PRIORITY_STYLES.Medium
                          }`}
                        >
                          {job.priority}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        <span className="font-mono">
                          {job.faultId}
                        </span>
                        {" · "}
                        {job.site}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Status: {job.status}
                      </p>

                      {job.assignedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          Assigned: {formatDate(job.assignedAt)}
                        </p>
                      )}

                      {job.description && (
                        <p className="mt-2 text-sm text-slate-600">
                          {job.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card}>
              <CardTitle
                icon={MapPin}
                tone="bg-rose-50 text-rose-600"
              >
                Fault site locations & GPS navigation
              </CardTitle>

              <SitesMap jobs={jobs} />

              <ul className="mt-4 space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      <span className="font-mono text-xs text-slate-400">
                        {job.faultId}
                      </span>
                      {" · "}
                      {job.site}
                    </span>

                    {hasCoords(job) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Navigate
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Safety checklist and assignment progress */}
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <section className={card}>
              <CardTitle
                icon={ShieldCheck}
                tone="bg-emerald-50 text-emerald-600"
                right={
                  verifiedAt ? (
                    <span className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
                      <Check className="mr-1 h-3 w-3" />
                      Checked {verifiedAt}
                    </span>
                  ) : (
                    <span className={`${pill} bg-amber-50 text-amber-700 ring-amber-600/20`}>
                      Not verified
                    </span>
                  )
                }
              >
                Safety inspection & PPE
              </CardTitle>

              <p className="mb-3 text-xs text-slate-500">
                Confirm every item before starting work. This checklist
                currently applies only to this browser session.
              </p>

              <ul className="space-y-2">
                {PPE_ITEMS.map((item) => (
                  <li key={item}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                      checked[item]
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-600"
                        checked={!!checked[item]}
                        onChange={(event) => {
                          setChecked((current) => ({
                            ...current,
                            [item]: event.target.checked,
                          }));
                          setVerifiedAt(null);
                        }}
                      />
                      {item}
                    </label>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!allChecked || !!verifiedAt}
                  onClick={() =>
                    setVerifiedAt(
                      new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    )
                  }
                  className={btnSuccess}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Confirm checklist
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChecked({});
                    setVerifiedAt(null);
                  }}
                  className={btnOutline}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>

                <span className="text-xs text-slate-400">
                  {Object.values(checked).filter(Boolean).length}/
                  {PPE_ITEMS.length} checked
                </span>
              </div>
            </section>

            <section className={card}>
              <CardTitle
                icon={RefreshCw}
                tone="bg-blue-50 text-blue-600"
              >
                Repair status updates
              </CardTitle>

              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Your assignment statuses will appear here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {jobs.map((job) => {
                    const currentStep = STEPS.indexOf(job.status);

                    return (
                      <li
                        key={job.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {job.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {job.faultId} · {job.site}
                            </p>
                          </div>

                          <span className={`${pill} shrink-0 bg-blue-50 text-blue-700 ring-blue-600/20`}>
                            {job.status}
                          </span>
                        </div>

                        {currentStep >= 0 && (
                          <div className="mt-3 flex gap-1">
                            {STEPS.map((step, index) => (
                              <span
                                key={step}
                                title={step}
                                className={`h-1.5 flex-1 rounded-full ${
                                  index <= currentStep
                                    ? "bg-blue-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        <div className="mt-3">
                          {job.rawStatus === "assigned" ? (
                            <button
                              type="button"
                              onClick={() => advance(job.id)}
                              disabled={updatingId === job.id}
                              className={btnPrimary}
                            >
                              {updatingId === job.id
                                ? "Saving..."
                                : "Accept assignment"}
                            </button>
                          ) : job.rawStatus === "accepted" ? (
                            <button
                              type="button"
                              onClick={() => advance(job.id)}
                              disabled={updatingId === job.id}
                              className={btnPrimary}
                            >
                              {updatingId === job.id
                                ? "Saving..."
                                : "Start repair"}
                            </button>
                          ) : job.rawStatus === "in_progress" ? (
                            <Link
                              to="/fault-status"
                              className={btnSuccess}
                            >
                              <FileText className="h-4 w-4" />
                              Update fault status
                            </Link>
                          ) : job.rawStatus === "completed" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Job completed
                            </span>
                          ) : (
                            <p className="text-xs text-slate-500">
                              Current status: {job.status}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Performance review and activity */}
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <section className={card}>
              <CardTitle
                icon={Trophy}
                tone="bg-violet-50 text-violet-600"
              >
                My performance
              </CardTitle>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Average review score
                  </p>
                  <p className="mt-2 text-2xl font-medium text-slate-900">
                    {performance.averageScore == null
                      ? "N/A"
                      : `${Number(performance.averageScore).toFixed(2)}/5`}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Completion rate
                  </p>
                  <p className="mt-2 text-2xl font-medium text-slate-900">
                    {stats.completionRate ?? 0}%
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Average response time
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-900">
                    {formatDuration(performance.averageResponseMinutes)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Average work duration
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-900">
                    {formatDuration(performance.averageWorkMinutes)}
                  </p>
                </div>
              </div>

              <h3 className="mb-3 mt-6 text-sm font-medium text-slate-900">
                Latest performance reviews
              </h3>

              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No performance reviews have been recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {String(review.fault_type || "Assignment")
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {review.site_name || "Site unavailable"}
                            {" · "}
                            {formatDate(review.created_at)}
                          </p>
                        </div>

                        <span className={`${pill} bg-violet-50 text-violet-700 ring-violet-600/20`}>
                          {Number(review.overall_score).toFixed(2)}/5
                        </span>
                      </div>

                      {review.comments && (
                        <p className="mt-2 text-sm text-slate-600">
                          {review.comments}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card}>
              <CardTitle
                icon={Bell}
                tone="bg-amber-50 text-amber-600"
              >
                Recent activity
              </CardTitle>

              {activity.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No assignment progress updates have been recorded yet.
                </p>
              ) : (
                <ul className="space-y-4">
                  {activity.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <RefreshCw className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {toLabel(item.status)}
                          {" · "}
                          {String(item.fault_type || "Fault")
                            .replaceAll("_", " ")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.site_name || "Site unavailable"}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Performance summary */}
          <section className={card}>
            <CardTitle
              icon={Trophy}
              tone="bg-violet-50 text-violet-600"
            >
              Performance summary
            </CardTitle>

            {summaryError ? (
              <p className="text-sm text-red-700">{summaryError}</p>
            ) : !summary ? (
              <p className="text-sm text-slate-500">
                No performance summary is available yet.
              </p>
            ) : (
              <>
                {summary.engineer_name && (
                  <p className="mb-4 text-sm capitalize text-slate-500">
                    {summary.engineer_name}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {summaryCards.map(
                    ({ label, value, icon: Icon, tone }) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          {label}
                        </p>

                        <p className="mt-1 text-2xl font-medium text-slate-900">
                          {value}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}