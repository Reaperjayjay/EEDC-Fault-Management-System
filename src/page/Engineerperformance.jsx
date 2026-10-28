import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Star,
  CheckCircle2,
  ClipboardList,
  Search,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Scale,
  MessageSquare,
  Clock,
} from "lucide-react";

import { apiRequest } from "../services/api";

/* -------------------- CONFIG -------------------- */

// Real backend endpoints (relative to your API base, e.g. /api/v1).
const ENDPOINTS = {
  summary: (q) => `/performance-reports/overview${q}`,
  engineers: (q) => `/performance-reports/engineers-summary${q}`,
  details: (id, q) => `/performance-reports/engineers/${id}${q}`,
};

// Weights from your performance-review model (they total 100%).
const CRITERIA = [
  { key: "resolutionQuality", label: "Resolution quality", weight: 30, text: "How effectively the engineer repaired the fault." },
  { key: "responseTimeScore", label: "Response time", weight: 20, text: "How quickly the engineer responded after accepting an assignment." },
  { key: "completionTimeScore", label: "Completion time", weight: 25, text: "How long the repair took." },
  { key: "diagnosis", label: "Diagnosis", weight: 15, text: "How accurately the engineer identified the cause of the fault." },
  { key: "safetyCompliance", label: "Safety compliance", weight: 10, text: "Whether the engineer followed required safety procedures." },
];

/*
  Display labels, derived from the 1 to 5 averages. These cut-offs are an
  assumption for the interface: adjust them to match your own policy.
*/
function performanceLevel(avg) {
  if (avg >= 4) return "High";
  if (avg >= 3) return "Average";
  return "Low";
}

function responseLabel(avg) {
  if (avg >= 4.5) return "Fast";
  if (avg >= 3.5) return "Good";
  if (avg >= 2.5) return "Average";
  return "Slow";
}

function safetyLabel(avg) {
  if (avg >= 4.5) return "Excellent";
  if (avg >= 3.5) return "Good";
  return "Needs review";
}

const LEVEL_STYLES = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Average: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Low: "bg-red-50 text-red-700 ring-red-600/20",
};

const SAFETY_STYLES = {
  Excellent: "text-emerald-700",
  Good: "text-slate-700",
  "Needs review": "text-red-700",
};

/* -------------------- STYLES + HELPERS -------------------- */

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function average(list, pick) {
  if (list.length === 0) return 0;
  return list.reduce((sum, item) => sum + pick(item), 0) / list.length;
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "Not available";
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "Not available";
  if (value < 60) return `${Math.round(value)} min`;
  return `${Number((value / 60).toFixed(1))} hr`;
}

function buildQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const text = params.toString();
  return text ? `?${text}` : "";
}

const engineerCode = (id) => `ENG-${String(id).padStart(3, "0")}`;

function faultCode(id) {
  if (id === null || id === undefined) return "Fault unavailable";
  return `FLT-${String(id).padStart(3, "0")}`;
}

// Converts the API's snake_case rows into what this page shows.
function mapEngineerRow(row) {
  return {
    id: row.id,
    code: engineerCode(row.id),
    name: row.name,
    jobsCompleted: num(row.jobs_completed),
    reviewCount: num(row.review_count),
    avgScore: num(row.avg_score),
    avgResponseScore: num(row.avg_response_score),
    avgSafetyScore: num(row.avg_safety_score),
  };
}

function mapReview(row) {
  return {
    id: row.id,
    faultCode: faultCode(row.fault_id),
    date: row.created_at,
    resolutionQuality: num(row.resolution_quality),
    responseTimeScore: num(row.response_time_score),
    completionTimeScore: num(row.completion_time_score),
    diagnosis: num(row.diagnosis),
    safetyCompliance: num(row.safety_compliance),
    overall: num(row.overall_score),
    responseMinutes: numberOrNull(row.response_time_minutes),
    workMinutes: numberOrNull(row.work_duration_minutes),
    comments: row.comments,
    reviewer: row.reviewer_name,
  };
}

/* -------------------- SMALL COMPONENTS -------------------- */

function CardTitle({ icon: Icon, tone, children, right }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
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
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <div className="mt-1 text-3xl text-slate-900">{children}</div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function TrendChart({ reviews }) {
  // Oldest to newest, scores on a 0 to 5 scale.
  const points = [...reviews]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => ({ date: r.date, score: num(r.overall) }));

  if (points.length === 0) {
    return <p className="text-sm text-slate-500">No reviews in this period.</p>;
  }

  const width = 320;
  const height = 130;
  const padX = 28;
  const padTop = 10;
  const padBottom = 22;
  const innerW = width - padX - 10;
  const innerH = height - padTop - padBottom;

  const x = (i) =>
    points.length === 1 ? padX + innerW / 2 : padX + (i / (points.length - 1)) * innerW;
  const y = (score) => padTop + innerH - (Math.max(0, Math.min(5, score)) / 5) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.score)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Performance trend across ${points.length} review${points.length === 1 ? "" : "s"}`}
    >
      {[0, 2.5, 5].map((tick) => (
        <g key={tick}>
          <line x1={padX} x2={width - 10} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padX - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {tick}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
      )}

      {points.map((p, i) => (
        <g key={`${p.date}-${i}`}>
          <circle cx={x(i)} cy={y(p.score)} r="4" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
          <title>{`${formatDate(p.date)}: ${p.score.toFixed(2)}/5`}</title>
        </g>
      ))}

      <text x={x(0)} y={height - 6} textAnchor={points.length === 1 ? "middle" : "start"} fontSize="9" fill="#94a3b8">
        {formatDate(points[0].date)}
      </text>
      {points.length > 1 && (
        <text x={x(points.length - 1)} y={height - 6} textAnchor="end" fontSize="9" fill="#94a3b8">
          {formatDate(points[points.length - 1].date)}
        </text>
      )}
    </svg>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function EngineerPerformance() {
  const [summary, setSummary] = useState(null);
  const [engineers, setEngineers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState(null); // engineer row from the table
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const dateError = from && to && from > to ? "The start date must be before the end date." : "";

  /* The date range is applied by the backend, so changing it reloads the data. */
  const fetchAll = useCallback(async (fromDate, toDate) => {
    const query = buildQuery(fromDate, toDate);
    const [s, e] = await Promise.all([
      apiRequest(ENDPOINTS.summary(query)),
      apiRequest(ENDPOINTS.engineers(query)),
    ]);

    return {
      summary: s.data?.summary || null,
      engineers: Array.isArray(e.data?.engineers) ? e.data.engineers.map(mapEngineerRow) : [],
    };
  }, []);

  const load = useCallback(
    async (showRefresh = false) => {
      if (from && to && from > to) return;

      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const data = await fetchAll(from, to);
        setSummary(data.summary);
        setEngineers(data.engineers);
      } catch (err) {
        setError(err.message || "Unable to load engineer performance.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAll, from, to]
  );

  useEffect(() => {
    load();
  }, [load]);

  /* Open the details panel for one engineer. */
  async function openDetails(engineer) {
    setSelected(engineer);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await apiRequest(
        ENDPOINTS.details(engineer.id, buildQuery(from, to))
      );
      const data = response.data?.engineer;
      if (!data) throw new Error("No details were returned for this engineer.");

      setDetails({
        id: data.id,
        name: data.name,
        reviews: Array.isArray(data.reviews) ? data.reviews.map(mapReview) : [],
      });
    } catch (err) {
      setDetailsError(err.message || "Unable to load the engineer's reviews.");
    } finally {
      setDetailsLoading(false);
    }
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return engineers
      .map((engineer) => ({ ...engineer, level: performanceLevel(num(engineer.avgScore)) }))
      .filter((engineer) => {
        if (
          term &&
          !String(engineer.name).toLowerCase().includes(term) &&
          !String(engineer.code).toLowerCase().includes(term)
        ) {
          return false;
        }
        return level === "all" || engineer.level === level;
      })
      .sort((a, b) => num(b.avgScore) - num(a.avgScore));
  }, [engineers, search, level]);

  /* Derived stats for the details panel. */
  const detailStats = useMemo(() => {
    const reviews = details?.reviews || [];
    if (reviews.length === 0) return null;

    const scores = reviews.map((r) => num(r.overall));

    return {
      total: reviews.length,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      avgResponse: average(reviews, (r) => num(r.responseMinutes)),
      avgWork: average(reviews, (r) => num(r.workMinutes)),
    };
  }, [details]);

  const hasReviews = num(summary?.reviews) > 0;
  const avgPercent = hasReviews ? Math.round((num(summary.avgScore) / 5) * 100) : null;

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-slate-900">Engineer Performance</h1>
            <p className="mt-1 text-sm text-slate-500">
              How well engineers completed their previous assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className={btnOutline}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loading && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading engineer performance...
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Something went wrong.</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={() => load()} className="mt-3 underline">
              Try again
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} tone="bg-blue-50 text-blue-600" label="Total engineers reviewed" sub="Engineers with at least one review">
            {summary?.totalReviewed ?? 0}
          </StatCard>

          <StatCard
            icon={Star}
            tone="bg-violet-50 text-violet-600"
            label="Average performance score"
            sub={hasReviews ? `${num(summary.avgScore).toFixed(2)}/5 across all reviews` : "No reviews yet"}
          >
            {avgPercent == null ? "N/A" : `${avgPercent}%`}
          </StatCard>

          <StatCard icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" label="Completed jobs" sub="Reviewed assignments">
            {summary?.completedJobs ?? 0}
          </StatCard>

          <StatCard icon={ClipboardList} tone="bg-amber-50 text-amber-600" label="Performance reviews" sub="Reviews submitted">
            {summary?.reviews ?? 0}
          </StatCard>
        </div>

        {/* Search and filters */}
        <section className={`${card} mb-6`}>
          <CardTitle icon={Search} tone="bg-blue-50 text-blue-600">
            Search and filters
          </CardTitle>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Search by name or ID
              </label>
              <input
                type="search"
                className={field}
                placeholder="e.g. kelechi or ENG-001"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Performance level
              </label>
              <select className={field} value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="all">All levels</option>
                <option value="High">High</option>
                <option value="Average">Average</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Reviews from
              </label>
              <input type="date" className={field} value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Reviews to
              </label>
              <input type="date" className={field} value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
            </div>
          </div>

          {dateError && <p className="mt-3 text-sm text-red-700">{dateError}</p>}

          {(from || to) && (
            <button
              type="button"
              className="mt-3 text-xs text-blue-600 underline"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear date range
            </button>
          )}
        </section>

        {/* Performance table */}
        <section className={`${card} mb-6`}>
          <CardTitle
            icon={Star}
            tone="bg-violet-50 text-violet-600"
            right={
              <span className="text-xs text-slate-400">
                {rows.length} engineer{rows.length === 1 ? "" : "s"}
              </span>
            }
          >
            Engineer performance
          </CardTitle>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              {engineers.length === 0
                ? "No performance reviews have been submitted for this period yet."
                : "No engineers match your search and filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">Engineer</th>
                    <th className="py-2 pr-3 font-medium">Jobs completed</th>
                    <th className="py-2 pr-3 font-medium">Avg. score</th>
                    <th className="py-2 pr-3 font-medium">Response time</th>
                    <th className="py-2 pr-3 font-medium">Safety compliance</th>
                    <th className="py-2 pr-3 font-medium">Performance</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((engineer) => {
                    const safety = safetyLabel(num(engineer.avgSafetyScore));

                    return (
                      <tr key={engineer.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-slate-900">{engineer.name}</p>
                          <p className="font-mono text-xs text-slate-400">{engineer.code}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-700">{engineer.jobsCompleted}</td>
                        <td className="py-3 pr-3 text-slate-900">
                          {num(engineer.avgScore).toFixed(1)}/5
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {responseLabel(num(engineer.avgResponseScore))}
                        </td>
                        <td className={`py-3 pr-3 ${SAFETY_STYLES[safety]}`}>{safety}</td>
                        <td className="py-3 pr-3">
                          <span className={`${pill} ${LEVEL_STYLES[engineer.level]}`}>
                            {engineer.level}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button type="button" onClick={() => openDetails(engineer)} className={btnOutline}>
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Evaluation criteria */}
        <section className={card}>
          <CardTitle icon={Scale} tone="bg-emerald-50 text-emerald-600">
            How the performance score is calculated
          </CardTitle>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">Evaluation factor</th>
                  <th className="py-2 pr-3 font-medium">What it measures</th>
                  <th className="py-2 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((item) => (
                  <tr key={item.key} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{item.label}</td>
                    <td className="py-3 pr-3 text-slate-600">{item.text}</td>
                    <td className="py-3 text-right text-slate-900">{item.weight}%</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 pr-3 font-medium text-slate-900">Total</td>
                  <td />
                  <td className="py-3 text-right font-medium text-slate-900">
                    {CRITERIA.reduce((sum, item) => sum + item.weight, 0)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Scores are calculated automatically from review data, not typed in
            by hand. Only authorized staff can submit performance reviews.
          </p>
        </section>
      </div>

      {/* Details panel */}
      {selected && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <p className="text-lg font-medium text-slate-900">{selected.name}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{selected.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close panel"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {detailsLoading && <p className="text-sm text-slate-500">Loading reviews...</p>}
              {detailsError && <p className="text-sm text-red-700">{detailsError}</p>}

              {details && !detailStats && (
                <p className="text-sm text-slate-500">
                  This engineer has no reviews in the selected period.
                </p>
              )}

              {details && detailStats && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <CheckCircle2 className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Completed assignments</p>
                      <p className="text-lg font-medium text-slate-900">{selected.jobsCompleted}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Star className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Average score</p>
                      <p className="text-lg font-medium text-slate-900">{detailStats.average.toFixed(2)}/5</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <p className="mt-2 text-xs text-slate-500">Highest score</p>
                      <p className="text-lg font-medium text-slate-900">{detailStats.highest.toFixed(2)}/5</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <p className="mt-2 text-xs text-slate-500">Lowest score</p>
                      <p className="text-lg font-medium text-slate-900">{detailStats.lowest.toFixed(2)}/5</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Avg. response time</p>
                      <p className="text-lg font-medium text-slate-900">{formatDuration(detailStats.avgResponse)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Avg. completion time</p>
                      <p className="text-lg font-medium text-slate-900">{formatDuration(detailStats.avgWork)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-medium text-slate-900">Performance trend</h3>
                    <TrendChart reviews={details.reviews} />
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-medium text-slate-900">Review history</h3>

                    <ul className="space-y-3">
                      {details.reviews.map((r) => {
                        const safety = safetyLabel(num(r.safetyCompliance));

                        return (
                          <li key={r.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-mono text-xs text-slate-700">{r.faultCode}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{formatDate(r.date)}</p>
                              </div>
                              <span className={`${pill} bg-violet-50 text-violet-700 ring-violet-600/20`}>
                                {num(r.overall).toFixed(2)}/5
                              </span>
                            </div>

                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                              {CRITERIA.map((item) => (
                                <div key={item.key} className="flex justify-between">
                                  <dt>{item.label}</dt>
                                  <dd className="font-medium text-slate-900">{num(r[item.key])}/5</dd>
                                </div>
                              ))}
                              <div className="flex justify-between">
                                <dt>Response</dt>
                                <dd className="font-medium text-slate-900">{formatDuration(r.responseMinutes)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt>Repair time</dt>
                                <dd className="font-medium text-slate-900">{formatDuration(r.workMinutes)}</dd>
                              </div>
                            </dl>

                            <p className={`mt-2 flex items-center gap-1.5 text-xs ${SAFETY_STYLES[safety]}`}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Safety: {safety}
                            </p>

                            {r.comments && (
                              <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {r.comments}
                                {r.reviewer && (
                                  <span className="text-xs text-slate-400"> · {r.reviewer}</span>
                                )}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}