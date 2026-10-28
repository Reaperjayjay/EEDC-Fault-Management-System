
import { useEffect, useState } from "react";
import {
  Trophy,
  ClipboardList,
  CheckCircle2,
  Hourglass,
  Target,
  Wrench,
  AlertTriangle,
  Timer,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MessageSquare,
  Star,
  ThumbsUp,
  Lightbulb,
  History as HistoryIcon,
  Award,
  Clock,
} from "lucide-react";

import {
  getMyPerformanceReviews,
  getMyPerformanceSummary,
  getMyPerformanceHistory,
  getMyAssignments,
} from "../../services/api";

/* ---------- grading ---------- */

const grades = [
  { g: "A", label: "Excellent", range: "90–100", min: 90 },
  { g: "B", label: "Very Good", range: "80–89", min: 80 },
  { g: "C", label: "Good", range: "70–79", min: 70 },
  { g: "D", label: "Needs Improvement", range: "60–69", min: 60 },
  { g: "F", label: "Unsatisfactory", range: "Below 60", min: 0 },
];

const gradeFor = (score) => {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) {
    return null;
  }

  return grades.find((item) => Number(score) >= item.min) ?? grades[4];
};

const gradeStyle = {
  A: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    card: "border-emerald-400 bg-emerald-50",
    text: "text-emerald-600",
    ring: "#10b981",
  },
  B: {
    chip: "bg-blue-50 text-blue-700 ring-blue-600/20",
    card: "border-blue-400 bg-blue-50",
    text: "text-blue-600",
    ring: "#3b82f6",
  },
  C: {
    chip: "bg-amber-50 text-amber-700 ring-amber-600/20",
    card: "border-amber-400 bg-amber-50",
    text: "text-amber-600",
    ring: "#f59e0b",
  },
  D: {
    chip: "bg-orange-50 text-orange-700 ring-orange-600/20",
    card: "border-orange-400 bg-orange-50",
    text: "text-orange-600",
    ring: "#f97316",
  },
  F: {
    chip: "bg-red-50 text-red-700 ring-red-600/20",
    card: "border-red-400 bg-red-50",
    text: "text-red-600",
    ring: "#ef4444",
  },
};

/* ---------- styles & helpers ---------- */

const card =
  "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm";

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

const tones = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  indigo: "bg-indigo-50 text-indigo-600",
  cyan: "bg-cyan-50 text-cyan-600",
  slate: "bg-slate-100 text-slate-600",
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const average = (values) => {
  const validValues = values.map(toNumber).filter((value) => value !== null);

  if (!validValues.length) return null;

  return validValues.reduce((sum, value) => sum + value, 0) /
    validValues.length;
};

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString([], { dateStyle: "medium" });
};

const formatMinutes = (value) => {
  const minutes = toNumber(value);

  if (minutes === null || minutes < 0) return "--";
  if (minutes < 60) return `${Math.round(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  return remaining
    ? `${hours} h ${remaining} min`
    : `${hours} h`;
};

const unwrapSummary = (response) =>
  response?.data?.summary ??
  response?.summary ??
  response?.data?.data?.summary ??
  null;

const unwrapList = (response, keys = []) => {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.data?.history,
    response?.data?.reviews,
    response?.data?.assignments,
    response?.data?.results,
    response?.data?.data,
    response?.data,
    response?.history,
    response?.reviews,
    response?.assignments,
    response?.results,
    response,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) {
        return candidate[key];
      }
    }
  }

  return [];
};

const getAssignmentStatus = (assignment) =>
  String(
    assignment?.assignment_status ??
      assignment?.status ??
      ""
  ).toLowerCase();

const isCompleted = (assignment) =>
  getAssignmentStatus(assignment) === "completed";

const getPeriodLabel = (item) =>
  item?.period ?? item?.periodKey ?? item?.assessmentDate ?? item?.date ?? "--";

const getReviewScore = (review) =>
  toNumber(review?.overall_score ?? review?.score);

function SectionTitle({ icon: Icon, tone = "blue", title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {right}
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="h-6 w-6" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold leading-tight text-slate-900">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- charts ---------- */

function ScoreRing({ score, grade }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const safeScore = Math.max(0, Math.min(100, toNumber(score) ?? 0));
  const ringColor = gradeStyle[grade]?.ring ?? "#64748b";

  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (safeScore / 100) * c}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">
          {score === null || score === undefined ? "--" : Math.round(score)}
        </span>
        <span className="text-xs text-blue-200">out of 100</span>
      </div>
    </div>
  );
}

function LineChart({ id, data, labels, color, fmt = (value) => value }) {
  if (!data.length || !labels.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        No recorded data available yet.
      </p>
    );
  }

  const W = 420;
  const H = 210;
  const L = 38;
  const R = 18;
  const T = 28;
  const B = 32;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const lo = Math.floor(min - span * 0.35);
  const hi = Math.ceil(max + span * 0.35);

  const x = (i) =>
    data.length === 1
      ? (W + L - R) / 2
      : L + (i * (W - L - R)) / (data.length - 1);

  const y = (value) =>
    T + (1 - (value - lo) / (hi - lo || 1)) * (H - T - B);

  const pts = data.map((value, i) => `${x(i)},${y(value)}`).join(" ");
  const area = `${x(0)},${H - B} ${pts} ${x(data.length - 1)},${H - B}`;
  const ticks = [lo, Math.round((lo + hi) / 2), hi];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((tick, index) => (
        <g key={`${tick}-${index}`}>
          <line
            x1={L}
            x2={W - R}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <text
            x={L - 8}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="10"
            className="fill-slate-400"
          >
            {tick}
          </text>
        </g>
      ))}

      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((value, index) => (
        <g key={`${labels[index]}-${index}`}>
          <circle
            cx={x(index)}
            cy={y(value)}
            r="4.5"
            fill="white"
            stroke={color}
            strokeWidth="2.5"
          />
          <text
            x={x(index)}
            y={y(value) - 11}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            className="fill-slate-700"
          >
            {fmt(value)}
          </text>
          <text
            x={x(index)}
            y={H - 10}
            textAnchor="middle"
            fontSize="11"
            className="fill-slate-500"
          >
            {labels[index]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ data, labels, color }) {
  if (!data.length || !labels.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        No recorded data available yet.
      </p>
    );
  }

  const W = 420;
  const H = 210;
  const L = 20;
  const R = 20;
  const T = 28;
  const B = 32;
  const max = Math.max(...data, 1) * 1.2;
  const slot = (W - L - R) / data.length;
  const bw = Math.min(38, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <line
        x1={L}
        x2={W - R}
        y1={H - B}
        y2={H - B}
        stroke="#e2e8f0"
      />

      {data.map((value, index) => {
        const height = (value / max) * (H - T - B);
        const cx = L + slot * index + slot / 2;

        return (
          <g key={`${labels[index]}-${index}`}>
            <rect
              x={cx - bw / 2}
              y={H - B - height}
              width={bw}
              height={height}
              rx="6"
              fill={color}
              opacity={index === data.length - 1 ? 1 : 0.55}
            />
            <text
              x={cx}
              y={H - B - height - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              className="fill-slate-700"
            >
              {value}
            </text>
            <text
              x={cx}
              y={H - 10}
              textAnchor="middle"
              fontSize="11"
              className="fill-slate-500"
            >
              {labels[index]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreBar({ label, value, icon: Icon, color }) {
  const numericValue = toNumber(value);
  const width =
    numericValue === null
      ? 0
      : Math.max(0, Math.min(100, numericValue));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <Icon className="h-4 w-4 text-slate-400" />
          {label}
        </span>
        <span className="font-bold text-slate-900">
          {numericValue === null ? "--" : `${Math.round(numericValue)}%`}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function Stars({ value }) {
  const rating = toNumber(value) ?? 0;

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((number) => (
        <Star
          key={number}
          className={`h-4 w-4 ${
            number <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

function GradeBadge({ score }) {
  const grade = gradeFor(score);

  if (!grade) {
    return (
      <span className={`${pill} bg-slate-50 text-slate-500 ring-slate-300`}>
        Not rated
      </span>
    );
  }

  return (
    <span className={`${pill} ${gradeStyle[grade.g].chip} font-bold`}>
      Grade {grade.g}
    </span>
  );
}

/* ---------- page ---------- */

export default function MyPerformance() {
  const [historyTab, setHistoryTab] = useState("monthly");

  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [quarterlyHistory, setQuarterlyHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData(isRefresh = false) {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setDataError("");

      const results = await Promise.allSettled([
        getMyPerformanceSummary(),
        getMyPerformanceReviews(),
        getMyAssignments(),
        getMyPerformanceHistory("monthly"),
        getMyPerformanceHistory("quarterly"),
      ]);

      if (!active) return;

      const [
        summaryResult,
        reviewsResult,
        assignmentsResult,
        monthlyResult,
        quarterlyResult,
      ] = results;

      const errors = [];

      if (summaryResult.status === "fulfilled") {
        setSummary(unwrapSummary(summaryResult.value));
      } else {
        errors.push("performance summary");
      }

      if (reviewsResult.status === "fulfilled") {
        setReviews(
          unwrapList(reviewsResult.value, [
            "reviews",
            "performanceReviews",
            "results",
          ])
        );
      } else {
        errors.push("supervisor reviews");
      }

      if (assignmentsResult.status === "fulfilled") {
        setAssignments(
          unwrapList(assignmentsResult.value, [
            "assignments",
            "results",
          ])
        );
      } else {
        errors.push("assignments");
      }

      if (monthlyResult.status === "fulfilled") {
        setMonthlyHistory(
          unwrapList(monthlyResult.value, ["history", "results"])
        );
      } else {
        errors.push("monthly history");
      }

      if (quarterlyResult.status === "fulfilled") {
        setQuarterlyHistory(
          unwrapList(quarterlyResult.value, ["history", "results"])
        );
      } else {
        errors.push("quarterly history");
      }

      if (errors.length) {
        setDataError(
          `Could not load ${errors.join(", ")}. Check the API routes and backend logs.`
        );
      }

      setLoading(false);
      setRefreshing(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  /* ---------- values from the API ---------- */

  const assignmentSummary = summary?.assignments ?? {};
  const timing = summary?.timing ?? {};
  const reviewSummary = summary?.reviews ?? {};

  const totalAssignments =
    toNumber(assignmentSummary.total) ?? assignments.length;

  const completedAssignments =
    toNumber(assignmentSummary.completed) ??
    assignments.filter(isCompleted).length;

  const pendingAssignments =
    toNumber(assignmentSummary.pending) ??
    assignments.filter((assignment) =>
      ["pending", "assigned", "accepted"].includes(
        getAssignmentStatus(assignment)
      )
    ).length;

  /*const inProgressAssignments =
    toNumber(assignmentSummary.inProgress) ??
    assignments.filter((assignment) =>
      [
        "en_route",
        "arrived",
        "in_progress",
        "inspecting",
        "fault_identified",
        "repairing",
        "testing",
      ].includes(getAssignmentStatus(assignment))
    ).length;*/

  const completionRate =
    toNumber(assignmentSummary.completionRate) ??
    (totalAssignments > 0
      ? (completedAssignments / totalAssignments) * 100
      : null);

  const resolutionRate = toNumber(assignmentSummary.resolutionRate);
  const averageResponseMinutes = toNumber(timing.averageResponseMinutes);
  const averageRepairMinutes = toNumber(timing.averageRepairMinutes);

  const overdueAssignments = toNumber(summary?.overdueAssignments);
  const firstTimeRepairRate = toNumber(summary?.firstTimeRepairRate);

  const reviewScores = reviews
    .map(getReviewScore)
    .filter((score) => score !== null);

  const calculatedAverageRating = average(reviewScores);
  const apiAverageRating = toNumber(reviewSummary.averageScore);

  const avgRating =
    apiAverageRating !== null
      ? apiAverageRating
      : calculatedAverageRating;

  //const hasReviews = avgRating !== null;
  const performanceScore =
    avgRating === null
      ? null
      : Math.round(Math.max(0, Math.min(5, avgRating)) * 20);

  const grade = gradeFor(performanceScore);

  //const reviewCount =
    toNumber(reviewSummary.count) ?? reviews.length;

  /*
   * These indicators are not fabricated:
   * only completion rate is available from the current summary endpoint.
   * The other three require actual backend calculations.
   */
  const components = {
    completion: completionRate,
    punctuality: null,
    quality: null,
    safety: null,
  };

  const rows =
    historyTab === "monthly" ? monthlyHistory : quarterlyHistory;

  const orderedMonthlyHistory = [...monthlyHistory].sort(
    (a, b) =>
      new Date(
        a.assessmentDate ?? a.periodKey ?? a.date ?? 0
      ).getTime() -
      new Date(
        b.assessmentDate ?? b.periodKey ?? b.date ?? 0
      ).getTime()
  );

  const chartHistory = orderedMonthlyHistory.slice(-6);

  const months = chartHistory.map((item) => {
    const label = getPeriodLabel(item);

    if (item.period) return item.period;

    const date = new Date(item.assessmentDate ?? item.periodKey ?? item.date);

    return Number.isNaN(date.getTime())
      ? String(label)
      : date.toLocaleDateString("en", { month: "short" });
  });

  const monthly = {
    score: chartHistory.map((item) => toNumber(item.score)).filter((v) => v !== null),
    completed: chartHistory.map((item) => toNumber(item.completed)).filter((v) => v !== null),
  };

  /*
   * The current history API doesn't provide monthly response-time values.
   * Do not use invented response-time data.
   */
  const responseChartData = [];

  const scoredHistory = [...rows];

  const pastResults = assignments
    .filter(isCompleted)
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.assigned_at ?? 0).getTime() -
        new Date(a.completed_at ?? a.assigned_at ?? 0).getTime()
    );

  const delta =
    monthly.score.length >= 2
      ? monthly.score[monthly.score.length - 1] -
        monthly.score[monthly.score.length - 2]
      : null;

  const improving = delta !== null && delta >= 0;

  const comments = reviews.filter(
    (review) =>
      typeof review.comments === "string" &&
      review.comments.trim().length > 0
  );

  const showLoading = loading && !summary && !reviews.length;

  return (
    <div className="p-6">
      {showLoading && (
        <p className="mb-4 text-sm text-slate-500">
          Loading your performance data...
        </p>
      )}

      {refreshing && (
        <p className="mb-4 text-sm text-slate-500">
          Refreshing your performance data...
        </p>
      )}

      {dataError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {dataError}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 font-semibold underline"
          >
            Reload
          </button>
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* 1. Performance overview (original design) */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200">
              <Trophy className="h-4 w-4" /> My performance
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {grade
                ? `Grade ${grade.g}: ${grade.label}`
                : "No grade yet"}
            </h1>

            <p className="mt-3 text-base leading-relaxed text-slate-200">
              {performanceScore !== null
                ? `Your performance score is ${performanceScore}/100, based on your supervisor review scores.`
                : "Your performance score will appear after a supervisor records a scored review."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                {improving ? (
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-300" />
                )}
                {delta === null
                  ? "Not enough history to compare"
                  : `${improving ? "+" : ""}${delta} vs previous period`}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                {avgRating === null
                  ? "No supervisor rating yet"
                  : `${avgRating.toFixed(1)} supervisor rating`}
              </span>
            </div>
          </div>

          <ScoreRing score={performanceScore} grade={grade?.g} />
        </div>
      </section>

      {/*
        Keep the original four-card row.
      */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={ClipboardList}
          tone="slate"
          label="Total assignments received"
          value={totalAssignments}
        />
        <Stat
          icon={CheckCircle2}
          tone="emerald"
          label="Completed assignments"
          value={completedAssignments}
        />
        <Stat
          icon={Hourglass}
          tone="amber"
          label="Pending assignments"
          value={pendingAssignments}
        />
        <Stat
          icon={Target}
          tone="blue"
          label="Fault resolution rate"
          value={resolutionRate === null ? "--" : `${Math.round(resolutionRate)}%`}
          sub="Successfully resolved"
        />
      </div>

      <div className="space-y-6">
        {/* 2. Assignment performance */}
        <section className={card}>
          <SectionTitle
            icon={Wrench}
            tone="violet"
            title="Assignment performance"
            subtitle="How your jobs are going"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: Wrench,
                label: "Faults repaired",
                value: completedAssignments,
              },
              {
                icon: AlertTriangle,
                label: "Overdue assignments",
                value:
                  overdueAssignments === null ? "N/A" : overdueAssignments,
                warn:
                  overdueAssignments !== null && overdueAssignments > 0,
              },
              {
                icon: Clock,
                label: "Avg. response time",
                value: formatMinutes(averageResponseMinutes),
              },
              {
                icon: Timer,
                label: "Avg. repair completion",
                value: formatMinutes(averageRepairMinutes),
              },
              {
                icon: Target,
                label: "First-time repair success",
                value:
                  firstTimeRepairRate === null
                    ? "N/A"
                    : `${Math.round(firstTimeRepairRate)}%`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-slate-50 p-4"
              >
                <item.icon
                  className={`h-5 w-5 ${
                    item.warn ? "text-red-500" : "text-slate-400"
                  }`}
                />
                <p
                  className={`mt-3 text-2xl font-bold ${
                    item.warn ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Performance score */}
        <section className={card}>
          <SectionTitle
            icon={Sparkles}
            tone="indigo"
            title="Performance score"
            subtitle="Average of your supervisor review scores"
            right={
              performanceScore !== null ? (
                <GradeBadge score={performanceScore} />
              ) : null
            }
          />

          <div className="grid items-center gap-8 lg:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Score
              </p>
              <p className="mt-1 text-6xl font-bold text-slate-900">
                {performanceScore === null ? "--" : performanceScore}
              </p>
              <p className="text-xs text-slate-500">out of 100</p>
            </div>

            <div>
              <div className="space-y-5">
                <ScoreBar
                  label="Job completion rate"
                  value={components.completion}
                  icon={CheckCircle2}
                  color="bg-emerald-500"
                />
                <ScoreBar
                  label="Punctuality score"
                  value={components.punctuality}
                  icon={Clock}
                  color="bg-blue-500"
                />
                <ScoreBar
                  label="Repair quality score"
                  value={components.quality}
                  icon={Wrench}
                  color="bg-violet-500"
                />
                <ScoreBar
                  label="Safety compliance score"
                  value={components.safety}
                  icon={ShieldCheck}
                  color="bg-cyan-500"
                />
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Only the completion rate is currently calculated from the
                available summary. Punctuality, repair quality, and safety
                scores require corresponding backend values.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Performance grading */}
        <section className={card}>
          <SectionTitle
            icon={Award}
            tone="amber"
            title="Performance grading"
            subtitle="How scores map to grades"
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {grades.map((item) => {
              const current = grade?.g === item.g;

              return (
                <div
                  key={item.g}
                  className={`relative rounded-2xl border-2 p-4 text-center transition ${
                    current
                      ? `${gradeStyle[item.g].card} shadow-md`
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {current && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      You are here
                    </span>
                  )}

                  <p className={`text-4xl font-bold ${gradeStyle[item.g].text}`}>
                    {item.g}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.range}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Performance trends */}
        <section className={card}>
          <SectionTitle
            icon={BarChart3}
            tone="cyan"
            title="Performance trends"
            subtitle="Last 6 recorded monthly periods"
            right={
              delta === null ? (
                <span className={`${pill} bg-slate-50 text-slate-600 ring-slate-200`}>
                  Not enough history
                </span>
              ) : (
                <span
                  className={`${pill} ${
                    improving
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      : "bg-red-50 text-red-700 ring-red-600/20"
                  }`}
                >
                  {improving ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {improving ? "Improving" : "Declining"} (
                  {delta > 0 ? "+" : ""}
                  {delta} pts)
                </span>
              )
            }
          />

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">
                Monthly performance score
              </h3>
              <LineChart
                id="g-score"
                data={monthly.score}
                labels={months.slice(0, monthly.score.length)}
                color="#2563eb"
                fmt={(value) => `${Math.round(value)}%`}
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">
                Faults completed per month
              </h3>
              <BarChart
                data={monthly.completed}
                labels={months.slice(0, monthly.completed.length)}
                color="#7c3aed"
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">
                Response time{" "}
                <span className="font-normal text-slate-500">
                  (minutes, lower is better)
                </span>
              </h3>
              {responseChartData.length ? (
                <LineChart
                  id="g-resp"
                  data={responseChartData}
                  labels={months.slice(0, responseChartData.length)}
                  color="#0891b2"
                />
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">
                  Monthly response-time history is not provided by the current
                  API. Your overall average is shown above.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 6. Supervisor feedback */}
        <section className={card}>
          <SectionTitle
            icon={MessageSquare}
            tone="rose"
            title="Supervisor feedback"
            subtitle={
              reviews.length
                ? `${reviews.length} recorded review${reviews.length === 1 ? "" : "s"}`
                : "No reviews yet"
            }
            right={
              avgRating !== null ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5">
                  <Stars value={avgRating} />
                  <span className="text-sm font-bold text-slate-900">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">/ 5</span>
                </div>
              ) : null
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Comments on reviewed jobs
              </h3>

              {!comments.length && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Supervisor comments will appear here when they are saved
                  with a performance review.
                </p>
              )}

              {comments.map((review, index) => (
                <article
                  key={review.review_id ?? review.id ?? index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Assignment #{review.assignment_id ?? "--"}
                      </span>
                      {getReviewScore(review) !== null && (
                        <>
                          <Stars value={getReviewScore(review)} />
                          <span className="text-xs font-semibold text-slate-600">
                            {Number(getReviewScore(review)).toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {review.comments}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {review.reviewer_name ?? "Supervisor"}
                  </p>
                </article>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <ThumbsUp className="h-4 w-4" /> Strengths
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-emerald-900">
                  {comments.length
                    ? "Review comments are shown on the left. Specific strengths will appear here when your backend stores structured positive feedback."
                    : "No recorded strengths yet. They will appear here when a supervisor records feedback."}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Lightbulb className="h-4 w-4" /> Areas for improvement
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-amber-900">
                  Your backend currently stores general comments rather than
                  separate improvement items. Specific improvement points
                  require structured feedback fields or a separate analysis
                  step.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Performance history */}
        <section className={card}>
          <SectionTitle
            icon={HistoryIcon}
            tone="slate"
            title="Performance history"
            subtitle="Previous assessments and assignment results"
            right={
              <div className="inline-flex rounded-xl bg-slate-200/70 p-1">
                {[
                  ["monthly", "Monthly"],
                  ["quarterly", "Quarterly"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryTab(key)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                      historyTab === key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          />

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Assessment date</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Jobs completed</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {scoredHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No {historyTab} performance history is available yet.
                    </td>
                  </tr>
                ) : (
                  scoredHistory.map((item, index) => {
                    const score = toNumber(item.score);
                    const periodLabel = getPeriodLabel(item);

                    return (
                      <tr
                        key={item.id ?? item.periodKey ?? `${periodLabel}-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(
                            item.assessmentDate ?? item.date ?? item.periodKey
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.period ?? periodLabel}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 font-bold text-slate-900">
                              {score === null ? "--" : Math.round(score)}
                            </span>
                            <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-100 sm:block">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{
                                  width: `${Math.max(0, Math.min(100, score ?? 0))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <GradeBadge score={score} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.completed ?? "--"} of {item.total ?? "--"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <h3 className="mb-3 mt-8 text-sm font-semibold text-slate-800">
            Past assignment results
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Fault</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Repair time</th>
                  <th className="px-4 py-3">Deadline</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pastResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No completed assignments have been returned for your account.
                    </td>
                  </tr>
                ) : (
                  pastResults.map((assignment, index) => {
                    const started = assignment.started_at
                      ? new Date(assignment.started_at)
                      : null;
                    const completed = assignment.completed_at
                      ? new Date(assignment.completed_at)
                      : null;

                    const validTimes =
                      started &&
                      completed &&
                      !Number.isNaN(started.getTime()) &&
                      !Number.isNaN(completed.getTime()) &&
                      completed >= started;

                    const repairMinutes = validTimes
                      ? (completed - started) / 60000
                      : null;

                    return (
                      <tr
                        key={
                          assignment.assignment_id ??
                          assignment.id ??
                          index
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(assignment.completed_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {assignment.assignment_id ?? assignment.id ?? "--"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {assignment.fault_id ?? assignment.faultId ?? "--"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}
                          >
                            {assignment.fault_status === "resolved"
                              ? "Resolved"
                              : "Completed"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatMinutes(repairMinutes)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                          Not available
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
