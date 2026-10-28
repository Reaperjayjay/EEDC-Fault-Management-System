import { Component, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  Zap,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Bell,
  Activity,
  Wrench,
} from "lucide-react";

/* =====================================================================
   Sample data. Replace with your API data (see the TODO near the bottom).

   Outage shape:
   {
     id, title, description, startedAt (ISO), cause (string | null),
     severity: "Low" | "Medium" | "High" | "Critical",
     status: "Reported" | "Under Investigation" | "Repair in Progress" | "Restored",
     affected: {
       site, lat, lng, radiusM,
       streets: [], communities: [],
       customers: number | null,
       transformer, feeder, line,
     },
     relatedFaults: [{ id, label, lat, lng }],
     repair: {
       team, inspectionStatus, repairStatus,
       workCompleted: [], estimatedRestoration (ISO | null), actualRestoration (ISO | null),
     },
   }

   Overview counts:
   - Total active = every outage that is not "Restored"
   - Ongoing      = status "Repair in Progress" (a crew is working on it)
   - Resolved     = status "Restored"
   - Critical     = active outages with severity "Critical"
   ===================================================================== */

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const ahead = (min) => new Date(Date.now() + min * 60000).toISOString();

const sampleOutages = [
  {
    id: "OUT-2031",
    title: "Feeder trip at Gwarinpa Substation",
    description:
      "A tripped 11kV feeder has cut power to a large part of Gwarinpa. A replacement transformer is being installed.",
    startedAt: ago(185),
    cause: "Transformer overload and tripped feeder",
    severity: "Critical",
    status: "Repair in Progress",
    affected: {
      site: "Gwarinpa Substation",
      lat: 9.1108,
      lng: 7.4045,
      radiusM: 1500,
      streets: ["1st Avenue", "3rd Avenue", "Estate Road"],
      communities: ["Gwarinpa Estate", "Life Camp"],
      customers: 4200,
      transformer: "TX-GW-07 (500 kVA)",
      feeder: "11kV Feeder GW-2",
      line: "Distribution Line L-14",
    },
    relatedFaults: [
      { id: "FLT-1040", label: "Line breakage", lat: 9.1152, lng: 7.4102 },
      { id: "FLT-1041", label: "Transformer failure", lat: 9.1075, lng: 7.3996 },
    ],
    repair: {
      team: "Crew B (Aisha Bello, Emeka Eze)",
      inspectionStatus: "Completed",
      repairStatus: "In progress",
      workCompleted: [
        "Area isolated and made safe",
        "Fault located on the feeder",
        "Replacement transformer delivered to site",
      ],
      estimatedRestoration: ahead(95),
      actualRestoration: null,
    },
  },
  {
    id: "OUT-2030",
    title: "Outage in Wuse II",
    description: "Power lost in parts of Wuse II. A crew is on the way to inspect the substation.",
    startedAt: ago(50),
    cause: null,
    severity: "High",
    status: "Under Investigation",
    affected: {
      site: "Wuse II Substation",
      lat: 9.0765,
      lng: 7.4721,
      radiusM: 900,
      streets: ["Aminu Kano Crescent", "Ibrahim Babangida Way"],
      communities: ["Wuse II"],
      customers: null,
      transformer: "TX-WS-03",
      feeder: "11kV Feeder WS-1",
      line: null,
    },
    relatedFaults: [{ id: "FLT-1039", label: "Power outage report", lat: 9.0801, lng: 7.4685 }],
    repair: {
      team: "Crew A (Chinedu Okafor)",
      inspectionStatus: "In progress",
      repairStatus: "Not started",
      workCompleted: [],
      estimatedRestoration: null,
      actualRestoration: null,
    },
  },
  {
    id: "OUT-2029",
    title: "Low supply in Kubwa Phase 3",
    description: "Customers report no supply since the evening. Awaiting review by the control room.",
    startedAt: ago(20),
    cause: null,
    severity: "Medium",
    status: "Reported",
    affected: {
      site: "Kubwa Phase 3 Injection Substation",
      lat: 9.156,
      lng: 7.327,
      radiusM: 700,
      streets: ["Phase 3 Layout"],
      communities: ["Kubwa"],
      customers: 900,
      transformer: null,
      feeder: "11kV Feeder KB-4",
      line: null,
    },
    relatedFaults: [],
    repair: {
      team: null,
      inspectionStatus: "Not started",
      repairStatus: "Not started",
      workCompleted: [],
      estimatedRestoration: null,
      actualRestoration: null,
    },
  },
  {
    id: "OUT-2027",
    title: "Blown fuse in Maitama",
    description: "A blown fuse interrupted supply to a small section of Maitama. Supply has been restored.",
    startedAt: ago(600),
    cause: "Blown fuse on a pole-mounted transformer",
    severity: "Low",
    status: "Restored",
    affected: {
      site: "Maitama Distribution Point",
      lat: 9.0963,
      lng: 7.4948,
      radiusM: 500,
      streets: ["Gana Street"],
      communities: ["Maitama"],
      customers: 250,
      transformer: "TX-MT-11",
      feeder: "11kV Feeder MT-2",
      line: null,
    },
    relatedFaults: [],
    repair: {
      team: "Crew C (Fatima Musa)",
      inspectionStatus: "Completed",
      repairStatus: "Completed",
      workCompleted: ["Faulty fuse replaced", "Load tested and supply restored"],
      estimatedRestoration: ago(300),
      actualRestoration: ago(240),
    },
  },
];

const sampleNotifications = [
  { id: 1, type: "alert", outageId: "OUT-2029", message: "New outage reported in Kubwa Phase 3.", time: ago(20) },
  { id: 2, type: "eta", outageId: "OUT-2031", message: "Estimated restoration for Gwarinpa updated to about 1 hr 35 min from now.", time: ago(35) },
  { id: 3, type: "delay", outageId: "OUT-2031", message: "Repair delayed while the replacement transformer was brought to site.", time: ago(70) },
  { id: 4, type: "alert", outageId: "OUT-2030", message: "New outage reported in Wuse II.", time: ago(50) },
  { id: 5, type: "restored", outageId: "OUT-2027", message: "Power has been restored in Maitama.", time: ago(240) },
];

const sampleHistory = [
  { id: "OUT-2018", title: "Cable fault in Garki", startedAt: ago(60 * 24 * 3), endedAt: ago(60 * 24 * 3 - 330), cause: "Damaged underground cable", action: "Cable section spliced and tested" },
  { id: "OUT-2012", title: "Pole damage in Asokoro", startedAt: ago(60 * 24 * 6), endedAt: ago(60 * 24 * 6 - 540), cause: "Vehicle collision with a pole", action: "Pole replaced and lines re-strung" },
  { id: "OUT-2009", title: "Planned maintenance in Jabi", startedAt: ago(60 * 24 * 9), endedAt: ago(60 * 24 * 9 - 180), cause: "Scheduled substation maintenance", action: "Maintenance completed on schedule" },
  { id: "OUT-1998", title: "Feeder overload in Lugbe", startedAt: ago(60 * 24 * 14), endedAt: ago(60 * 24 * 14 - 410), cause: "Feeder overload during peak demand", action: "Load rebalanced across two feeders" },
];

/* ---------- Helpers ---------- */

const isActive = (o) => o.status !== "Restored";

const severityStyles = {
  Low: "bg-gray-50 text-gray-600 border-gray-200",
  Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
};

const severityColor = { Low: "#9ca3af", Medium: "#eab308", High: "#f97316", Critical: "#ef4444" };
const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const statusStyles = {
  Reported: "bg-orange-50 text-orange-700 border-orange-200",
  "Under Investigation": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Repair in Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Restored: "bg-green-50 text-green-700 border-green-200",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Badge({ className, children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] ${className}`}>
      {children}
    </span>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      {title && <h3 className="mb-4 text-sm text-gray-900">{title}</h3>}
      {children}
    </section>
  );
}

function Field({ label, children, muted }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm ${empty || muted ? "text-gray-400" : "text-gray-900"}`}>
        {empty ? "Not available yet" : children}
      </p>
    </div>
  );
}

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

/* ---------- 1. Outage Overview ---------- */

function OutageOverview({ outages, filter, onFilter }) {
  const cards = [
    { key: "active", label: "Total Active Outages", value: outages.filter(isActive).length, color: "text-gray-900", icon: Zap, iconBg: "bg-gray-100 text-gray-600" },
    { key: "ongoing", label: "Ongoing Outages", value: outages.filter((o) => o.status === "Repair in Progress").length, color: "text-blue-600", icon: Wrench, iconBg: "bg-blue-50 text-blue-500" },
    { key: "resolved", label: "Resolved Outages", value: outages.filter((o) => o.status === "Restored").length, color: "text-green-600", icon: CheckCircle2, iconBg: "bg-green-50 text-green-500" },
    { key: "critical", label: "Critical Outages", value: outages.filter((o) => isActive(o) && o.severity === "Critical").length, color: "text-red-500", icon: AlertTriangle, iconBg: "bg-red-50 text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const selected = filter === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter(selected ? null : c.key)}
            aria-pressed={selected}
            className={`rounded-2xl border bg-white p-4 text-left transition ${
              selected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-medium ${c.color}`}>{c.value}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Outage list (pick which outage to view) ---------- */

function OutageList({ outages, total, selectedId, onSelect, query, onQuery }) {
  return (
    <Card title={`Outages (${outages.length})`} className="lg:self-start">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search ID, area or site..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
        />
      </div>

      <div className="max-h-[32rem] space-y-2 overflow-y-auto">
        {outages.map((o) => {
          const selected = o.id === selectedId;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-900">{o.title}</p>
                <Badge className={severityStyles[o.severity]}>{o.severity}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {o.id} · {o.affected.site}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Badge className={statusStyles[o.status]}>{o.status}</Badge>
                <span className="text-[11px] text-gray-400">{timeAgo(o.startedAt)}</span>
              </div>
            </button>
          );
        })}

        {outages.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">
            {total === 0 ? "No outages reported." : "No outages match your filter."}
          </p>
        )}
      </div>
    </Card>
  );
}

/* ---------- 2. Outage Details ---------- */

function OutageDetails({ outage }) {
  const end = outage.repair.actualRestoration ? new Date(outage.repair.actualRestoration).getTime() : Date.now();
  const duration = formatDuration(end - new Date(outage.startedAt).getTime());

  return (
    <Card title="Outage Details">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Outage ID</p>
          <p className="text-sm font-medium text-gray-900">{outage.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={severityStyles[outage.severity]}>{outage.severity} severity</Badge>
          <Badge className={statusStyles[outage.status]}>{outage.status}</Badge>
        </div>
      </div>

      <h4 className="mt-4 text-base text-gray-900">{outage.title}</h4>
      <p className="mt-1 text-sm text-gray-600">{outage.description}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Started">{formatDateTime(outage.startedAt)}</Field>
        <Field label={outage.repair.actualRestoration ? "Total duration" : "Ongoing for"}>{duration}</Field>
        <Field label="Cause">{outage.cause ?? "Still being investigated"}</Field>
      </div>
    </Card>
  );
}

/* ---------- 3. Affected Areas ---------- */

function Chips({ items }) {
  if (!items?.length) return <p className="mt-0.5 text-sm text-gray-400">Not available yet</p>;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li key={i} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
          {i}
        </li>
      ))}
    </ul>
  );
}

function AffectedAreas({ outage }) {
  const a = outage.affected;
  return (
    <Card title="Affected Areas">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Site / substation">{a.site}</Field>
        <Field label="Affected customers">
          {Number.isFinite(a.customers) ? a.customers.toLocaleString() : null}
        </Field>
        <div>
          <p className="text-xs text-gray-500">Affected streets</p>
          <Chips items={a.streets} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Affected communities</p>
          <Chips items={a.communities} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
        <Field label="Transformer">{a.transformer}</Field>
        <Field label="Feeder">{a.feeder}</Field>
        <Field label="Distribution line">{a.line}</Field>
      </div>
    </Card>
  );
}

/* ---------- 4. Outage Location Map ---------- */

function dotIcon(color, size = 18) {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  });
}

function FitPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [50, 50] });
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

function OutageMap({ outage }) {
  const a = outage.affected;
  const siteOk = Number.isFinite(a.lat) && Number.isFinite(a.lng);
  const faults = outage.relatedFaults.filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng));
  const color = severityColor[outage.severity];

  const points = useMemo(() => {
    const p = [];
    if (siteOk) p.push([a.lat, a.lng]);
    faults.forEach((f) => p.push([f.lat, f.lng]));
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outage]);

  return (
    <Card title="Outage Location Map">
      <ErrorBoundary title="The map failed to load">
        <div className="relative isolate h-72 overflow-hidden rounded-xl border border-gray-200 md:h-80">
          {siteOk ? (
            <MapContainer
              center={[a.lat, a.lng]}
              zoom={14}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ResizeFix />
              <FitPoints points={points} />

              {Number.isFinite(a.radiusM) && (
                <Circle
                  center={[a.lat, a.lng]}
                  radius={a.radiusM}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 2 }}
                />
              )}

              <Marker position={[a.lat, a.lng]} icon={dotIcon(color, 22)}>
                <Tooltip direction="top" offset={[0, -10]}>{a.site}</Tooltip>
              </Marker>

              {faults.map((f) => (
                <Marker key={f.id} position={[f.lat, f.lng]} icon={dotIcon("#2563eb", 14)}>
                  <Tooltip direction="top" offset={[0, -8]}>{f.id} · {f.label}</Tooltip>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-xs text-gray-400">
              <MapPin className="mb-2 h-6 w-6" />
              Location not available.
            </div>
          )}
        </div>
      </ErrorBoundary>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> Affected site and area
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Related fault ({faults.length})
          </span>
        </div>
        <span>
          GPS: {siteOk ? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}` : "—"}
        </span>
      </div>
    </Card>
  );
}

/* ---------- 5. Repair and Restoration Progress ---------- */

function RepairProgress({ outage }) {
  const r = outage.repair;
  const restored = outage.status === "Restored";

  return (
    <Card title="Repair and Restoration Progress">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Assigned engineer / repair team">{r.team}</Field>
        <Field label="Inspection status">{r.inspectionStatus}</Field>
        <Field label="Repair status">{r.repairStatus}</Field>
        <Field label="Estimated restoration time">
          {r.estimatedRestoration ? formatDateTime(r.estimatedRestoration) : null}
        </Field>
        <Field label="Actual restoration time">
          {r.actualRestoration ? formatDateTime(r.actualRestoration) : restored ? null : "Not restored yet"}
        </Field>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs text-gray-500">Work completed</p>
        {r.workCompleted.length === 0 ? (
          <p className="text-sm text-gray-400">No work completed yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {r.workCompleted.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm text-gray-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ---------- 6. Outage Notifications ---------- */

const notificationTypes = {
  alert: { icon: AlertTriangle, wrap: "bg-red-100 text-red-600", card: "border-red-200 bg-red-50" },
  eta: { icon: Clock, wrap: "bg-blue-100 text-blue-600", card: "border-blue-200 bg-blue-50" },
  delay: { icon: AlertCircle, wrap: "bg-orange-100 text-orange-600", card: "border-orange-200 bg-orange-50" },
  restored: { icon: CheckCircle2, wrap: "bg-green-100 text-green-600", card: "border-green-200 bg-green-50" },
};

function Notifications({ notifications, onSelect }) {
  const sorted = [...notifications].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <Card title="Outage Notifications">
      {sorted.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">
          <Bell className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          No notifications yet.
        </div>
      ) : (
        <div className="max-h-96 space-y-2.5 overflow-y-auto">
          {sorted.map((n) => {
            const t = notificationTypes[n.type] ?? notificationTypes.eta;
            const Icon = t.icon;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => n.outageId && onSelect(n.outageId)}
                className={`flex w-full gap-3 rounded-xl border px-3 py-2.5 text-left ${t.card}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.wrap}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-800">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {n.outageId} · {timeAgo(n.time)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------- 7. Outage History ---------- */

function OutageHistory({ history }) {
  return (
    <Card title="Outage History">
      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No previous outages.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                {["Outage", "Start", "End", "Duration", "Cause", "Corrective action"].map((h) => (
                  <th key={h} className="py-2.5 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 align-top last:border-0">
                  <td className="py-3 pr-4">
                    <p className="text-gray-900">{h.title}</p>
                    <p className="text-[11px] text-gray-400">{h.id}</p>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-gray-600">{formatDateTime(h.startedAt)}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-gray-600">{formatDateTime(h.endedAt)}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-gray-900">
                    {formatDuration(new Date(h.endedAt) - new Date(h.startedAt))}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{h.cause ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">{h.action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------- Page ---------- */

export default function OutageInformation() {
  // TODO: replace these with data fetched from your API
  const [outages] = useState(sampleOutages);
  const [notifications] = useState(sampleNotifications);
  const [history] = useState(sampleHistory);

  const [filter, setFilter] = useState(null); // null | "active" | "ongoing" | "resolved" | "critical"
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return outages
      .filter((o) => {
        if (filter === "active") return isActive(o);
        if (filter === "ongoing") return o.status === "Repair in Progress";
        if (filter === "resolved") return o.status === "Restored";
        if (filter === "critical") return isActive(o) && o.severity === "Critical";
        return true;
      })
      .filter(
        (o) =>
          !q ||
          [o.id, o.title, o.affected.site, ...o.affected.communities, ...o.affected.streets].some((v) =>
            String(v ?? "").toLowerCase().includes(q)
          )
      )
      .sort(
        (a, b) =>
          Number(!isActive(a)) - Number(!isActive(b)) ||
          severityRank[a.severity] - severityRank[b.severity] ||
          new Date(b.startedAt) - new Date(a.startedAt)
      );
  }, [outages, filter, query]);

  const selected = filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  const selectFromNotification = (id) => {
    setFilter(null);
    setQuery("");
    setSelectedId(id);
  };

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-5">
      <div className="mb-5">
        <h2 className="text-xl font-medium md:text-2xl">Outage Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          See current power outages, affected areas and restoration progress
        </p>
      </div>

      <div className="space-y-5">
        <OutageOverview outages={outages} filter={filter} onFilter={setFilter} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <OutageList
            outages={filtered}
            total={outages.length}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            query={query}
            onQuery={setQuery}
          />

          <div className="min-w-0 space-y-5">
            {selected ? (
              <>
                <OutageDetails outage={selected} />
                <AffectedAreas outage={selected} />
                <OutageMap outage={selected} />
                <RepairProgress outage={selected} />
              </>
            ) : (
              <Card>
                <div className="py-10 text-center text-sm text-gray-400">
                  <Activity className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                  No outage selected.
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Notifications notifications={notifications} onSelect={selectFromNotification} />
          <OutageHistory history={history} />
        </div>
      </div>
    </div>
  );
}