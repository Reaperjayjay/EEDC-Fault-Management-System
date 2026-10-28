import { Component, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  SearchX,
  Check,
  MapPin,
  Phone,
  UserX,
  UserCheck,
  RefreshCw,
  Clock,
  HelpCircle,
  CheckCircle2,
  Bell,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api/v1";

// Database status -> stage names used by the timeline
const statusMap = {
  pending: "Report Submitted",
  assigned: "Engineer Assigned",
  in_progress: "Repair in Progress",
  resolved: "Fault Resolved",
  cancelled: "Cancelled",
};

const toNumber = (v) => (v !== null && v !== undefined && v !== "" ? Number(v) : null);

/* ---------- Error boundary (shows the real error instead of a blank page) ---------- */

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <p className="font-medium">{this.props.title ?? "Something went wrong"}</p>
          <pre className="mt-1 whitespace-pre-wrap break-words">
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Shared helpers (stages, colours, date format) ---------- */

// The 9 stages a fault passes through, in order
const STAGES = [
  "Report Submitted",
  "Under Review",
  "Approved",
  "Engineer Assigned",
  "Engineer En Route",
  "Site Inspection",
  "Repair in Progress",
  "Testing",
  "Fault Resolved",
];

const priorityStyles = {
  Low: "bg-gray-50 text-gray-600 border-gray-200",
  Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

function statusStyle(status) {
  if (status === "Fault Resolved") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Cancelled") return "bg-gray-50 text-gray-600 border-gray-200";
  if (status === "Report Submitted" || status === "Under Review")
    return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- 1. Fault Tracking Overview ---------- */

function Badge({ className, children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] ${className}`}>
      {children}
    </span>
  );
}

function TrackingOverview({ fault }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Fault ID</p>
          <p className="text-sm font-medium text-gray-900">{fault.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={priorityStyles[fault.priority] ?? priorityStyles.Low}>
            {fault.priority} priority
          </Badge>
          <Badge className={statusStyle(fault.status)}>{fault.status}</Badge>
        </div>
      </div>

      <h3 className="mt-4 text-base text-gray-900">{fault.title}</h3>
      <p className="mt-1 text-sm text-gray-600">{fault.description}</p>

      <p className="mt-4 text-xs text-gray-500">
        Reported on <span className="text-gray-800">{formatDateTime(fault.reportedAt)}</span>
      </p>
    </section>
  );
}

/* ---------- 2. Fault Progress Timeline ---------- */

function ProgressTimeline({ status, history = [] }) {
  const currentIndex = STAGES.indexOf(status);
  const resolved = status === "Fault Resolved";

  const stateOf = (i) => {
    if (currentIndex === -1) return "pending";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return resolved ? "done" : "current";
    return "pending";
  };

  const timeOf = (stage) => history.find((h) => h.status === stage)?.time;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-5 text-sm text-gray-900">Fault Progress Timeline</h3>

      <ol>
        {STAGES.map((stage, i) => {
          const state = stateOf(i);
          const time = timeOf(stage);
          const isLast = i === STAGES.length - 1;

          return (
            <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-3.5 top-7 bottom-0 w-px -translate-x-1/2 ${
                    state === "done" ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}

              <span
                className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                  state === "done"
                    ? "border-green-500 bg-green-500 text-white"
                    : state === "current"
                    ? "border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100"
                    : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : state === "current" ? (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                ) : (
                  i + 1
                )}
              </span>

              <div className="pt-0.5">
                <p
                  className={`text-sm ${
                    state === "pending" ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {stage}
                </p>
                <p className="text-[11px] text-gray-400">
                  {state === "current"
                    ? `In progress${time ? ` · since ${formatDateTime(time)}` : ""}`
                    : time
                    ? formatDateTime(time)
                    : state === "pending"
                    ? "Pending"
                    : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- 3. Site Location & GPS ---------- */


function dotIcon(color) {
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  });
}

function FitPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

const has = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng);

function SiteLocation({ site, engineer }) {
  const siteOk = site && has(site.lat, site.lng);
  const engineerVisible = engineer?.shareLocation && has(engineer.lat, engineer.lng);

  const points = useMemo(() => {
    const p = [];
    if (siteOk) p.push([site.lat, site.lng]);
    if (engineerVisible) p.push([engineer.lat, engineer.lng]);
    return p;
  }, [siteOk, engineerVisible, site, engineer]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm text-gray-900">Site Location & GPS</h3>

      <dl className="mb-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Fault site address</dt>
          <dd className="text-gray-900">{site?.address || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">GPS coordinates</dt>
          <dd className="text-gray-900">
            {siteOk ? `${site.lat.toFixed(5)}, ${site.lng.toFixed(5)}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Estimated arrival</dt>
          <dd className="text-gray-900">
            {engineer?.eta ?? "Not available yet"}
          </dd>
        </div>
      </dl>

      <ErrorBoundary title="The map failed to load">
        <div className="relative isolate h-64 overflow-hidden rounded-xl border border-gray-200">
          {siteOk ? (
            <MapContainer
              center={[site.lat, site.lng]}
              zoom={15}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ResizeFix />
              <FitPoints points={points} />

              <Marker position={[site.lat, site.lng]} icon={dotIcon("#ef4444")}>
                <Tooltip direction="top" offset={[0, -8]}>Fault site</Tooltip>
              </Marker>

              {engineerVisible && (
                <Marker position={[engineer.lat, engineer.lng]} icon={dotIcon("#3b82f6")}>
                  <Tooltip direction="top" offset={[0, -8]}>{engineer.name}</Tooltip>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-xs text-gray-400">
              <MapPin className="mb-2 h-6 w-6" />
              Location not available.
            </div>
          )}
        </div>
      </ErrorBoundary>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Fault site
        </span>
        {engineerVisible && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Engineer
          </span>
        )}
      </div>

      {engineer && !engineer.shareLocation && (
        <p className="mt-2 text-[11px] text-gray-400">
          The engineer's live location is not shared for this fault.
        </p>
      )}
    </section>
  );
}

/* ---------- 4. Assigned Engineer Details ---------- */

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{children ?? "—"}</span>
    </div>
  );
}

function EngineerDetails({ engineer }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm text-gray-900">Assigned Engineer</h3>

      {!engineer ? (
        <div className="py-6 text-center text-sm text-gray-400">
          <UserX className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          No engineer assigned yet.
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm text-blue-600">
              {engineer.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <p className="text-sm text-gray-900">{engineer.name}</p>
              <p className="text-xs text-gray-500">ID: {engineer.id}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Row label="Specialization">{engineer.specialization}</Row>
            <Row label="Assignment status">{engineer.assignmentStatus}</Row>
          </div>

          {engineer.canContact && engineer.phone ? (
            <a
              href={`tel:${engineer.phone}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-blue-50 py-2.5 text-xs text-blue-600 transition hover:bg-blue-100"
            >
              <Phone className="h-3.5 w-3.5" /> Contact engineer
            </a>
          ) : (
            <p className="mt-4 text-[11px] text-gray-400">
              Direct contact is not available for this fault.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- 5. Repair Progress ---------- */

function Field({ label, children }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm ${empty ? "text-gray-400" : "text-gray-900"}`}>
        {empty ? "Not available yet" : children}
      </p>
    </div>
  );
}

function RepairProgress({ repair }) {
  const r = repair ?? {};
  const materials = r.materials ?? [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm text-gray-900">Repair Progress</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Inspection findings">{r.findings}</Field>
        <Field label="Identified cause of the fault">{r.cause}</Field>
        <Field label="Repair work performed">{r.workPerformed}</Field>
        <Field label="Testing results">{r.testingResults}</Field>
        <Field label="Estimated completion">
          {r.estimatedCompletion ? formatDateTime(r.estimatedCompletion) : null}
        </Field>

        <div>
          <p className="text-xs text-gray-500">Materials used</p>
          {materials.length === 0 ? (
            <p className="mt-0.5 text-sm text-gray-400">Not available yet</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {materials.map((m) => (
                <li key={m} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Notifications & Updates ---------- */

const types = {
  assignment: { icon: UserCheck, wrap: "bg-blue-100 text-blue-600", card: "border-blue-200 bg-blue-50" },
  status: { icon: RefreshCw, wrap: "bg-gray-100 text-gray-600", card: "border-gray-200 bg-white" },
  delay: { icon: Clock, wrap: "bg-orange-100 text-orange-600", card: "border-orange-200 bg-orange-50" },
  info: { icon: HelpCircle, wrap: "bg-yellow-100 text-yellow-700", card: "border-yellow-200 bg-yellow-50" },
  resolved: { icon: CheckCircle2, wrap: "bg-green-100 text-green-600", card: "border-green-200 bg-green-50" },
};

function Notifications({ notifications = [] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm text-gray-900">Notifications & Updates</h3>

      {notifications.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">
          <Bell className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          No updates yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const t = types[n.type] ?? types.status;
            const Icon = t.icon;
            return (
              <div key={n.id} className={`flex gap-3 rounded-xl border px-3 py-2.5 ${t.card}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.wrap}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-800">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatDateTime(n.time)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------- 7. Fault History ---------- */

function FaultHistory({ history = [] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm text-gray-900">Fault History</h3>

      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No history recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                {["Status", "Date & time", "Updated by", "Remarks"].map((h) => (
                  <th key={h} className="py-2.5 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.status}-${i}`} className="border-b border-gray-100 align-top last:border-0">
                  <td className="py-3 pr-4 text-gray-900">{h.status}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-600">{formatDateTime(h.time)}</td>
                  <td className="py-3 pr-4 text-gray-600">{h.updatedBy ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">{h.remarks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- Page ---------- */

export default function TrackMyFault() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fault, setFault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFault = async () => {
      if (!id) {
        setError("Select a fault from My Fault Reports to track it.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token") || sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to track your fault.");
        }

        const response = await fetch(`${API_BASE}/faults/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load this fault.");
        }

        // Supports the usual response shapes from the API.
        const rawFault = result.data?.fault ?? result.data?.doc ?? result.fault;

        if (!rawFault) {
          throw new Error("The server returned no fault details.");
        }

        const severity = String(rawFault.severity || "low");
        const status = statusMap[rawFault.status] || rawFault.status || "Report Submitted";

        setFault({
          id: `F-${rawFault.id}`,
          title: rawFault.fault_type
            ? rawFault.fault_type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
            : "Reported fault",
          description: rawFault.description || "No description provided.",
          priority: severity.charAt(0).toUpperCase() + severity.slice(1),
          status,
          reportedAt: rawFault.reported_at,

          // Coordinate field names match the My Fault Reports endpoint,
          // with fallbacks in case this endpoint names them differently.
          site: {
            address:
              rawFault.location ||
              rawFault.site_location ||
              rawFault.site_name ||
              rawFault.site_code ||
              "",
            lat: toNumber(
              rawFault.detected_latitude ?? rawFault.latitude ?? rawFault.site_latitude
            ),
            lng: toNumber(
              rawFault.detected_longitude ?? rawFault.longitude ?? rawFault.site_longitude
            ),
          },

          // These need assignment / repair / notification data from the backend.
          engineer: null,
          repair: null,
          notifications: [],
          history: rawFault.reported_at
            ? [
                {
                  status: "Report Submitted",
                  time: rawFault.reported_at,
                  updatedBy: "Reporter",
                  remarks: "Fault reported.",
                },
              ]
            : [],
        });
      } catch (err) {
        setError(err.message || "Unable to load this fault.");
      } finally {
        setLoading(false);
      }
    };

    fetchFault();
  }, [id]);

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-5">
      <div className="mb-5">
        <button
          onClick={() => navigate("/my-fault-reports")}
          className="mb-3 text-sm text-blue-600 hover:underline"
        >
          ← Back to My Fault Reports
        </button>
        <h2 className="text-xl font-medium md:text-2xl">Track My Fault</h2>
        <p className="mt-1 text-sm text-gray-500">
          Follow the progress of your reported fault from submission to resolution
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading fault tracking details...</p>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : !fault ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <SearchX className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No fault found to track.</p>
        </section>
      ) : (
        <div className="space-y-5">
          <TrackingOverview fault={fault} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Left column */}
            <div className="min-w-0 space-y-5">
              <ProgressTimeline status={fault.status} history={fault.history} />
              <RepairProgress repair={fault.repair} />
              <FaultHistory history={fault.history} />
            </div>

            {/* Right column */}
            <div className="min-w-0 space-y-5">
              <EngineerDetails engineer={fault.engineer} />
              <SiteLocation site={fault.site} engineer={fault.engineer} />
              <Notifications notifications={fault.notifications} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}