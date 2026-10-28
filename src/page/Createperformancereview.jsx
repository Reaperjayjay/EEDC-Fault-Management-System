import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Wrench,
  ShieldCheck,
  Scale,
  MessageSquare,
  AlertTriangle,
  Send,
  Star,
  User,
} from "lucide-react";

import { apiRequest } from "../services/api";

/* -------------------- CONFIG -------------------- */

// Real backend endpoints (relative to your API base, e.g. /api/v1).
const ENDPOINTS = {
  reviewable: "/performance-reports/reviewable-assignments",
  create: "/performance-reviews/create",
};

const RATING_LABELS = {
  1: "Poor",
  2: "Below average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

// The three scores the reviewer gives. The other two are worked out by the system.
const RATED_CRITERIA = [
  { key: "resolutionQuality", label: "Resolution quality", weight: 30, text: "How effectively the engineer repaired the fault." },
  { key: "diagnosis", label: "Diagnosis", weight: 15, text: "How accurately the engineer identified the cause of the fault." },
  { key: "safetyCompliance", label: "Safety compliance", weight: 10, text: "Whether the engineer followed the required safety procedures." },
];

/*
  The system scores these two from the assignment's times. The cut-offs below
  are the same ones used by your PerformanceReview model: keep them in sync.
*/
function responseScoreFor(minutes) {
  if (minutes <= 15) return 5;
  if (minutes <= 30) return 4;
  if (minutes <= 60) return 3;
  if (minutes <= 120) return 2;
  return 1;
}

function completionScoreFor(minutes) {
  if (minutes <= 60) return 5;
  if (minutes <= 120) return 4;
  if (minutes <= 240) return 3;
  if (minutes <= 480) return 2;
  return 1;
}

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;

/* -------------------- HELPERS -------------------- */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readable(value) {
  return capitalize(String(value || "").replace(/_/g, " "));
}

const faultCode = (id) => `FLT-${String(id).padStart(3, "0")}`;

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return "Not available";
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "Not available";
  if (value < 60) return `${Math.round(value)} min`;
  return `${Number((value / 60).toFixed(1))} hr`;
}

const minutesBetween = (from, to) => (new Date(to) - new Date(from)) / 60000;

function mapAssignment(row) {
  return {
    id: row.id,
    faultId: row.fault_id,
    code: faultCode(row.fault_id),
    faultType: readable(row.fault_type),
    severity: capitalize(row.severity),
    site: row.site_name || "Unknown site",
    engineerName: row.engineer_name,
    assignedAt: row.assigned_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapReview(row) {
  return {
    id: row.id,
    engineerName: row.engineer_name,
    reviewerName: row.reviewer_name,
    responseMinutes: row.response_time_minutes,
    workMinutes: row.work_duration_minutes,
    scores: {
      resolutionQuality: num(row.resolution_quality),
      responseTimeScore: num(row.response_time_score),
      completionTimeScore: num(row.completion_time_score),
      diagnosis: num(row.diagnosis),
      safetyCompliance: num(row.safety_compliance),
    },
    overall: num(row.overall_score),
    comments: row.comments,
    createdAt: row.created_at,
  };
}

const RESULT_ROWS = [
  { key: "resolutionQuality", label: "Resolution quality", weight: 30 },
  { key: "responseTimeScore", label: "Response time", weight: 20 },
  { key: "completionTimeScore", label: "Completion time", weight: 25 },
  { key: "diagnosis", label: "Diagnosis", weight: 15 },
  { key: "safetyCompliance", label: "Safety compliance", weight: 10 },
];

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

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="font-medium text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function RatingInput({ label, text, weight, value, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {label}
            <span className="ml-2 text-xs font-normal text-slate-400">weight {weight}%</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{text}</p>
        </div>
        <p className="text-xs font-medium text-slate-600">
          {value ? `${value}/5 · ${RATING_LABELS[value]}` : "Not rated"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score;

          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(score)}
              className={`rounded-xl border-2 px-2 py-2 text-center transition focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                selected
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block text-base font-medium">{score}</span>
              <span className="hidden text-[11px] sm:block">{RATING_LABELS[score]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function CreatePerformanceReview() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [ratings, setRatings] = useState({ resolutionQuality: 0, diagnosis: 0, safetyCompliance: 0 });
  const [comments, setComments] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  // Asks the backend for the completed assignments that still need a review.
  const fetchAssignments = useCallback(async () => {
    const response = await apiRequest(ENDPOINTS.reviewable);
    const list = response.data?.assignments;

    return Array.isArray(list) ? list.map(mapAssignment) : [];
  }, []);

  // First load. State is only set after the request finishes, never directly in
  // the effect body.
  useEffect(() => {
    let cancelled = false;

    fetchAssignments()
      .then((list) => {
        if (!cancelled) setAssignments(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || "Unable to load the completed assignments.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAssignments]);

  // Used by the Refresh button and "Try again".
  async function reload() {
    try {
      setLoading(true);
      setLoadError("");
      setAssignments(await fetchAssignments());
    } catch (err) {
      setLoadError(err.message || "Unable to load the completed assignments.");
    } finally {
      setLoading(false);
    }
  }

  const selected = assignments.find((item) => String(item.id) === String(selectedId)) || null;

  // The two scores the system works out from the assignment's times.
  const automatic = useMemo(() => {
    if (!selected) return null;

    const responseMinutes = minutesBetween(selected.assignedAt, selected.acceptedAt);
    const workMinutes = minutesBetween(selected.startedAt, selected.completedAt);

    return {
      responseMinutes,
      workMinutes,
      responseScore: responseScoreFor(responseMinutes),
      completionScore: completionScoreFor(workMinutes),
    };
  }, [selected]);

  const allRated = RATED_CRITERIA.every((item) => ratings[item.key] > 0);

  // Same weights as the backend; the server's answer is the one that is saved.
  const previewOverall =
    automatic && allRated
      ? ratings.resolutionQuality * 0.3 +
        automatic.responseScore * 0.2 +
        automatic.completionScore * 0.25 +
        ratings.diagnosis * 0.15 +
        ratings.safetyCompliance * 0.1
      : null;

  function chooseAssignment(value) {
    setSelectedId(value);
    setSubmitError("");
  }

  function setRating(key, value) {
    setRatings((current) => ({ ...current, [key]: value }));
    setSubmitError("");
  }

  function startAnother() {
    setResult(null);
    setSelectedId("");
    setRatings({ resolutionQuality: 0, diagnosis: 0, safetyCompliance: 0 });
    setComments("");
    setSubmitError("");
  }

  async function submit(event) {
    event.preventDefault();

    if (!selected) {
      setSubmitError("Choose the completed assignment you are reviewing.");
      return;
    }
    if (!allRated) {
      setSubmitError("Give a score from 1 to 5 for all three criteria.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");

      const response = await apiRequest(ENDPOINTS.create, {
        method: "POST",
        body: JSON.stringify({
          assignmentId: selected.id,
          resolutionQuality: ratings.resolutionQuality,
          diagnosis: ratings.diagnosis,
          safetyCompliance: ratings.safetyCompliance,
          comments: comments.trim(),
        }),
      });

      const review = response.data?.review;
      if (!review) throw new Error("The server did not return the saved review.");

      setResult(mapReview(review));
      // The assignment now has a review, so it leaves the waiting list.
      setAssignments((list) => list.filter((item) => item.id !== selected.id));
    } catch (err) {
      setSubmitError(err.message || "Unable to save this review.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- after saving ---------- */
  if (result) {
    return (
      <div className="min-w-0 overflow-x-hidden">
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
          <section className={`${card} text-center`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <h1 className="mt-4 text-2xl font-medium text-slate-900">Review saved</h1>
            <p className="mt-1 text-sm text-slate-500">
              {result.engineerName}'s rating and completed jobs were updated.
            </p>

            <div className="mx-auto mt-6 inline-block rounded-2xl bg-slate-900 px-8 py-5 text-white">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Overall score</p>
              <p className="text-4xl font-medium">
                {result.overall.toFixed(2)}
                <span className="text-lg text-slate-400">/5</span>
              </p>
            </div>

            <div className="mt-6 overflow-x-auto text-left">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-3 text-left font-medium">Factor</th>
                    <th className="py-2 pr-3 text-right font-medium">Weight</th>
                    <th className="py-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {RESULT_ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-slate-700">{row.label}</td>
                      <td className="py-2 pr-3 text-right text-slate-500">{row.weight}%</td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {result.scores[row.key].toFixed(2)}/5
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <dt className="text-xs text-slate-500">Response time</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDuration(num(result.responseMinutes))}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <dt className="text-xs text-slate-500">Repair time</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDuration(num(result.workMinutes))}</dd>
              </div>
            </dl>

            {result.comments && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3.5 text-left text-sm text-slate-600">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {result.comments}
                  {result.reviewerName && (
                    <span className="block text-xs text-slate-400">Reviewed by {result.reviewerName}</span>
                  )}
                </span>
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={startAnother} className={btnPrimary}>
                Review another assignment
              </button>
              <Link to="/Engineerperformance" className={btnOutline}>
                View engineer performance
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ---------- the form ---------- */
  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-slate-900">Create Performance Review</h1>
            <p className="mt-1 text-sm text-slate-500">
              Rate how well an engineer completed an assignment. Response and completion
              scores are worked out automatically.
            </p>
          </div>

          <button type="button" onClick={reload} disabled={loading} className={btnOutline} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Something went wrong.</p>
            <p className="mt-1">{loadError}</p>
            <button type="button" onClick={reload} className="mt-3 underline">
              Try again
            </button>
          </div>
        )}

        <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {/* Step 1: the assignment */}
            <section className={card}>
              <CardTitle icon={ClipboardCheck} tone="bg-blue-50 text-blue-600">
                1. Choose the completed assignment
              </CardTitle>

              {loading ? (
                <p className="text-sm text-slate-500">Loading completed assignments...</p>
              ) : assignments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  No completed assignments are waiting for a review. An assignment appears
                  here once the engineer has accepted it, started work and completed it.
                </p>
              ) : (
                <>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="assignment">
                    Assignment waiting for a review
                  </label>
                  <select
                    id="assignment"
                    className={field}
                    value={selectedId}
                    onChange={(event) => chooseAssignment(event.target.value)}
                  >
                    <option value="">Select an assignment…</option>
                    {assignments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.faultType} · {item.site} · {item.engineerName}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {selected && automatic && (
                <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                  <InfoRow icon={User} label="Engineer">{selected.engineerName}</InfoRow>
                  <InfoRow icon={MapPin} label="Site">{selected.site}</InfoRow>
                  <InfoRow icon={Wrench} label="Fault">
                    {selected.faultType} · {selected.severity} severity
                  </InfoRow>
                  <InfoRow icon={Clock} label="Completed">{formatDateTime(selected.completedAt)}</InfoRow>
                  <InfoRow icon={Clock} label="Response time (assigned to accepted)">
                    {formatDuration(automatic.responseMinutes)}
                    <span className="block text-xs font-normal text-slate-500">
                      Scored {automatic.responseScore}/5 automatically
                    </span>
                  </InfoRow>
                  <InfoRow icon={Clock} label="Repair time (started to completed)">
                    {formatDuration(automatic.workMinutes)}
                    <span className="block text-xs font-normal text-slate-500">
                      Scored {automatic.completionScore}/5 automatically
                    </span>
                  </InfoRow>
                </div>
              )}
            </section>

            {/* Step 2: the ratings */}
            <section className={card}>
              <CardTitle icon={Star} tone="bg-amber-50 text-amber-600">
                2. Rate the engineer's work
              </CardTitle>

              <div className="space-y-4">
                {RATED_CRITERIA.map((item) => (
                  <RatingInput
                    key={item.key}
                    label={item.label}
                    text={item.text}
                    weight={item.weight}
                    value={ratings[item.key]}
                    onChange={(value) => setRating(item.key, value)}
                  />
                ))}
              </div>
            </section>

            {/* Step 3: comments */}
            <section className={card}>
              <CardTitle icon={MessageSquare} tone="bg-violet-50 text-violet-600">
                3. Comments (optional)
              </CardTitle>

              <textarea
                rows={4}
                maxLength={1000}
                className={field}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder="e.g. Diagnosed the fault quickly and followed the lock-out procedure."
              />
              <p className="mt-1 text-right text-xs text-slate-400">{comments.length}/1000</p>
            </section>
          </div>

          {/* Summary and submit */}
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section className={card}>
              <CardTitle icon={Scale} tone="bg-emerald-50 text-emerald-600">
                Score preview
              </CardTitle>

              <div className="rounded-2xl bg-slate-900 p-5 text-center text-white">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Overall score</p>
                <p className="text-4xl font-medium">
                  {previewOverall === null ? "—" : previewOverall.toFixed(2)}
                  <span className="text-lg text-slate-400">/5</span>
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-sm">
                {RESULT_ROWS.map((row) => {
                  const automaticScore =
                    automatic &&
                    { responseTimeScore: automatic.responseScore, completionTimeScore: automatic.completionScore }[row.key];
                  const given = ratings[row.key];
                  const shown = automaticScore ?? given;

                  return (
                    <li key={row.key} className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">
                        {row.label}
                        <span className="ml-1.5 text-xs text-slate-400">{row.weight}%</span>
                      </span>
                      <span className="font-medium text-slate-900">{shown ? `${shown}/5` : "—"}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                This is a preview. The server calculates and saves the final score, and
                it updates the engineer's average rating and completed jobs.
              </p>

              {submitError && (
                <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !selected || !allRated}
                className={`${btnPrimary} mt-4 w-full`}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Saving review..." : "Submit review"}
              </button>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}