import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Trophy,
  Clock,
  Search,
  RefreshCw,
  X,
  MapPin,
  Wrench,
  ShieldCheck,
  Award,
  Briefcase,
  Activity,
  AlertTriangle,
  Lock,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { apiRequest } from "../services/api";

/* -------------------- CONFIG -------------------- */

// Real backend endpoints (relative to your API base, e.g. /api/v1).
const ENDPOINTS = {
  faults: "/faults",
  ranking: (faultId) =>
    faultId
      ? `/assignments/engineer-ranking?faultId=${faultId}`
      : "/assignments/engineer-ranking",
  assign: (faultId) => `/assignments/faults/${faultId}/assign`,
};

const FACTOR_META = {
  specialization: { label: "Specialization", purpose: "Match the engineer's specialization to the type of fault." },
  distance: { label: "Distance", purpose: "Prefer an engineer closer to the fault (needs a shared GPS location)." },
  performance: { label: "Performance", purpose: "Average review rating. Engineers with no reviews yet score neutral." },
  experience: { label: "Experience", purpose: "Years of experience, with 15 or more years counting as full marks." },
};

// Used for the criteria table until the server tells us the weights.
const DEFAULT_WEIGHTS = {
  specialization: 0.35,
  distance: 0.3,
  performance: 0.2,
  experience: 0.15,
};

const AVAILABILITY_STYLES = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  busy: "bg-amber-50 text-amber-700 ring-amber-600/20",
  offline: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const PAGE_SIZE = 10;

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/* -------------------- HELPERS -------------------- */

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readable(value) {
  return capitalize(String(value || "").replace(/_/g, " "));
}

const faultCode = (id) => `FLT-${String(id).padStart(3, "0")}`;
const engineerCode = (id) => `ENG-${String(id).padStart(3, "0")}`;

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isEligible(engineer) {
  return engineer.eligible;
}

// Converts one engineer from the ranking API into what this page shows.
function mapEngineer(engineer, weights) {
  const factors = Object.keys(engineer.score_breakdown || {}).map((key) => ({
    key,
    score: engineer.score_breakdown[key],
    weight: Math.round((weights[key] || 0) * 100),
  }));

  return {
    id: engineer.id,
    rank: engineer.rank,
    code: engineerCode(engineer.id),
    name: engineer.name,
    email: engineer.email,
    phone: engineer.phone,
    specialty: capitalize(engineer.specialization),
    distanceKm: toNumberOrNull(engineer.distance_km),
    availability: engineer.availability,
    score: Number(engineer.match_score) || 0,
    rating: toNumberOrNull(engineer.performance_rating) || 0,
    experienceYears: Number(engineer.experience_years) || 0,
    completedJobs: Number(engineer.completed_jobs) || 0,
    eligible: Boolean(engineer.is_eligible),
    reason: engineer.ineligible_reason,
    factors,
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

function FactorBars({ factors }) {
  return (
    <ul className="space-y-4">
      {(factors || []).map((factor) => {
        const meta = FACTOR_META[factor.key] || { label: factor.key, purpose: "" };
        const score = Math.max(0, Math.min(100, Number(factor.score) || 0));

        return (
          <li key={factor.key}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-900">
                {meta.label}
                {factor.weight != null && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    weight {factor.weight}%
                  </span>
                )}
              </span>
              <span className="text-slate-700">{Math.round(score)}%</span>
            </div>

            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200">
              <div
                className={`h-1.5 rounded-full ${score === 0 ? "bg-slate-300" : "bg-blue-600"}`}
                style={{ width: `${score}%` }}
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">{meta.purpose}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function EngineerRanking() {
  const [faults, setFaults] = useState([]);
  const [faultsError, setFaultsError] = useState("");
  const [engineers, setEngineers] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");

  const [faultId, setFaultId] = useState("");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("rank");
  const [page, setPage] = useState(1);

  const [panel, setPanel] = useState(null); // { engineer, mode: "details" | "explain" }
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedFault = faults.find((fault) => String(fault.id) === String(faultId)) || null;

  /* Fetch the ranking (for the chosen fault, if any) and the pending faults. */
  const fetchAll = useCallback(async (forFaultId) => {
    const [rankingResult, faultsResult] = await Promise.allSettled([
      apiRequest(ENDPOINTS.ranking(forFaultId)),
      apiRequest(ENDPOINTS.faults),
    ]);

    if (rankingResult.status === "rejected") throw rankingResult.reason;

    const data = rankingResult.value.data || {};
    const usedWeights = data.weights || DEFAULT_WEIGHTS;

    let pendingFaults = [];
    let faultsProblem = "";

    if (faultsResult.status === "fulfilled") {
      const list = faultsResult.value.data?.faults;
      pendingFaults = (Array.isArray(list) ? list : [])
        .filter((fault) => fault.status === "pending")
        .map((fault) => ({
          id: fault.id,
          code: faultCode(fault.id),
          type: readable(fault.fault_type),
          location: fault.site_name || "Unknown site",
        }));
    } else {
      faultsProblem = faultsResult.reason?.message || "Could not load the pending faults.";
    }

    return {
      weights: usedWeights,
      engineers: (Array.isArray(data.engineers) ? data.engineers : []).map((engineer) =>
        mapEngineer(engineer, usedWeights)
      ),
      faults: pendingFaults,
      faultsProblem,
    };
  }, []);

  const applyAll = useCallback((data) => {
    setWeights(data.weights);
    setEngineers(data.engineers);
    setFaults(data.faults);
    setFaultsError(data.faultsProblem);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchAll("")
      .then((data) => {
        if (!cancelled) applyAll(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load the engineer ranking.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAll, applyAll]);

  /* Recalculate: ask the backend to rank again (also used when the fault changes). */
  async function recalculate(forFaultId = faultId) {
    try {
      setRecalculating(true);
      setError("");
      applyAll(await fetchAll(forFaultId));
      setPage(1);
    } catch (err) {
      setError(err.message || "Unable to recalculate the ranking.");
    } finally {
      setRecalculating(false);
    }
  }

  function changeFault(value) {
    setFaultId(value);
    setMessage(null);
    recalculate(value);
  }

  /* Filter, then sort. Rank comes from the backend. */
  const specialties = useMemo(
    () => [...new Set(engineers.map((engineer) => engineer.specialty).filter(Boolean))],
    [engineers]
  );

  const summary = useMemo(
    () => ({
      totalRanked: engineers.length,
      available: engineers.filter((engineer) => engineer.availability === "available").length,
      topEngineer: engineers.find(isEligible)?.name ?? null,
    }),
    [engineers]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = engineers.filter((engineer) => {
      if (
        term &&
        !String(engineer.name).toLowerCase().includes(term) &&
        !String(engineer.code).toLowerCase().includes(term)
      ) {
        return false;
      }
      if (specialty !== "all" && engineer.specialty !== specialty) return false;
      if (availability !== "all" && engineer.availability !== availability) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "distance") {
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      }
      if (sortBy === "score") return b.score - a.score;
      return a.rank - b.rank;
    });
  }, [engineers, search, specialty, availability, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* Assign: the backend still rejects busy engineers and double assignments. */
  async function assign(engineer) {
    if (!selectedFault) return;

    try {
      setAssigning(true);
      setMessage(null);

      await apiRequest(ENDPOINTS.assign(selectedFault.id), {
        method: "POST",
        body: JSON.stringify({ engineerId: engineer.id }),
      });

      setMessage({
        type: "success",
        text: `${selectedFault.code} assigned to ${engineer.name}.`,
      });
      setPanel(null);
      setFaultId("");
      await recalculate("");
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Unable to assign this engineer." });
    } finally {
      setAssigning(false);
    }
  }

  const panelEngineer = panel?.engineer;
  const canAssign = (engineer) => !!selectedFault && isEligible(engineer);

  function assignTooltip(engineer) {
    if (!selectedFault) return "Select a fault first";
    if (!isEligible(engineer)) return engineer.reason || "This engineer cannot be assigned";
    return "";
  }

  function panelAssignLabel() {
    if (assigning) return "Assigning...";
    if (selectedFault) return `Assign to ${selectedFault.code}`;
    return "Select a fault to assign";
  }

  const criteria = Object.keys(weights);

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-slate-900">Engineer Ranking</h1>
            <p className="mt-1 text-sm text-slate-500">
              See how engineers are ranked for the next fault assignment, and why.
            </p>
          </div>

          <button
            type="button"
            onClick={() => recalculate()}
            disabled={loading || recalculating}
            className={btnPrimary}
          >
            <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Recalculate ranking</span>
          </button>
        </div>

        {loading && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading engineer ranking...
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Something went wrong.</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {message && (
          <div
            className={`mb-4 rounded-xl border p-4 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} tone="bg-blue-50 text-blue-600" label="Total engineers ranked" sub="Engineers evaluated">
            {summary.totalRanked}
          </StatCard>

          <StatCard icon={UserCheck} tone="bg-emerald-50 text-emerald-600" label="Available engineers" sub="Ready for assignment">
            {summary.available}
          </StatCard>

          <StatCard icon={Trophy} tone="bg-violet-50 text-violet-600" label="Top-ranked engineer" sub="Highest eligible rank">
            <span className="text-2xl">{summary.topEngineer ?? "N/A"}</span>
          </StatCard>

          <StatCard icon={Clock} tone="bg-amber-50 text-amber-600" label="Pending assignments" sub="Faults awaiting assignment">
            {faults.length}
          </StatCard>
        </div>

        {/* Search and filters */}
        <section className={`${card} mb-6`}>
          <CardTitle icon={Search} tone="bg-blue-50 text-blue-600">
            Search and filters
          </CardTitle>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Search by name or ID
              </label>
              <input
                type="search"
                className={field}
                placeholder="e.g. kelechi or ENG-001"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Specialization
              </label>
              <select
                className={field}
                value={specialty}
                onChange={(event) => {
                  setSpecialty(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All specializations</option>
                {specialties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Availability
              </label>
              <select
                className={field}
                value={availability}
                onChange={(event) => {
                  setAvailability(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Sort by
              </label>
              <select
                className={field}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="rank">Rank</option>
                <option value="distance">Distance</option>
                <option value="score">Match score</option>
              </select>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Rank for a fault
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={`${field} sm:max-w-md`}
                value={faultId}
                onChange={(event) => changeFault(event.target.value)}
              >
                <option value="">No fault selected (general ranking)</option>
                {faults.map((fault) => (
                  <option key={fault.id} value={fault.id}>
                    {fault.code} · {fault.type} · {fault.location}
                  </option>
                ))}
              </select>

              {selectedFault ? (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Distance and specialization are scored against {selectedFault.location}.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Select a fault to enable assignment.
                </p>
              )}
            </div>
            {faultsError && (
              <p className="mt-2 text-xs text-red-700">{faultsError}</p>
            )}
          </div>
        </section>

        {/* Ranking table */}
        <section className={`${card} mb-6`}>
          <CardTitle
            icon={Trophy}
            tone="bg-violet-50 text-violet-600"
            right={
              <span className="text-xs text-slate-400">
                {visible.length} engineer{visible.length === 1 ? "" : "s"}
              </span>
            }
          >
            Engineer ranking
          </CardTitle>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              {engineers.length === 0
                ? "No engineers have been registered yet."
                : "No engineers match your search and filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">Rank</th>
                    <th className="py-2 pr-3 font-medium">Engineer</th>
                    <th className="py-2 pr-3 font-medium">Specialty</th>
                    <th className="py-2 pr-3 font-medium">Distance</th>
                    <th className="py-2 pr-3 font-medium">Availability</th>
                    <th className="py-2 pr-3 font-medium">Match score</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((engineer) => (
                    <tr
                      key={engineer.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-3 pr-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                            engineer.rank === 1 && isEligible(engineer)
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {engineer.rank}
                        </span>
                      </td>

                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-900">{engineer.name}</p>
                        <p className="font-mono text-xs text-slate-400">{engineer.code}</p>
                      </td>

                      <td className="py-3 pr-3 text-slate-700">{engineer.specialty}</td>

                      <td className="py-3 pr-3 text-slate-700">
                        {engineer.distanceKm == null ? "Not available" : `${engineer.distanceKm} km`}
                      </td>

                      <td className="py-3 pr-3">
                        <span
                          className={`${pill} ${
                            AVAILABILITY_STYLES[engineer.availability] ||
                            AVAILABILITY_STYLES.offline
                          }`}
                        >
                          {capitalize(engineer.availability)}
                        </span>
                        {engineer.reason && (
                          <p className="mt-1 text-xs text-slate-400">{engineer.reason}</p>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-slate-900">{Math.round(engineer.score)}%</span>
                          <div className="h-1.5 w-20 rounded-full bg-slate-200">
                            <div
                              className="h-1.5 rounded-full bg-blue-600"
                              style={{ width: `${Math.max(0, Math.min(100, engineer.score))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPanel({ engineer, mode: "details" })}
                            className={btnOutline}
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => setPanel({ engineer, mode: "explain" })}
                            className={btnOutline}
                          >
                            Why this rank
                          </button>
                          <button
                            type="button"
                            onClick={() => assign(engineer)}
                            disabled={!canAssign(engineer) || assigning}
                            title={assignTooltip(engineer)}
                            className={btnPrimary}
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnOutline}
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={btnOutline}
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Ranking criteria */}
        <section className={card}>
          <CardTitle icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600">
            How engineers are ranked
          </CardTitle>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">Factor</th>
                  <th className="py-2 pr-3 font-medium">Weight</th>
                  <th className="py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((key) => (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3 font-medium text-slate-900">
                      {FACTOR_META[key]?.label || key}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {Math.round((weights[key] || 0) * 100)}%
                    </td>
                    <td className="py-3 text-slate-600">{FACTOR_META[key]?.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!selectedFault && (
            <p className="mt-3 text-xs text-slate-500">
              No fault is selected, so this is a general ranking by rating and
              experience. Select a fault to also score specialization and distance.
            </p>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            A busy or offline engineer is never selected just because they are
            nearby. Only available engineers can be assigned.
          </div>
        </section>
      </div>

      {/* Details / explanation panel */}
      {panelEngineer && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
            className="fixed inset-0 z-40 bg-slate-900/40"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <p className="text-lg font-medium text-slate-900">{panelEngineer.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-mono">{panelEngineer.code}</span>
                  {" · "}Rank {panelEngineer.rank}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close panel"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 px-5 py-3">
              {[
                ["details", "Details"],
                ["explain", "Ranking explanation"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPanel({ engineer: panelEngineer, mode })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    panel.mode === mode
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {panel.mode === "details" ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Experience</p>
                      <p className="text-lg font-medium text-slate-900">
                        {panelEngineer.experienceYears} yrs
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Activity className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Completed jobs</p>
                      <p className="text-lg font-medium text-slate-900">
                        {panelEngineer.completedJobs}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Award className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Average rating</p>
                      <p className="text-lg font-medium text-slate-900">
                        {panelEngineer.rating > 0
                          ? `${panelEngineer.rating.toFixed(2)}/5`
                          : "Not reviewed"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Wrench className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Specialty</p>
                      <p className="text-sm font-medium text-slate-900">{panelEngineer.specialty}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-medium text-slate-900">Contact</h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {panelEngineer.email || "No email on record"}
                      </li>
                      <li className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {panelEngineer.phone || "No phone number on record"}
                      </li>
                      <li className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {panelEngineer.distanceKm == null
                          ? "No distance available (location not shared or no fault selected)"
                          : `${panelEngineer.distanceKm} km from the selected fault`}
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {!isEligible(panelEngineer) && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        {panelEngineer.reason || "This engineer is not eligible"}, so
                        they cannot be assigned even if they score well on other
                        factors.
                      </p>
                    </div>
                  )}

                  <FactorBars factors={panelEngineer.factors} />
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => assign(panelEngineer)}
                disabled={!canAssign(panelEngineer) || assigning}
                className={`${btnPrimary} w-full`}
              >
                {panelAssignLabel()}
              </button>

              {selectedFault && !isEligible(panelEngineer) && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  {panelEngineer.reason || "This engineer cannot be assigned."}
                </p>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}