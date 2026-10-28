import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  RefreshCw,
  Search,
  Wrench,
  Camera,
  ClipboardCheck,
  History as HistoryIcon,
  MapPin,
  CalendarDays,
  Check,
  X,
  ImagePlus,
  CheckCircle2,
  ArrowRight,
  Lock,
  ListChecks,
  Zap,
  Circle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import {
  getMyAssignments,
  updateAssignmentStatus,
} from "../../services/api.js"; // adjust to your real path

/* ---------- constants & mappings ---------- */

// Replace with the logged-in user's name from your auth context if you have one
const ENGINEER = "You (field engineer)";

const STATUS_TO_API = {
  Assigned: "assigned",
  Accepted: "accepted",
  "En Route": "en_route",
  Arrived: "arrived",
  Inspecting: "inspecting",
  "Fault Identified": "fault_identified",
  Repairing: "repairing",
  Testing: "testing",
  Completed: "completed",
};

const STATUSES = Object.keys(STATUS_TO_API);

const API_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_TO_API).map(([label, value]) => [value, label])
);

const capitalize = (value) =>
  value ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase() : "";

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

/* ---------- styles & helpers ---------- */

const priorityStyle = {
  Critical: "bg-red-500/15 text-red-200 ring-red-400/40",
  High: "bg-orange-500/15 text-orange-200 ring-orange-400/40",
  Medium: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
  Low: "bg-slate-500/20 text-slate-200 ring-slate-400/40",
};

// full class names so Tailwind can see them
const statusChip = {
  Assigned: { chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  Accepted: { chip: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  "En Route": { chip: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  Arrived: { chip: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  Inspecting: { chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  "Fault Identified": { chip: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  Repairing: { chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  Testing: { chip: "bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  Completed: { chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

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

const card = "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm";
const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/20`;
const btnSuccess = `${btnBase} bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20`;

const toLocalInput = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtDateTime = (t) =>
  new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function SectionTitle({ icon: Icon, tone = "blue", title, subtitle, right }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// Inspection and repair are not sent to the server yet, so don't say "Saved"
function Saved({ time }) {
  if (!time) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Check className="h-3.5 w-3.5" /> Kept in browser {new Date(time).toLocaleTimeString()}
    </span>
  );
}

function HeroChip({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur">
      <Icon className="h-4 w-4 shrink-0 text-blue-200" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-blue-200/80">{label}</p>
        <p className="truncate text-sm font-medium text-white">{children}</p>
      </div>
    </div>
  );
}

function Banner({ type, children }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  const Icon = type === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm ${styles[type]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/* ---------- photo uploader ---------- */

function PhotoGroup({ title, hint, items, onAdd, onRemove }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {items.length} photo{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <div key={p.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img src={p.url} alt={p.name} className="h-24 w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              aria-label={`Remove ${p.name}`}
              className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600">
          <ImagePlus className="h-5 w-5" />
          Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onAdd(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------- status stepper ---------- */

function StatusStepper({ status }) {
  const current = STATUSES.indexOf(status);
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-[820px]">
        {STATUSES.map((s, i) => {
          const done = i < current || status === "Completed";
          const active = i === current && status !== "Completed";
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-4 h-1 w-full rounded-full ${
                    i <= current ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-emerald-500 text-white shadow-sm"
                    : active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-100"
                    : "bg-white text-slate-400 ring-2 ring-slate-200"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`mt-2.5 px-1 text-center text-xs ${
                  active ? "font-semibold text-blue-700" : done ? "font-medium text-slate-700" : "text-slate-400"
                }`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- page ---------- */

export default function FaultStatusUpdate() {
  const [searchParams] = useSearchParams();

  // data from the backend
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState([]);

  // 3. update status form
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState(() => toLocalInput());

  // 4. inspection
  const [inspection, setInspection] = useState({ identified: "", cause: "", equipment: "", severity: "Moderate" });
  const [inspectionSaved, setInspectionSaved] = useState(null);

  // 5. repair
  const [repair, setRepair] = useState({ work: "", materials: "", remaining: "", percent: 0 });
  const [repairSaved, setRepairSaved] = useState(null);

  // 6. evidence
  const [photos, setPhotos] = useState({ before: [], during: [], after: [] });
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => Object.values(photosRef.current).flat().forEach((p) => URL.revokeObjectURL(p.url)),
    []
  );

  // 7. testing & completion
  const [testing, setTesting] = useState({ results: "", power: "", remarks: "" });
  const [reportAt, setReportAt] = useState(null);

  /* ----- load the engineer's assignment from the API ----- */

  const requestedId = searchParams.get("assignmentId");

  useEffect(() => {
    let cancelled = false;

    async function loadAssignment() {
      try {
        const response = await getMyAssignments();
        if (cancelled) return;

        const list = response?.data?.assignments ?? response?.assignments ?? [];

        const selectedAssignment = requestedId
          ? list.find((item) => String(item.assignment_id) === String(requestedId))
          : list.find(
              (item) =>
                !["completed", "cancelled", "rejected"].includes(item.assignment_status)
            );

        setAssignment(selectedAssignment || null);
        setError(
          selectedAssignment
            ? ""
            : requestedId
            ? "That assignment was not found in your assignments."
            : ""
        );

        // The backend has no history endpoint yet, so seed with the assignment event
        setHistory(
          selectedAssignment?.assigned_at
            ? [
                {
                  prev: "—",
                  next: "Assigned",
                  by: "Control Room",
                  at: new Date(selectedAssignment.assigned_at).getTime(),
                  notes: "",
                },
              ]
            : []
        );
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load your assignments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAssignment();

    return () => {
      cancelled = true;
    };
  }, [requestedId]);

  /* ----- derived values ----- */

  const status = API_TO_STATUS[assignment?.assignment_status] || "Assigned";
  const locked = status === "Completed";
  const currentIdx = STATUSES.indexOf(status);
  const stagePercent = Math.round((currentIdx / (STATUSES.length - 1)) * 100);
  // "Completed" is reached only through the final report (section 7)
  const options = STATUSES.slice(currentIdx + 1).filter((s) => s !== "Completed");
  const selected = options.includes(newStatus) ? newStatus : options[0] || "";

  const fault = {
    id: assignment?.fault_id ?? assignment?.assignment_id ?? "--",
    description: assignment?.description || "No description provided.",
    site: assignment?.site_name || "Unnamed site",
    location: assignment?.address || assignment?.location || "Address unavailable",
    priority: capitalize(assignment?.severity || assignment?.priority) || "Medium",
    assignedAt: formatDateTime(assignment?.assigned_at),
  };

  /* ----- save a status change to the backend ----- */

  const changeStatus = async (next, noteText, time) => {
    if (!assignment) return false;

    setSavingStatus(true);
    setError("");
    setSuccess("");

    try {
      // Adjust the payload keys if your route expects different names
      await updateAssignmentStatus(assignment.assignment_id, {
        status: STATUS_TO_API[next],
        notes: noteText,
      });

      setAssignment((prev) =>
        prev ? { ...prev, assignment_status: STATUS_TO_API[next] } : prev
      );
      setHistory((h) => [{ prev: status, next, by: ENGINEER, at: time, notes: noteText }, ...h]);
      setSuccess(`Status updated to "${next}".`);
      return true;
    } catch (err) {
      setError(err.message || "Unable to update the status.");
      return false;
    } finally {
      setSavingStatus(false);
    }
  };

  const submitStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;

    const ok = await changeStatus(selected, notes.trim(), new Date(when).getTime() || Date.now());

    if (ok) {
      setNotes("");
      setNewStatus("");
      setWhen(toLocalInput());
    }
  };

  const addPhotos = (group) => (files) =>
    setPhotos((p) => ({
      ...p,
      [group]: [
        ...p[group],
        ...files.map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, url: URL.createObjectURL(f) })),
      ],
    }));

  const removePhoto = (group) => (id) =>
    setPhotos((p) => {
      const item = p[group].find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return { ...p, [group]: p[group].filter((x) => x.id !== id) };
    });

  const submitFinalReport = async (e) => {
    e.preventDefault();
    const t = Date.now();

    // TODO: send inspection, repair, photos and testing to your backend once those routes exist.
    // For now only the status change is persisted.
    const ok = await changeStatus(
      "Completed",
      `Final report submitted. Power restored: ${testing.power}. ${testing.remarks}`.trim(),
      t
    );

    if (ok) setReportAt(t);
  };

  const canSubmitFinal = status === "Testing" && !locked && !savingStatus;
  const setI = (k) => (e) => setInspection({ ...inspection, [k]: e.target.value });
  const setR = (k) => (e) => setRepair({ ...repair, [k]: e.target.value });
  const setT = (k) => (e) => setTesting({ ...testing, [k]: e.target.value });

  const checklist = [
    { label: "Inspection findings", done: !!inspectionSaved },
    { label: "Repair progress", done: !!repairSaved },
    {
      label: "Photo evidence",
      done: photos.before.length > 0 && photos.during.length > 0 && photos.after.length > 0,
      detail: `${photos.before.length} before · ${photos.during.length} during · ${photos.after.length} after`,
    },
    { label: "Final report", done: !!reportAt },
  ];

  const severityStyle = {
    Minor: "border-emerald-500 bg-emerald-50 text-emerald-700",
    Moderate: "border-amber-500 bg-amber-50 text-amber-700",
    Major: "border-orange-500 bg-orange-50 text-orange-700",
    Severe: "border-red-500 bg-red-50 text-red-700",
  };
  const powerStyle = {
    yes: "border-emerald-500 bg-emerald-50 text-emerald-700",
    partial: "border-amber-500 bg-amber-50 text-amber-700",
    no: "border-red-500 bg-red-50 text-red-700",
  };
  const choice = "cursor-pointer rounded-xl border-2 px-4 py-2 text-sm font-semibold transition";
  const choiceOff = "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50";

  /* ----- loading / empty states ----- */

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading your assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <div className={`${card} mx-auto max-w-xl text-center`}>
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-900">No assignment to update</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error || "You have no active assignments right now."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200">
              <Zap className="h-4 w-4" /> Fault status update
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{fault.id}</h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  priorityStyle[fault.priority] || priorityStyle.Medium
                }`}
              >
                {fault.priority} priority
              </span>
            </div>
            <p className="mt-3 text-base leading-relaxed text-slate-200">{fault.description}</p>
          </div>

          <div className="w-full rounded-2xl bg-white/10 p-5 ring-1 ring-white/10 backdrop-blur sm:w-64">
            <p className="text-[11px] uppercase tracking-wide text-blue-200/80">Current status</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold">
              {locked ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Activity className="h-5 w-5 text-blue-300" />}
              {status}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${stagePercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-blue-100">
              Stage {currentIdx + 1} of {STATUSES.length} · {stagePercent}%
            </p>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <HeroChip icon={MapPin} label="Site name">{fault.site}</HeroChip>
          <HeroChip icon={MapPin} label="Location">{fault.location}</HeroChip>
          <HeroChip icon={CalendarDays} label="Date assigned">{fault.assignedAt}</HeroChip>
        </div>
      </section>

      {error && <Banner type="error">{error}</Banner>}
      {success && <Banner type="success">{success}</Banner>}

      {locked && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Lock className="h-4 w-4 shrink-0" />
          This fault was completed{reportAt ? ` on ${fmtDateTime(reportAt)}` : ""}. The report is locked and can no longer be edited.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* 2. Current status */}
          <section className={card}>
            <SectionTitle icon={Activity} tone="blue" title="Fault progress" subtitle="Where this job is right now" />
            <StatusStepper status={status} />
          </section>

          {/* 3. Update status */}
          <section className={card}>
            <SectionTitle icon={RefreshCw} tone="indigo" title="Update status" subtitle="Move the fault to its next stage" />
            <fieldset disabled={locked || savingStatus}>
              {options.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  {locked
                    ? "This fault is completed."
                    : "The fault is at the Testing stage. Complete it by submitting the final report below."}
                </p>
              ) : (
                <form onSubmit={submitStatusUpdate} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="New status">
                      <select className={field} value={selected} onChange={(e) => setNewStatus(e.target.value)}>
                        {options.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date and time">
                      <input type="datetime-local" required className={field} value={when}
                        onChange={(e) => setWhen(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Progress notes">
                    <textarea required rows={3} className={field} value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What's happening at the site right now?" />
                  </Field>
                  <button type="submit" className={btnPrimary}>
                    {savingStatus ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        Submit status update <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </fieldset>
          </section>

          {/* 4. Inspection findings */}
          <section className={card}>
            <SectionTitle icon={Search} tone="amber" title="Inspection findings" subtitle="What you found on site"
              right={<Saved time={inspectionSaved} />} />
            <fieldset disabled={locked}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // TODO: save to your API when the inspection route exists
                  setInspectionSaved(Date.now());
                }}
                className="space-y-4"
              >
                <Field label="Fault identified">
                  <textarea required rows={2} className={field} value={inspection.identified}
                    onChange={setI("identified")} placeholder="What is wrong?" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cause of fault">
                    <input required className={field} value={inspection.cause} onChange={setI("cause")}
                      placeholder="e.g. Worn closing spring, overload" />
                  </Field>
                  <Field label="Equipment affected">
                    <input required className={field} value={inspection.equipment} onChange={setI("equipment")}
                      placeholder="e.g. Circuit breaker CB3" />
                  </Field>
                </div>
                <Field label="Severity of damage">
                  <div className="flex flex-wrap gap-2">
                    {["Minor", "Moderate", "Major", "Severe"].map((s) => (
                      <label key={s}
                        className={`${choice} ${inspection.severity === s ? severityStyle[s] : choiceOff}`}>
                        <input type="radio" name="severity" value={s} className="sr-only"
                          checked={inspection.severity === s} onChange={setI("severity")} />
                        {s}
                      </label>
                    ))}
                  </div>
                </Field>
                <button type="submit" className={btnPrimary}>Save findings</button>
              </form>
            </fieldset>
          </section>

          {/* 5. Repair progress */}
          <section className={card}>
            <SectionTitle icon={Wrench} tone="violet" title="Repair progress" subtitle="Work done and what's left"
              right={<Saved time={repairSaved} />} />
            <fieldset disabled={locked}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // TODO: save to your API when the repair route exists
                  setRepairSaved(Date.now());
                }}
                className="space-y-4"
              >
                <Field label="Work performed">
                  <textarea required rows={3} className={field} value={repair.work} onChange={setR("work")}
                    placeholder="Describe the repair work done so far..." />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Materials or spare parts used">
                    <textarea rows={3} className={field} value={repair.materials} onChange={setR("materials")}
                      placeholder="e.g. 1 x closing coil, 2 x contactors" />
                  </Field>
                  <Field label="Remaining work">
                    <textarea rows={3} className={field} value={repair.remaining} onChange={setR("remaining")}
                      placeholder="What is left to do?" />
                  </Field>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Repair progress</label>
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                      {repair.percent}%
                    </span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={repair.percent}
                    onChange={(e) => setRepair({ ...repair, percent: Number(e.target.value) })}
                    className="w-full accent-blue-600" />
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                      style={{ width: `${repair.percent}%` }} />
                  </div>
                </div>
                <button type="submit" className={btnPrimary}>Save repair progress</button>
              </form>
            </fieldset>
          </section>

          {/* 6. Evidence upload */}
          <section className={card}>
            <SectionTitle icon={Camera} tone="rose" title="Evidence upload"
              subtitle="Photos from before, during and after the repair" />
            <fieldset disabled={locked} className="space-y-4">
              <PhotoGroup title="Before repair" hint="The fault as you found it" items={photos.before}
                onAdd={addPhotos("before")} onRemove={removePhoto("before")} />
              <PhotoGroup title="During repair" hint="Work in progress" items={photos.during}
                onAdd={addPhotos("during")} onRemove={removePhoto("during")} />
              <PhotoGroup title="After repair" hint="The finished repair" items={photos.after}
                onAdd={addPhotos("after")} onRemove={removePhoto("after")} />
            </fieldset>
            <p className="mt-4 text-xs text-slate-400">
              Photos, inspection findings and repair progress are kept in the browser for now. Only status
              updates are saved to the server.
            </p>
          </section>

          {/* 7. Testing and completion */}
          <section className={card}>
            <SectionTitle icon={ClipboardCheck} tone="emerald" title="Testing & completion"
              subtitle="Confirm the repair and submit the final report" />
            <fieldset disabled={locked}>
              <form onSubmit={submitFinalReport} className="space-y-4">
                <Field label="Test results">
                  <textarea required rows={3} className={field} value={testing.results} onChange={setT("results")}
                    placeholder="e.g. Breaker closes and trips on command; insulation test passed." />
                </Field>
                <Field label="Has power been restored?">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["yes", "Yes, fully restored"],
                      ["partial", "Partially restored"],
                      ["no", "No, not restored"],
                    ].map(([v, label]) => (
                      <label key={v} className={`${choice} ${testing.power === v ? powerStyle[v] : choiceOff}`}>
                        <input type="radio" name="power" value={v} required className="sr-only"
                          checked={testing.power === v} onChange={setT("power")} />
                        {label}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Completion remarks">
                  <textarea required rows={3} className={field} value={testing.remarks} onChange={setT("remarks")}
                    placeholder="Any final notes for the control room..." />
                </Field>

                {status !== "Testing" && !locked && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Move the status to <span className="font-semibold">Testing</span> before submitting the final
                    report (current status: {status}).
                  </p>
                )}
                <button type="submit" disabled={!canSubmitFinal} className={btnSuccess}>
                  {savingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Submit final report
                    </>
                  )}
                </button>
              </form>
            </fieldset>
          </section>
        </div>

        {/* Right column: report checklist + status history */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className={card}>
            <SectionTitle icon={ListChecks} tone="cyan" title="Report checklist" subtitle="What's done so far" />
            <ul className="space-y-3">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  {c.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${c.done ? "text-slate-900" : "text-slate-500"}`}>{c.label}</p>
                    {c.detail && <p className="text-xs text-slate-400">{c.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 8. Status update history */}
          <section className={card}>
            <SectionTitle icon={HistoryIcon} tone="slate" title="Status update history"
              subtitle={`${history.length} update${history.length === 1 ? "" : "s"}`} />
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">No updates yet.</p>
            ) : (
              <ol className="relative max-h-[60vh] space-y-5 overflow-y-auto border-l-2 border-slate-100 pl-6 pr-1">
                {history.map((h, i) => (
                  <li key={`${h.next}-${h.at}-${i}`} className="relative">
                    <span
                      className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                        statusChip[h.next]?.dot || "bg-slate-400"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-400">{h.prev}</span>
                      <ArrowRight className="h-3 w-3 text-slate-300" />
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${statusChip[h.next]?.chip}`}>
                        {h.next}
                      </span>
                      {i === 0 && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{h.by}</span> · {fmtDateTime(h.at)}
                    </p>
                    {h.notes && (
                      <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                        {h.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}