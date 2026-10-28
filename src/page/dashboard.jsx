import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/sideBar.jsx";

// Set VITE_API_URL in your .env file for production (e.g. https://api.example.com/api/v1)
const API_BASE_URL =
  import.meta.env?.VITE_API_URL || "http://localhost:5000/api/v1";
const LOGIN_PATH = "/login";

const FAULT_STATUS_LABELS = {
  pending: "Awaiting assignment",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

const ENGINEER_STATUS_LABELS = {
  available: "Available",
  busy: "On assignment",
  offline: "Off duty",
};

const FAULT_STATUS_STYLES = {
  "Awaiting assignment": "bg-amber-50 text-amber-700 ring-amber-200",
  Assigned: "bg-blue-50 text-blue-700 ring-blue-200",
  "In progress": "bg-violet-50 text-violet-700 ring-violet-200",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const SEVERITY_STYLES = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function clearToken() {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");
}

// Escape text before putting it into Leaflet popup HTML
function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function apiGet(endpoint, signal) {
  const token = getToken();
  if (!token) {
    const err = new Error("No login token was found. Please log in again.");
    err.status = 401;
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  let result;
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const err = new Error(
      result.message || result.error || `${endpoint} failed (${response.status})`
    );
    err.status = response.status;
    throw err;
  }

  return result;
}

function readCollection(response, preferredKey) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.[preferredKey])) {
    return response.data[preferredKey];
  }
  if (Array.isArray(response?.[preferredKey])) return response[preferredKey];
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function mapFault(fault) {
  const status = String(fault.status || "pending").toLowerCase();
  const severity = String(fault.severity || "medium").toLowerCase();
  const latitude = fault.detected_latitude ?? fault.latitude ?? null;
  const longitude = fault.detected_longitude ?? fault.longitude ?? null;

  return {
    id: fault.id,
    title: String(fault.fault_type || "other").replaceAll("_", " "),
    site: fault.site_name || fault.site_code || fault.location || "Unknown site",
    siteCode: fault.site_code || "",
    reporter: fault.reported_by_name || fault.reporter_name || "Not available",
    severity,
    status: FAULT_STATUS_LABELS[status] || status.replaceAll("_", " "),
    rawStatus: status,
    description: fault.description || "No description provided.",
    reportedAt: fault.reported_at || fault.created_at || null,
    latitude: latitude === null ? null : Number(latitude),
    longitude: longitude === null ? null : Number(longitude),
  };
}

function mapEngineer(engineer) {
  const availability = String(engineer.availability || "offline").toLowerCase();
  return {
    id: engineer.id,
    userId: engineer.user_id,
    name: engineer.name || engineer.full_name || "Unnamed engineer",
    email: engineer.email || "",
    specialization: String(engineer.specialization || "general").replaceAll("_", " "),
    phone: engineer.phone || "",
    status: ENGINEER_STATUS_LABELS[availability] || availability,
    rawStatus: availability,
    completedJobs: Number(engineer.completed_jobs || 0),
    rating: Number(engineer.performance_rating || 0),
    latitude:
      engineer.latitude === null || engineer.latitude === undefined
        ? null
        : Number(engineer.latitude),
    longitude:
      engineer.longitude === null || engineer.longitude === undefined
        ? null
        : Number(engineer.longitude),
    updatedAt: engineer.updated_at || null,
  };
}

function mapAssignment(assignment) {
  return {
    id: assignment.id,
    faultId: assignment.fault_id,
    faultType: String(assignment.fault_type || "Fault").replaceAll("_", " "),
    severity: String(assignment.severity || "medium").toLowerCase(),
    engineerId: assignment.engineer_id,
    engineerName: assignment.engineer_name || "Unassigned engineer",
    status: String(assignment.status || "assigned").replaceAll("_", " "),
    notes: assignment.notes || "No notes added.",
    assignedAt: assignment.assigned_at || null,
    completedAt: assignment.completed_at || null,
  };
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeValue(value) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

// Pure request function: fetches and maps all three collections.
// It never touches component state, so it is safe to call from an effect.
async function fetchDashboard(signal) {
  const results = await Promise.allSettled([
    apiGet("/faults", signal),
    apiGet("/engineers", signal),
    apiGet("/assignments", signal),
  ]);

  // Expired or missing token
  if (results.some((r) => r.status === "rejected" && r.reason?.status === 401)) {
    return { unauthorized: true };
  }

  const warnings = [];
  const read = (result, label, key, mapper) => {
    if (result.status === "fulfilled") {
      return readCollection(result.value, key).map(mapper);
    }
    warnings.push(`${label} could not be loaded: ${result.reason?.message || "Request failed"}`);
    return null; // null = keep whatever is already on screen
  };

  return {
    faults: read(results[0], "Faults", "faults", mapFault),
    engineers: read(results[1], "Engineers", "engineers", mapEngineer),
    assignments: read(results[2], "Assignments", "assignments", mapAssignment),
    warnings,
    allFailed: results.every((r) => r.status === "rejected"),
  };
}

function StatCard({ title, value, detail, icon: Icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    FAULT_STATUS_STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const normalized = String(severity || "medium").toLowerCase();
  const style = SEVERITY_STYLES[normalized] || SEVERITY_STYLES.medium;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>
      {normalized}
    </span>
  );
}

function OverviewMap({ faults, engineers }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, { zoomControl: true }).setView(
      [5.0333, 7.9167],
      11
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapElementRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      hasFittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points = [];

    faults.forEach((fault) => {
      if (!isValidCoordinate(fault.latitude, fault.longitude)) return;
      const marker = L.circleMarker([fault.latitude, fault.longitude], {
        radius: 8,
        color: "#b91c1c",
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: 0.85,
      }).bindPopup(
        `<strong>Fault #${esc(fault.id)}</strong><br>${esc(fault.site)}<br>Status: ${esc(fault.status)}<br>Severity: ${esc(fault.severity)}`
      );
      marker.addTo(layer);
      points.push([fault.latitude, fault.longitude]);
    });

    engineers.forEach((engineer) => {
      if (!isValidCoordinate(engineer.latitude, engineer.longitude)) return;
      const marker = L.circleMarker([engineer.latitude, engineer.longitude], {
        radius: 7,
        color: "#166534",
        weight: 2,
        fillColor: "#22c55e",
        fillOpacity: 0.85,
      }).bindPopup(
        `<strong>${esc(engineer.name)}</strong><br>Engineer<br>Status: ${esc(engineer.status)}`
      );
      marker.addTo(layer);
      points.push([engineer.latitude, engineer.longitude]);
    });

    // Only auto-fit the first time there are points, so refreshes
    // don't override wherever the user has panned or zoomed.
    if (points.length > 0 && !hasFittedRef.current) {
      if (points.length === 1) {
        map.setView(points[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 14 });
      }
      hasFittedRef.current = true;
    }
  }, [faults, engineers]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div ref={mapElementRef} className="h-[340px] w-full" aria-label="Fault and engineer locations map" />
    </div>
  );
}

export default function AdminDashboard() {
  const [faults, setFaults] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // The effect only starts the requests. State is updated after they
  // finish (asynchronously), never synchronously in the effect body.
  useEffect(() => {
    const controller = new AbortController();

    fetchDashboard(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;

        if (data.unauthorized) {
          clearToken();
          window.location.href = LOGIN_PATH;
          return;
        }

        if (data.faults) setFaults(data.faults);
        if (data.engineers) setEngineers(data.engineers);
        if (data.assignments) setAssignments(data.assignments);
        setWarnings(data.warnings);
        setError(
          data.allFailed
            ? "Dashboard data could not be loaded. Check that the backend is running, that you are logged in, and that your account is allowed to access these endpoints."
            : ""
        );
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === "AbortError") return;
        setError(err.message || "Dashboard data could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [reloadKey]);

  // Event handlers can set state freely. Changing reloadKey re-runs the effect.
  const handleRefresh = () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setError("");
    setWarnings([]);
    setReloadKey((key) => key + 1);
  };

  const totalFaults = faults.length;
  const openFaults = faults.filter((fault) =>
    ["pending", "assigned", "in_progress"].includes(fault.rawStatus)
  ).length;
  const criticalFaults = faults.filter(
    (fault) => fault.severity === "critical" && fault.rawStatus !== "resolved" && fault.rawStatus !== "cancelled"
  ).length;
  const resolvedFaults = faults.filter((fault) => fault.rawStatus === "resolved").length;
  const availableEngineers = engineers.filter((engineer) => engineer.rawStatus === "available").length;
  const activeAssignments = assignments.filter(
    (assignment) => !["completed", "cancelled", "rejected"].includes(assignment.status.toLowerCase())
  ).length;
  const resolutionRate = totalFaults ? Math.round((resolvedFaults / totalFaults) * 100) : 0;

  const statusBreakdown = useMemo(() => {
    const order = [
      ["Awaiting assignment", "pending", "bg-amber-500"],
      ["Assigned", "assigned", "bg-blue-500"],
      ["In progress", "in_progress", "bg-violet-500"],
      ["Resolved", "resolved", "bg-emerald-500"],
      ["Cancelled", "cancelled", "bg-slate-400"],
    ];
    return order.map(([label, rawStatus, color]) => ({
      label,
      color,
      count: faults.filter((fault) => fault.rawStatus === rawStatus).length,
    }));
  }, [faults]);

  const engineerBreakdown = useMemo(() => {
    return [
      { label: "Available", count: engineers.filter((e) => e.rawStatus === "available").length, color: "bg-emerald-500" },
      { label: "On assignment", count: engineers.filter((e) => e.rawStatus === "busy").length, color: "bg-blue-500" },
      { label: "Off duty", count: engineers.filter((e) => e.rawStatus === "offline").length, color: "bg-slate-400" },
    ];
  }, [engineers]);

  const filteredFaults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...faults].sort((a, b) => timeValue(b.reportedAt) - timeValue(a.reportedAt));
    if (!term) return sorted;
    return sorted.filter((fault) =>
      [fault.id, fault.title, fault.site, fault.status, fault.severity, fault.description]
        .some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [faults, searchTerm]);

  const recentFaults = filteredFaults.slice(0, 6);

  const recentAssignments = useMemo(
    () =>
      [...assignments]
        .sort((a, b) => timeValue(b.assignedAt) - timeValue(a.assignedAt))
        .slice(0, 5),
    [assignments]
  );

  const allOpenCriticalFaults = useMemo(
    () =>
      faults
        .filter((fault) => fault.severity === "critical" && !["resolved", "cancelled"].includes(fault.rawStatus))
        .sort((a, b) => timeValue(b.reportedAt) - timeValue(a.reportedAt)),
    [faults]
  );
  const openCriticalFaults = allOpenCriticalFaults.slice(0, 5);
  const hiddenCriticalCount = allOpenCriticalFaults.length - openCriticalFaults.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 lg:flex">
      {/* Sidebar sits beside the content and stays in view while scrolling */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:overflow-y-auto">
        <Sidebar />
      </div>

      <main className="min-h-screen min-w-0 flex-1 px-4 py-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-blue-700">MainPower Electricity Distribution Limited</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Dashboard Overview
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live summary of reported faults, engineer availability, and work assignments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-500">Last updated</p>
                <p className="text-sm font-medium text-slate-700">
                  {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </header>

          {loading && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <RefreshCw size={16} className="animate-spin" /> Loading dashboard data from the server...
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Unable to load dashboard</p>
              <p className="mt-1">{error}</p>
            </div>
          )}
          {warnings.length > 0 && !loading && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Some dashboard sections may be incomplete</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total faults"
              value={totalFaults}
              detail="Fault records returned by the API"
              icon={Zap}
              iconClass="bg-blue-50 text-blue-700"
            />
            <StatCard
              title="Open faults"
              value={openFaults}
              detail="Pending, assigned, or in progress"
              icon={Activity}
              iconClass="bg-amber-50 text-amber-700"
            />
            <StatCard
              title="Critical faults"
              value={criticalFaults}
              detail="Critical faults not yet resolved"
              icon={AlertTriangle}
              iconClass="bg-red-50 text-red-700"
            />
            <StatCard
              title="Available engineers"
              value={`${availableEngineers} / ${engineers.length}`}
              detail="Current availability in the engineers table"
              icon={Users}
              iconClass="bg-emerald-50 text-emerald-700"
            />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Fault status breakdown</h2>
                  <p className="text-sm text-slate-500">Counts are calculated from current fault records.</p>
                </div>
                <div className="text-sm text-slate-500">{totalFaults} total</div>
              </div>
              <div className="space-y-4">
                {statusBreakdown.map((item) => {
                  const percent = totalFaults ? Math.round((item.count / totalFaults) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="tabular-nums text-slate-500">{item.count} ({percent}%)</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Resolved faults</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{resolvedFaults}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Resolution rate</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{resolutionRate}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Engineer availability</h2>
                  <p className="text-sm text-slate-500">Current status from the API</p>
                </div>
                <Users className="text-slate-400" size={20} />
              </div>
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[10px] border-emerald-100 bg-emerald-50">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-700">{engineers.length ? Math.round((availableEngineers / engineers.length) * 100) : 0}%</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">Available</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{engineers.length}</p>
                  <p className="text-sm text-slate-500">Engineers in records</p>
                  <p className="mt-1 text-xs text-slate-400">Completed job totals are shown in the table below.</p>
                </div>
              </div>
              <div className="space-y-4">
                {engineerBreakdown.map((item) => {
                  const percent = engineers.length ? Math.round((item.count / engineers.length) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold tabular-nums text-slate-800">{item.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent fault reports</h2>
                  <p className="text-sm text-slate-500">Most recently reported faults available from the server.</p>
                </div>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search faults..."
                  aria-label="Search faults"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-56"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">Fault / site</th>
                      <th className="pb-3 pr-4 font-semibold">Severity</th>
                      <th className="pb-3 pr-4 font-semibold">Status</th>
                      <th className="pb-3 pr-4 font-semibold">Reported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentFaults.map((fault) => (
                      <tr key={fault.id} className="align-top hover:bg-slate-50/80">
                        <td className="py-3 pr-4">
                          <p className="font-semibold capitalize text-slate-800">{fault.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{fault.site} · #{fault.id}</p>
                        </td>
                        <td className="py-3 pr-4"><SeverityBadge severity={fault.severity} /></td>
                        <td className="py-3 pr-4"><StatusBadge status={fault.status} /></td>
                        <td className="py-3 pr-4 whitespace-nowrap text-xs text-slate-500">{formatDate(fault.reportedAt)}</td>
                      </tr>
                    ))}
                    {!loading && recentFaults.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-500">
                          {faults.length === 0
                            ? "No fault reports have been recorded yet."
                            : "No faults matched your search."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Critical fault alerts</h2>
                  <p className="text-sm text-slate-500">Open critical-severity fault records</p>
                </div>
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="space-y-3">
                {openCriticalFaults.map((fault) => (
                  <div key={fault.id} className="rounded-xl border border-red-100 bg-red-50/70 p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-red-100 p-2 text-red-700"><AlertTriangle size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold capitalize text-slate-900">{fault.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{fault.site}</p>
                        <p className="mt-1 text-xs text-slate-500">Fault #{fault.id} · {formatDate(fault.reportedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenCriticalCount > 0 && (
                  <p className="text-center text-xs font-medium text-red-700">
                    +{hiddenCriticalCount} more open critical {hiddenCriticalCount === 1 ? "fault" : "faults"}
                  </p>
                )}
                {!loading && openCriticalFaults.length === 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="mb-2" size={20} />
                    No open critical faults were found in the loaded records.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">GPS location overview</h2>
                  <p className="text-sm text-slate-500">Only records with valid latitude and longitude are plotted.</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Faults</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Engineers</span>
                </div>
              </div>
              <OverviewMap faults={faults} engineers={engineers} />
              <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                <MapPin className="mt-0.5 shrink-0" size={14} /> The map uses OpenStreetMap tiles. Missing coordinates will not appear on the map.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent assignments</h2>
                  <p className="text-sm text-slate-500">Assignments returned by the backend</p>
                </div>
                <Activity className="text-slate-400" size={20} />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">Active assignments</p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">{activeAssignments}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Completed</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">{assignments.filter((a) => a.status.toLowerCase() === "completed").length}</p>
                </div>
              </div>
              <div className="space-y-3">
                {recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold capitalize text-slate-800">{assignment.faultType}</p>
                        <p className="mt-1 text-xs text-slate-500">Fault #{assignment.faultId} · {assignment.engineerName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">{assignment.status}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{assignment.notes}</p>
                  </div>
                ))}
                {!loading && recentAssignments.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No assignments are available.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Engineer directory</h2>
                <p className="text-sm text-slate-500">Engineer details and recorded completed-job totals.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Wifi size={16} /> {availableEngineers} currently available
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">Engineer</th>
                    <th className="pb-3 pr-4 font-semibold">Specialization</th>
                    <th className="pb-3 pr-4 font-semibold">Availability</th>
                    <th className="pb-3 pr-4 font-semibold">Completed jobs</th>
                    <th className="pb-3 pr-4 font-semibold">Rating</th>
                    <th className="pb-3 font-semibold">GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {engineers.slice(0, 10).map((engineer) => (
                    <tr key={engineer.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-800">{engineer.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{engineer.email || engineer.phone || `Engineer #${engineer.id}`}</p>
                      </td>
                      <td className="py-3 pr-4 capitalize text-slate-600">{engineer.specialization}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${engineer.rawStatus === "available" ? "bg-emerald-50 text-emerald-700" : engineer.rawStatus === "busy" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                          {engineer.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-slate-700">{engineer.completedJobs}</td>
                      <td className="py-3 pr-4 tabular-nums text-slate-700">{engineer.rating ? engineer.rating.toFixed(1) : "—"}</td>
                      <td className="py-3">
                        {isValidCoordinate(engineer.latitude, engineer.longitude) ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700"><MapPin size={14} /> Located</span>
                        ) : (
                          <span className="text-xs text-slate-400">No coordinates</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && engineers.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-500">No engineer records were returned.</td></tr>
                  )}
                </tbody>
              </table>
              {engineers.length > 10 && (
                <p className="mt-3 text-xs text-slate-500">Showing 10 of {engineers.length} engineer records.</p>
              )}
            </div>
          </section>

          <footer className="mt-6 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2"><Clock3 size={14} /> Data is based on the latest successful API response.</span>
            <span>Historical trends, AI match scores, and system-health metrics are not shown because no live endpoints for them are connected here.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}