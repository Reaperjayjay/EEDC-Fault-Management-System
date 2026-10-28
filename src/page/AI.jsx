import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Lock,
  UserCheck,
  Route,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { apiRequest } from "../services/api";

/* -------------------- CONFIG -------------------- */

// Real backend endpoints (relative to your API base, e.g. /api/v1).
const ENDPOINTS = {
  faults: "/faults",
  assignments: "/assignments",
  engineers: "/engineers",
  suggested: (faultId) => `/assignments/faults/${faultId}/suggested-engineers`,
  assign: (faultId) => `/assignments/faults/${faultId}/assign`,
};

const AUTO_ASSIGN_KEY = "aiAutoAssignEnabled";

const SEVERITY_STYLES = {
  Low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const ACCEPTANCE_STYLES = {
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  declined: "bg-red-50 text-red-700 ring-red-600/20",
};

const PROCESS = [
  { icon: AlertTriangle, title: "Fault reported", text: "A fault record is created." },
  { icon: ShieldCheck, title: "Eligibility check", text: "Only available engineers with a matching specialization." },
  { icon: Target, title: "Candidates ranked", text: "Scored on specialization, distance, rating and experience." },
  { icon: UserCheck, title: "Best engineer assigned", text: "Saved to the backend and the engineer becomes busy." },
];

const BREAKDOWN_LABELS = [
  { key: "specialization", label: "Specialization", weight: "35%" },
  { key: "distance", label: "Distance", weight: "30%" },
  { key: "performance", label: "Rating", weight: "20%" },
  { key: "experience", label: "Experience", weight: "15%" },
];

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/* -------------------- HELPERS -------------------- */

function formatDateTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readable(value) {
  return capitalize(String(value || "").replace(/_/g, " "));
}

const faultCode = (id) => `FLT-${String(id).padStart(3, "0")}`;

// Pulls an array out of { data: { <key>: [...] } } (or { data: [...] }).
function toList(response, key) {
  const data = response?.data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data)) return data;
  return [];
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Converts one engineer from the suggested-engineers API into what this page shows.
function mapCandidate(engineer) {
  return {
    id: engineer.id,
    name: engineer.name,
    specialization: capitalize(engineer.specialization),
    distanceKm: toNumberOrNull(engineer.distance_km),
    score: Number(engineer.match_score) || 0,
    breakdown: engineer.score_breakdown || {},
    rating: toNumberOrNull(engineer.performance_rating) || 0,
    experienceYears: Number(engineer.experience_years) || 0,
  };
}

// Plain-language reasons built from the real score breakdown.
function buildReasons(engineer) {
  const reasons = [];
  const { specialization } = engineer.breakdown;

  if (specialization >= 100) {
    reasons.push("Specialization is the best match for this fault type.");
  } else if (specialization > 0) {
    reasons.push("Specialization is an acceptable alternative for this fault type.");
  }

  reasons.push("Engineer is currently available.");

  if (engineer.distanceKm !== null) {
    reasons.push(`Engineer is ${engineer.distanceKm} km from the fault.`);
  } else {
    reasons.push("Engineer has not shared a GPS location, so distance is scored below average.");
  }

  if (engineer.rating > 0) {
    reasons.push(`Average performance rating is ${engineer.rating.toFixed(2)} out of 5.`);
  } else {
    reasons.push("No performance reviews yet, so the rating is scored as neutral.");
  }

  reasons.push(
    `${engineer.experienceYears} ${engineer.experienceYears === 1 ? "year" : "years"} of experience.`
  );

  return reasons;
}

// Acceptance badge derived from the assignment status.
function acceptanceOf(status) {
  if (status === "assigned") return "pending";
  if (status === "rejected" || status === "cancelled") return "declined";
  return "accepted";
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

function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ControlRow({ icon: Icon, title, text, right }) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{text}</p>
        </div>
      </div>
      {right}
    </li>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function AIAutoAssignment() {
  const [summary, setSummary] = useState(null);
  // Saved in this browser only: there is no settings endpoint on the backend.
  const [autoAssign, setAutoAssign] = useState(
    () => localStorage.getItem(AUTO_ASSIGN_KEY) === "true"
  );
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedFault, setSelectedFault] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [neededSpecs, setNeededSpecs] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [rankingError, setRankingError] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [autoAssigningId, setAutoAssigningId] = useState(null);
  const [assignMessage, setAssignMessage] = useState(null);

  /* Load the page: pending faults, assignment history and summary numbers. */
  const fetchAll = useCallback(async () => {
    const [faultsResult, assignmentsResult, engineersResult] =
      await Promise.allSettled([
        apiRequest(ENDPOINTS.faults),
        apiRequest(ENDPOINTS.assignments),
        apiRequest(ENDPOINTS.engineers),
      ]);

    if (faultsResult.status === "rejected") throw faultsResult.reason;
    if (assignmentsResult.status === "rejected") throw assignmentsResult.reason;

    const faults = toList(faultsResult.value, "faults");
    const assignments = toList(assignmentsResult.value, "assignments");
    // The engineer list is only used for one count, so the page still loads without it.
    const engineers =
      engineersResult.status === "fulfilled"
        ? toList(engineersResult.value, "engineers")
        : null;

    const pendingFaults = faults
      .filter((fault) => fault.status === "pending")
      .sort(
        (a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
          b.id - a.id
      );

    const today = new Date().toDateString();
    const notDeclined = assignments.filter(
      (item) => !["rejected", "cancelled"].includes(item.status)
    ).length;

    return {
      pending: pendingFaults,
      history: assignments.slice(0, 20),
      summary: {
        pending: pendingFaults.length,
        assignedToday: assignments.filter(
          (item) => new Date(item.assigned_at).toDateString() === today
        ).length,
        availableEngineers: engineers
          ? engineers.filter((engineer) => engineer.availability === "available").length
          : null,
        successRate: assignments.length
          ? Math.round((notDeclined / assignments.length) * 100)
          : null,
      },
    };
  }, []);

  const applyAll = useCallback((data) => {
    setSummary(data.summary);
    setPending(data.pending);
    setHistory(data.history);
  }, []);

  const reload = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");
        applyAll(await fetchAll());
      } catch (err) {
        setError(err.message || "Unable to load AI auto assignment data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAll, applyAll]
  );

  useEffect(() => {
    let cancelled = false;

    fetchAll()
      .then((data) => {
        if (!cancelled) applyAll(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to load AI auto assignment data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAll, applyAll]);

  /* Ask the backend to rank the eligible engineers for one fault. */
  async function evaluate(fault) {
    setSelectedFault(fault);
    setCandidates([]);
    setNeededSpecs([]);
    setRankingError("");
    setAssignMessage(null);
    setEvaluating(true);

    try {
      const response = await apiRequest(ENDPOINTS.suggested(fault.id));
      const list = Array.isArray(response.data?.engineers)
        ? response.data.engineers.map(mapCandidate)
        : [];

      setNeededSpecs(response.data?.matchingSpecializations || []);
      setCandidates([...list].sort((a, b) => b.score - a.score));
    } catch (err) {
      setRankingError(err.message || "Unable to rank engineers for this fault.");
    } finally {
      setEvaluating(false);
    }
  }

  /* Assign a chosen engineer. The backend rejects busy engineers and double assignments. */
  async function assign(engineer) {
    if (!selectedFault) return;

    try {
      setAssigningId(engineer.id);
      setAssignMessage(null);

      await apiRequest(ENDPOINTS.assign(selectedFault.id), {
        method: "POST",
        body: JSON.stringify({ engineerId: engineer.id }),
      });

      setAssignMessage({
        type: "success",
        text: `${faultCode(selectedFault.id)} assigned to ${engineer.name}.`,
      });
      setSelectedFault(null);
      setCandidates([]);
      await reload(true);
    } catch (err) {
      setAssignMessage({
        type: "error",
        text: err.message || "Unable to assign this engineer.",
      });
    } finally {
      setAssigningId(null);
    }
  }

  /* Auto-assign: the server picks the highest-scoring available engineer. */
  async function autoAssignFault(fault) {
    try {
      setAutoAssigningId(fault.id);
      setAssignMessage(null);

      const response = await apiRequest(ENDPOINTS.assign(fault.id), {
        method: "POST",
        body: JSON.stringify({}),
      });
      const engineerName =
        response.data?.assignment?.engineer_name || "the best available engineer";

      setAssignMessage({
        type: "success",
        text: `${faultCode(fault.id)} was automatically assigned to ${engineerName}.`,
      });
      if (selectedFault?.id === fault.id) {
        setSelectedFault(null);
        setCandidates([]);
      }
      await reload(true);
    } catch (err) {
      setAssignMessage({
        type: "error",
        text: err.message || "Unable to auto-assign this fault.",
      });
    } finally {
      setAutoAssigningId(null);
    }
  }

  function updateAutoAssign(value) {
    setAutoAssign(value);
    localStorage.setItem(AUTO_ASSIGN_KEY, String(value));
  }

  const topCandidate = candidates[0];
  const noEligibleEngineer =
    selectedFault && !evaluating && !rankingError && candidates.length === 0;

  return (
    <div className="min-w-0">
      <div className="min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div>
                <h1 className="text-2xl font-medium text-slate-900">
                  AI Auto Assignment
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  See how engineers are evaluated and matched to reported faults.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => reload(true)}
              disabled={loading || refreshing}
              className={btnOutline}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {loading && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading assignment data...
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Something went wrong.</p>
              <p className="mt-1">{error}</p>
              <button type="button" onClick={() => reload()} className="mt-3 underline">
                Try again
              </button>
            </div>
          )}

          {assignMessage && !selectedFault && (
            <div
              className={`mb-4 rounded-xl border p-3 text-sm ${
                assignMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {assignMessage.text}
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Clock}
              tone="bg-amber-50 text-amber-600"
              label="Pending assignments"
              sub="Faults waiting for an engineer"
            >
              {summary?.pending ?? pending.length}
            </StatCard>

            <StatCard
              icon={Bot}
              tone="bg-blue-50 text-blue-600"
              label="Assigned today"
              sub="Assignments made since midnight"
            >
              {summary?.assignedToday ?? 0}
            </StatCard>

            <StatCard
              icon={Users}
              tone="bg-emerald-50 text-emerald-600"
              label="Available engineers"
              sub="Active and not on a job"
            >
              {summary?.availableEngineers ?? "N/A"}
            </StatCard>

            <StatCard
              icon={Target}
              tone="bg-violet-50 text-violet-600"
              label="Assignment success rate"
              sub="Not declined or cancelled"
            >
              {summary?.successRate == null ? "N/A" : `${summary.successRate}%`}
            </StatCard>
          </div>

          {/* How it works */}
          <section className={`${card} mb-6`}>
            <CardTitle icon={Route} tone="bg-blue-50 text-blue-600">
              How an assignment is made
            </CardTitle>

            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {PROCESS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Controls */}
          <section id="settings" className={`${card} mb-6`}>
            <CardTitle icon={Zap} tone="bg-violet-50 text-violet-600">
              Automatic assignment controls
            </CardTitle>

            <ul className="grid gap-3 xl:grid-cols-3">
              <ControlRow
                icon={Bot}
                title="AI auto assignment"
                text="Shows an Auto-assign button on each pending fault. The server picks the highest-scoring available engineer. This switch is saved in this browser."
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <Toggle
                      checked={autoAssign}
                      onChange={updateAutoAssign}
                      label="AI auto assignment"
                    />
                    <span className="text-xs text-slate-500">
                      {autoAssign ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                }
              />

              <ControlRow
                icon={MapPin}
                title="GPS-based selection"
                text="Distance counts for 30% of the score whenever an engineer shares a live location."
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
                      <Lock className="mr-1 h-3 w-3" />
                      Always on
                    </span>
                  </div>
                }
              />

              <ControlRow
                icon={ShieldCheck}
                title="Eligibility checks"
                text="Only available engineers with a matching specialization are ever suggested."
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
                      <Lock className="mr-1 h-3 w-3" />
                      Always on
                    </span>
                  </div>
                }
              />
            </ul>
          </section>

          {/* Pending faults and ranking */}
          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <section id="pending" className={card}>
              <CardTitle icon={AlertTriangle} tone="bg-red-50 text-red-600">
                Pending faults for assignment
              </CardTitle>

              {pending.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Every reported fault has an engineer assigned.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2 pr-3 font-medium">Fault ID</th>
                        <th className="py-2 pr-3 font-medium">Location</th>
                        <th className="py-2 pr-3 font-medium">Severity</th>
                        <th className="py-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((fault) => {
                        const active = selectedFault?.id === fault.id;

                        return (
                          <tr
                            key={fault.id}
                            className={`border-b border-slate-100 last:border-0 ${
                              active ? "bg-blue-50/50" : ""
                            }`}
                          >
                            <td className="py-3 pr-3 font-mono text-xs text-slate-700">
                              {faultCode(fault.id)}
                            </td>
                            <td className="py-3 pr-3 text-slate-700">
                              {fault.site_name || "Unknown site"}
                              <p className="mt-0.5 text-xs text-slate-400">
                                {readable(fault.fault_type)}
                              </p>
                            </td>
                            <td className="py-3 pr-3">
                              <span
                                className={`${pill} ${
                                  SEVERITY_STYLES[capitalize(fault.severity)] ||
                                  SEVERITY_STYLES.Medium
                                }`}
                              >
                                {capitalize(fault.severity)}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => evaluate(fault)}
                                  disabled={evaluating}
                                  className={active ? btnPrimary : btnOutline}
                                >
                                  {active && evaluating ? "Evaluating..." : "Evaluate"}
                                </button>
                                {autoAssign && (
                                  <button
                                    type="button"
                                    onClick={() => autoAssignFault(fault)}
                                    disabled={autoAssigningId !== null}
                                    className={btnOutline}
                                  >
                                    {autoAssigningId === fault.id
                                      ? "Assigning..."
                                      : "Auto-assign"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section id="ranking" className={card}>
              <CardTitle
                icon={Star}
                tone="bg-amber-50 text-amber-600"
                right={
                  selectedFault && (
                    <span className="font-mono text-xs text-slate-500">
                      {faultCode(selectedFault.id)}
                    </span>
                  )
                }
              >
                AI engineer ranking
              </CardTitle>

              {assignMessage && selectedFault && (
                <div
                  className={`mb-4 rounded-xl border p-3 text-sm ${
                    assignMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {assignMessage.text}
                </div>
              )}

              {!selectedFault && (
                <p className="text-sm text-slate-500">
                  Choose Evaluate on a pending fault to see eligible engineers
                  ranked by suitability.
                </p>
              )}

              {evaluating && (
                <p className="text-sm text-slate-500">Ranking eligible engineers...</p>
              )}

              {rankingError && <p className="text-sm text-red-700">{rankingError}</p>}

              {noEligibleEngineer && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    No eligible engineer found
                  </p>
                  <p className="mt-1">
                    {faultCode(selectedFault.id)} needs an available engineer with
                    one of these specializations:{" "}
                    {neededSpecs.length ? neededSpecs.join(", ") : "a matching one"}.
                    Wait for one to become available or assign manually.
                  </p>
                </div>
              )}

              {candidates.length > 0 && (
                <>
                  <p className="mb-3 text-xs text-slate-400">
                    Score = specialization 35%, distance 30%, rating 20%, experience 15%.
                  </p>

                  <ul className="space-y-3">
                    {candidates.map((engineer, index) => (
                      <li
                        key={engineer.id}
                        className={`rounded-xl border p-4 ${
                          index === 0
                            ? "border-blue-300 bg-blue-50/40"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                                index === 0
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {engineer.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {engineer.specialization}
                                {engineer.distanceKm !== null &&
                                  ` · ${engineer.distanceKm} km away`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-medium text-slate-900">
                              {Math.round(engineer.score)}%
                            </p>
                            <p className="text-xs text-slate-400">Match score</p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200">
                          <div
                            className={`h-1.5 rounded-full ${
                              index === 0 ? "bg-blue-600" : "bg-slate-400"
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, engineer.score))}%` }}
                          />
                        </div>

                        <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                          {BREAKDOWN_LABELS.map(({ key, label, weight }) => (
                            <div key={key} className="rounded-lg bg-slate-50 px-1 py-1.5">
                              <dt className="text-[11px] text-slate-500">{label}</dt>
                              <dd className="text-sm font-medium text-slate-900">
                                {Math.round(engineer.breakdown[key] ?? 0)}
                              </dd>
                              <p className="text-[11px] text-slate-400">{weight}</p>
                            </div>
                          ))}
                        </dl>

                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => assign(engineer)}
                            disabled={assigningId !== null}
                            className={index === 0 ? btnPrimary : btnOutline}
                          >
                            {assigningId === engineer.id
                              ? "Assigning..."
                              : `Assign ${engineer.name}`}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>

          {/* Decision explanation */}
          <section className={`${card} mb-6`}>
            <CardTitle icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600">
              AI decision explanation
            </CardTitle>

            {!topCandidate ? (
              <p className="text-sm text-slate-500">
                Evaluate a fault to see why the top engineer was selected.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  Why <span className="font-medium text-slate-900">{topCandidate.name}</span>{" "}
                  ranks first for {faultCode(selectedFault.id)}:
                </p>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {buildReasons(topCandidate).map((reason) => (
                    <li
                      key={reason}
                      className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* History */}
          <section id="history" className={card}>
            <CardTitle icon={Wrench} tone="bg-blue-50 text-blue-600">
              Assignment history and monitoring
            </CardTitle>

            {history.length === 0 ? (
              <p className="text-sm text-slate-500">
                No assignments have been recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-3 font-medium">Fault</th>
                      <th className="py-2 pr-3 font-medium">Engineer</th>
                      <th className="py-2 pr-3 font-medium">Assigned</th>
                      <th className="py-2 pr-3 font-medium">Acceptance</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => {
                      const acceptance = acceptanceOf(row.status);

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-slate-100 align-top last:border-0"
                        >
                          <td className="py-3 pr-3 font-mono text-xs text-slate-700">
                            {faultCode(row.fault_id)}
                            <p className="mt-0.5 font-sans text-xs text-slate-400">
                              {readable(row.fault_type)}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-slate-700">{row.engineer_name}</td>
                          <td className="py-3 pr-3 text-xs text-slate-500">
                            {formatDateTime(row.assigned_at)}
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className={`${pill} ${
                                ACCEPTANCE_STYLES[acceptance] ||
                                ACCEPTANCE_STYLES.pending
                              }`}
                            >
                              {capitalize(acceptance)}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700">{readable(row.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}