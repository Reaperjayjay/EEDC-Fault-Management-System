import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X, Eye, MapPin } from "lucide-react";

const API_BASE = "http://localhost:5000/api/v1";
const card = "rounded-2xl border border-gray-200 bg-white p-5";
const TABS = [
  ["all", "All assignments"],
  ["dispatch", "Dispatch tracking"],
  ["progress", "Work progress"],
  ["performance", "Performance"],
  ["history", "History"],
];
const STATUS_LABELS = {
  assigned: "Assigned", accepted: "Accepted", rejected: "Rejected",
  en_route: "En route", arrived: "Arrived", in_progress: "In progress",
  inspecting: "Inspecting", fault_identified: "Fault identified",
  repairing: "Repairing", testing: "Testing", completed: "Completed",
  cancelled: "Cancelled", pending: "Pending", overdue: "Overdue",
};

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error("Your login session was not found. Please log in again.");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status}).`);
  return result;
}

function unwrapList(result, keys) {
  for (const key of keys) {
    const value = result?.data?.[key] ?? result?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeStatus(status) {
  const value = String(status || "pending").toLowerCase().replace(/\s+/g, "_");
  return STATUS_LABELS[value] ? value : value;
}
function statusLabel(status) {
  const value = normalizeStatus(status);
  return STATUS_LABELS[value] || value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) || "Unknown";
}
function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function idLabel(value, prefix) {
  if (value == null) return "—";
  return typeof value === "string" && value.startsWith(prefix) ? value : `${prefix}-${value}`;
}
function StatusBadge({ status }) {
  const s = normalizeStatus(status);
  const colors = {
    completed: "bg-green-100 text-green-700", accepted: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700", repairing: "bg-amber-100 text-amber-700",
    assigned: "bg-purple-100 text-purple-700", rejected: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600", pending: "bg-gray-100 text-gray-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${colors[s] || "bg-gray-100 text-gray-700"}`}>{statusLabel(s)}</span>;
}
function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="text-sm text-gray-900">{title}</h3><button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button></div>
      {children}
    </div>
  </div>;
}

function normalizeAssignment(a) {
  return {
    ...a,
    id: a.id ?? a.assignment_id,
    faultId: a.fault_id ?? a.faultId ?? a.fault?.id,
    fault: a.fault_description ?? a.description ?? a.fault_type ?? a.fault?.fault_type ?? "Fault report",
    location: a.site_name ?? a.location ?? a.site_code ?? "Site unavailable",
    engineerId: a.engineer_id ?? a.engineerId,
    engineerName: a.engineer_name ?? a.engineerName ?? a.engineer?.name ?? "Unassigned",
    assignedAt: a.assigned_at ?? a.created_at ?? a.assignedAt,
    deadline: a.deadline ?? a.due_date ?? null,
    status: normalizeStatus(a.status),
    priority: String(a.severity ?? a.priority ?? "medium").toLowerCase(),
    notes: a.notes ?? "",
    updatedAt: a.updated_at ?? a.updatedAt,
  };
}

function OverviewCards({ assignments }) {
  const count = (status) => assignments.filter((a) => a.status === status).length;
  const items = [
    ["Total assignments", assignments.length, "text-gray-900"],
    ["Assigned", count("assigned"), "text-purple-700"],
    ["Accepted", count("accepted"), "text-blue-700"],
    ["In progress", assignments.filter((a) => ["in_progress", "inspecting", "fault_identified", "repairing", "testing", "en_route", "arrived"].includes(a.status)).length, "text-amber-700"],
    ["Completed", count("completed"), "text-green-700"],
  ];
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items.map(([label, value, color]) => <div key={label} className={card}><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 text-2xl ${color}`}>{value}</p></div>)}</div>;
}

function AllAssignments({ assignments, engineers }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState(null);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return !q || [a.id, a.faultId, a.location, a.fault, a.engineerName].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [assignments, query, statusFilter]);
  const statusOptions = [...new Set(assignments.map((a) => a.status))];
  return <section className={card}>
    <div className="mb-3 flex flex-wrap items-center gap-3"><div className="relative min-w-[14rem] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, fault, location or engineer..." className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500" /></div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="rounded-lg border border-gray-200 px-3 py-2 text-xs"><option value="all">All statuses</option>{statusOptions.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[52rem] text-left text-xs"><thead className="border-b border-gray-200 text-gray-500"><tr>{["Assignment", "Fault", "Engineer", "Assigned", "Priority", "Status", "Actions"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead>
      <tbody>{rows.map((a) => <tr key={a.id} className="border-b border-gray-100 align-top"><td className="px-2 py-3 text-gray-900">{idLabel(a.id, "ASG")}</td><td className="px-2 py-3"><p className="text-gray-900">{idLabel(a.faultId, "FLT")} · {a.fault}</p><p className="text-gray-500">{a.location}</p></td><td className="px-2 py-3 text-gray-900">{a.engineerName}</td><td className="px-2 py-3 text-gray-600">{dateLabel(a.assignedAt)}</td><td className="px-2 py-3 capitalize text-gray-600">{a.priority}</td><td className="px-2 py-3"><StatusBadge status={a.status} /></td><td className="px-2 py-3"><button type="button" onClick={() => setViewing(a)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /> View</button></td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="py-6 text-center text-xs text-gray-400">No assignments match your filters.</p>}</div>
    {viewing && <Modal title={`${idLabel(viewing.id, "ASG")} · ${viewing.fault}`} onClose={() => setViewing(null)}><dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-gray-500">Fault ID</dt><dd className="text-gray-900">{idLabel(viewing.faultId, "FLT")}</dd></div><div><dt className="text-gray-500">Location</dt><dd className="text-gray-900">{viewing.location}</dd></div><div><dt className="text-gray-500">Engineer</dt><dd className="text-gray-900">{viewing.engineerName}</dd></div><div><dt className="text-gray-500">Status</dt><dd><StatusBadge status={viewing.status} /></dd></div><div><dt className="text-gray-500">Assigned</dt><dd className="text-gray-900">{dateLabel(viewing.assignedAt)}</dd></div><div><dt className="text-gray-500">Updated</dt><dd className="text-gray-900">{dateLabel(viewing.updatedAt)}</dd></div></dl><p className="mt-4 text-xs text-gray-500">Assignment notes</p><p className="text-xs text-gray-900">{viewing.notes || "No assignment notes provided."}</p></Modal>}
    {engineers.length === 0 && <p className="mt-3 text-[11px] text-gray-400">Engineer directory was unavailable; assignment records are still shown where possible.</p>}
  </section>;
}

function DispatchTracking({ assignments }) {
  const active = assignments.filter((a) => !["completed", "cancelled", "rejected"].includes(a.status));
  if (!active.length) return <p className="py-6 text-center text-xs text-gray-400">No active dispatches.</p>;
  return <div className="grid gap-4 md:grid-cols-2">{active.map((a) => <section key={a.id} className={card}><div className="flex items-start justify-between gap-2"><div><p className="text-sm text-gray-900">{a.engineerName}</p><p className="text-xs text-gray-500">{idLabel(a.id, "ASG")} · {a.location}</p></div><StatusBadge status={a.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-gray-500">Assigned</dt><dd className="text-gray-900">{dateLabel(a.assignedAt)}</dd></div><div><dt className="text-gray-500">Last updated</dt><dd className="text-gray-900">{dateLabel(a.updatedAt)}</dd></div><div className="col-span-2 flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-400" /><div><dt className="text-gray-500">Dispatch details</dt><dd className="text-gray-900">{a.notes || "Live GPS/ETA details are not included in the assignment response."}</dd></div></div></dl></section>)}</div>;
}

function WorkProgress({ assignments }) {
  const tracked = assignments.filter((a) => ["accepted", "en_route", "arrived", "in_progress", "inspecting", "fault_identified", "repairing", "testing", "completed"].includes(a.status));
  if (!tracked.length) return <p className="py-6 text-center text-xs text-gray-400">No jobs with progress statuses yet.</p>;
  return <section className={card}><div className="space-y-3">{tracked.map((a) => <div key={a.id} className="rounded-xl border border-gray-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm text-gray-900">{idLabel(a.id, "ASG")} · {a.fault}</p><p className="text-xs text-gray-500">{a.location} · {a.engineerName}</p></div><StatusBadge status={a.status} /></div><div className="mt-3 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${a.status === "completed" ? 100 : a.status === "testing" ? 85 : a.status === "repairing" ? 70 : a.status === "fault_identified" ? 55 : a.status === "inspecting" ? 40 : a.status === "in_progress" ? 30 : a.status === "arrived" ? 20 : 10}%` }} /></div><p className="mt-2 text-[11px] text-gray-500">Last update: {dateLabel(a.updatedAt)}</p></div>)}</div></section>;
}

function Performance({ engineers }) {
  if (!engineers.length) return <p className="py-6 text-center text-xs text-gray-400">No engineer performance data was returned by the API.</p>;
  return <section className={card}><div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-xs"><thead className="border-b border-gray-200 text-gray-500"><tr>{["Engineer", "Specialization", "Availability", "Completed jobs", "Performance rating"].map((h) => <th key={h} className="px-2 py-2 font-normal">{h}</th>)}</tr></thead><tbody>{engineers.map((e) => <tr key={e.id} className="border-b border-gray-100"><td className="px-2 py-3 text-gray-900">{e.name ?? e.full_name ?? `Engineer ${e.id}`}</td><td className="px-2 py-3 text-gray-600">{e.specialization ?? "—"}</td><td className="px-2 py-3 capitalize text-gray-600">{String(e.availability ?? e.status ?? "unknown").replace(/_/g, " ")}</td><td className="px-2 py-3 text-gray-600">{e.completed_jobs ?? e.completedJobs ?? "—"}</td><td className="px-2 py-3 text-gray-600">{e.performance_rating ?? e.rating ?? "—"}{(e.performance_rating ?? e.rating) != null ? " / 5" : ""}</td></tr>)}</tbody></table></div><p className="mt-3 text-[11px] text-gray-400">These values are displayed from the engineer API; grades are not calculated unless the backend supplies the required performance measures.</p></section>;
}

function History({ assignments }) {
  const [openId, setOpenId] = useState(null);
  return <div className="space-y-3">{assignments.map((a) => { const open = openId === a.id; return <section key={a.id} className={card}><button type="button" onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left"><div><p className="text-sm text-gray-900">{idLabel(a.id, "ASG")} · {a.fault}</p><p className="text-xs text-gray-500">Engineer: {a.engineerName} · Last updated {dateLabel(a.updatedAt)}</p></div><StatusBadge status={a.status} /></button>{open && <div className="mt-4 border-l border-gray-200 pl-4 text-xs"><p className="text-gray-900">Current status: {statusLabel(a.status)}</p><p className="mt-1 text-gray-500">Assigned: {dateLabel(a.assignedAt)}</p><p className="mt-1 text-gray-500">Last update: {dateLabel(a.updatedAt)}</p><p className="mt-2 text-gray-700">{a.notes || "Detailed status history and reassignment audit records are not included in the current API response."}</p></div>}</section>; })}{assignments.length === 0 && <p className="py-6 text-center text-xs text-gray-400">No assignment history available.</p>}</div>;
}

export default function AssignmentMonitoring() {
  const [assignments, setAssignments] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        apiRequest("/assignments"),
        apiRequest("/engineers"),
      ]);
      const assignmentResult = results[0];
      if (assignmentResult.status === "rejected") throw assignmentResult.reason;
      const assignmentRows = unwrapList(assignmentResult.value, ["assignments", "data"]);
      setAssignments(assignmentRows.map(normalizeAssignment));
      if (results[1].status === "fulfilled") {
        setEngineers(unwrapList(results[1].value, ["engineers", "data"]));
      } else {
        setEngineers([]);
      }
    } catch (err) {
      setError(err?.message || "Unable to load assignment data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Your login session was not found. Please log in again.");
        const assignmentResponse = await apiRequest("/assignments");
        const assignmentRows = unwrapList(assignmentResponse, ["assignments", "data"]);
        if (!active) return;
        setAssignments(assignmentRows.map(normalizeAssignment));
        try {
          const engineerResponse = await apiRequest("/engineers");
          if (active) setEngineers(unwrapList(engineerResponse, ["engineers", "data"]));
        } catch {
          if (active) setEngineers([]);
        }
      } catch (err) {
        if (active) setError(err?.message || "Unable to load assignment data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const completed = assignments.filter((a) => a.status === "completed").length;
  return <div className="space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg text-gray-900">Assignment monitoring</h1><p className="text-xs text-gray-500">Track assignments using records returned by the MainPower API.</p></div><button type="button" onClick={() => loadData(true)} disabled={refreshing || loading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing..." : "Refresh"}</button></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <p className="py-10 text-center text-sm text-gray-500">Loading assignments...</p> : <>
      <OverviewCards assignments={assignments} />
      <div role="tablist" aria-label="Assignment monitoring sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">{TABS.map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)} className={`shrink-0 border-b-2 px-3 py-2 text-xs transition ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{label}</button>)}</div>
      {tab === "all" && <AllAssignments assignments={assignments} engineers={engineers} />}
      {tab === "dispatch" && <DispatchTracking assignments={assignments} />}
      {tab === "progress" && <WorkProgress assignments={assignments} />}
      {tab === "performance" && <Performance engineers={engineers} />}
      {tab === "history" && <History assignments={assignments} />}
      <p className="text-[11px] text-gray-400">{assignments.length} assignments loaded · {completed} completed. AI candidate rankings, live GPS/ETA, and detailed audit history require those fields to be provided by your backend.</p>
    </>}
  </div>;
}
