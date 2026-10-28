import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Hourglass,
  ThumbsUp,
  XCircle,
  CheckCircle2,
  Search,
  Eye,
  Pencil,
  ImagePlus,
  History as HistoryIcon,
  UserCog,
  Bell,
  X,
  MapPin,
  CalendarDays,
  Tag,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  Video,
  ShieldAlert,
  MessageSquare,
  Plus,
  Check,
  Inbox,
  HelpCircle,
  UserCheck,
  Lock,
  Zap,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api/v1";
const ME = "You";

/* ---------- constants & helpers ---------- */

const FLOW = ["Submitted", "Under Review", "Approved", "Assigned", "In Progress", "Resolved"];

const statusStyle = {
  Submitted: "bg-slate-100 text-slate-700 ring-slate-500/20",
  "Under Review": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Approved: "bg-teal-50 text-teal-700 ring-teal-600/20",
  Assigned: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-600/20",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Rejected: "bg-red-50 text-red-700 ring-red-600/20",
  Cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

const priorityStyle = {
  Low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
};

const priorityBar = { Low: "bg-slate-300", Medium: "bg-amber-400", High: "bg-orange-500", Critical: "bg-red-500" };

const PENDING = ["Submitted", "Under Review"];
const APPROVED = ["Approved", "Assigned", "In Progress", "Resolved"];

const card = "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

const fmtDate = (t) => new Date(t).toLocaleDateString([], { dateStyle: "medium" });
const fmtDateTime = (t) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const notifIcon = {
  info: { icon: HelpCircle, cls: "bg-amber-50 text-amber-600" },
  rejected: { icon: XCircle, cls: "bg-red-50 text-red-600" },
  approved: { icon: ThumbsUp, cls: "bg-teal-50 text-teal-600" },
  assigned: { icon: UserCheck, cls: "bg-indigo-50 text-indigo-600" },
  resolved: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
};

const statusMap = {
  pending: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

const categoryMap = {
  power_failure: "Power failure",
  transformer_fault: "Transformer",
  feeder_fault: "Feeder",
  equipment_failure: "Equipment failure",
  overheating: "Overheating",
  voltage_problem: "Voltage problem",
  other: "Other",
};

function StatusPill({ value }) {
  return <span className={`${pill} ${statusStyle[value] || statusStyle.Submitted}`}>{value}</span>;
}
function PriorityPill({ value }) {
  return <span className={`${pill} ${priorityStyle[value] || priorityStyle.Low}`}>{value}</span>;
}

/* ---------- status tracker (vertical) ---------- */

function StatusTracker({ report }) {
  const steps =
    report.status === "Rejected"
      ? ["Submitted", "Under Review", "Rejected"]
      : report.status === "Cancelled"
      ? ["Submitted", "Cancelled"]
      : FLOW;
  const current = steps.indexOf(report.status);
  const reachedAt = (s) => report.history.find((x) => x.status === s)?.at;

  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = i < current || (report.status === "Resolved" && i === current);
        const active = i === current && report.status !== "Resolved";
        const rejected = s === "Rejected" || s === "Cancelled";
        const at = reachedAt(s);
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                rejected
                  ? "bg-red-500 text-white ring-4 ring-red-100"
                  : done
                  ? "bg-emerald-500 text-white"
                  : active
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-white text-slate-400 ring-2 ring-slate-200"
              }`}
            >
              {rejected ? <X className="h-4 w-4" strokeWidth={3} /> : done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm ${rejected ? "font-semibold text-red-700" : active ? "font-semibold text-blue-700" : done ? "font-medium text-slate-800" : "text-slate-400"}`}>
                {s}
              </p>
              {at && <p className="text-xs text-slate-400">{fmtDateTime(at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- report drawer ---------- */

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-blue-600" /> {title}
      </h3>
      {children}
    </section>
  );
}

function EvidenceTile({ item }) {
  const isVideo = item.type === "video";
  if (item.url) {
    return isVideo ? (
      <video src={item.url} controls className="h-24 w-full rounded-xl bg-black object-contain" />
    ) : (
      <img src={item.url} alt={item.name} className="h-24 w-full rounded-xl object-cover" />
    );
  }
  // sample evidence has no real file, so show a placeholder tile
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 px-2 text-center">
      {isVideo ? <Video className="h-6 w-6 text-slate-400" /> : <ImageIcon className="h-6 w-6 text-slate-400" />}
      <span className="w-full truncate text-[11px] text-slate-500">{item.name}</span>
    </div>
  );
}

function ReportDrawer({ report, tab, setTab, onClose, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", priority: "" });
  const [pending, setPending] = useState([]);
  const [note, setNote] = useState("");

  const canEdit = PENDING.includes(report.status);
  const canAddEvidence = report.status !== "Resolved" && report.status !== "Rejected" && report.status !== "Cancelled";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startEdit = () => {
    setDraft({ title: report.title, description: report.description, priority: report.priority });
    setEditing(true);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    // TODO: save to your API
    onChange(report.id, draft, { status: report.status, at: Date.now(), by: ME, note: "Report edited by reporter." });
    setEditing(false);
  };

  const addFiles = (files) =>
    setPending((p) => [
      ...p,
      ...files
        .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
        .map((f, i) => ({
          id: `${Date.now()}-${i}-${f.name}`,
          name: f.name,
          type: f.type.startsWith("video/") ? "video" : "photo",
          url: URL.createObjectURL(f),
        })),
    ]);

  const removePending = (id) =>
    setPending((p) => {
      const it = p.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return p.filter((x) => x.id !== id);
    });

  const uploadEvidence = () => {
    if (!pending.length) return;
    // TODO: upload the files to your server
    onChange(
      report.id,
      { evidence: [...report.evidence, ...pending], infoRequest: report.infoRequest ? null : report.infoRequest },
      {
        status: report.status,
        at: Date.now(),
        by: ME,
        note: `Added ${pending.length} file${pending.length === 1 ? "" : "s"} of evidence${note.trim() ? `: ${note.trim()}` : "."}`,
      }
    );
    setPending([]);
    setNote("");
  };

  const tabs = [
    ["details", "Details"],
    ["evidence", `Evidence (${report.evidence.length})`],
    ["history", "History"],
    ["feedback", "Feedback"],
  ];

  const safetyRows = [
    ["Fallen electrical wire", report.safety.fallenWire, true],
    ["Smoke, fire or sparking", report.safety.fire, true],
    ["Danger to the public", report.safety.publicDanger, true],
    ["Area safe to approach", report.safety.safeToApproach, false],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-500">{report.id}</span>
                <StatusPill value={report.status} />
                <PriorityPill value={report.priority} />
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900">{report.title}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          {tab === "details" && (
            <>
              <Section title="Status tracking" icon={Zap}>
                <StatusTracker report={report} />
              </Section>

              {report.engineer && (
                <Section title="Assigned engineer" icon={UserCog}>
                  <div className="flex items-center gap-4 rounded-2xl bg-indigo-50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                      {report.engineer.name.replace("Eng. ", "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{report.engineer.name}</p>
                      <p className="text-xs text-slate-500">
                        {report.engineer.specialty} · assigned {fmtDateTime(report.engineer.assignedAt)}
                      </p>
                      <a href={`tel:${report.engineer.phone.replace(/\s/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {report.engineer.phone}
                      </a>
                    </div>
                  </div>
                </Section>
              )}

              <Section title="Full fault description" icon={ClipboardList}>
                {editing ? (
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div>
                      <label className={labelCls}>Title</label>
                      <input required className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Description</label>
                      <textarea required rows={4} className={field} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Priority</label>
                      <select className={field} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                        {["Low", "Medium", "High", "Critical"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className={btnPrimary}>Save changes</button>
                      <button type="button" onClick={() => setEditing(false)} className={btnOutline}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-slate-700">{report.description}</p>
                    <div className="mt-3">
                      {canEdit ? (
                        <button onClick={startEdit} className={btnOutline}>
                          <Pencil className="h-4 w-4" /> Edit report
                        </button>
                      ) : (
                        <p className="flex items-center gap-2 text-xs text-slate-400">
                          <Lock className="h-3.5 w-3.5" /> Reports can only be edited before they're approved.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </Section>

              <Section title="Site and GPS coordinates" icon={MapPin}>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-medium text-slate-900">{report.site}</p>
                  <p className="text-slate-500">{report.location}</p>
                  {report.gps ? (
                    <>
                      <p className="mt-2 font-mono text-[13px] text-slate-700">
                        {report.gps.lat.toFixed(5)}, {report.gps.lng.toFixed(5)}
                      </p>

                      <a
                        href={`https://www.google.com/maps?q=${report.gps.lat},${report.gps.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Open in Google Maps <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      GPS coordinates were not recorded for this report.
                    </p>
                  )}
                </div>
              </Section>

              <Section title="Equipment affected" icon={Tag}>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Equipment ID", report.equipment.id],
                    ["Type", report.equipment.type],
                    ["Condition", report.equipment.condition],
                    ["Customers affected", report.equipment.customers ?? "Not known"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-slate-50 p-3">
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className="font-medium text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              <Section title="Safety observations" icon={ShieldAlert}>
                <ul className="space-y-2">
                  {safetyRows.map(([label, value, dangerIfYes]) => {
                    const bad = (value === "yes") === dangerIfYes;
                    return (
                      <li key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
                        <span className="text-slate-700">{label}</span>
                        <span className={`${pill} ${bad ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"}`}>
                          {value === "yes" ? "Yes" : "No"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            </>
          )}

          {tab === "evidence" && (
            <>
              <Section title="Uploaded photographs and videos" icon={ImageIcon}>
                {report.evidence.length === 0 ? (
                  <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {report.evidence.map((e) => (
                      <EvidenceTile key={e.id} item={e} />
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Add more evidence" icon={ImagePlus}>
                {canAddEvidence ? (
                  <div className="space-y-3">
                    {report.infoRequest && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <span className="font-semibold">Requested: </span>{report.infoRequest}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {pending.map((p) => (
                        <div key={p.id} className="group relative">
                          <EvidenceTile item={p} />
                          <button type="button" onClick={() => removePending(p.id)} aria-label={`Remove ${p.name}`}
                            className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white hover:bg-red-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600">
                        <ImagePlus className="h-5 w-5" /> Add files
                        <input type="file" accept="image/*,video/*" multiple className="hidden"
                          onChange={(e) => { addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                      </label>
                    </div>
                    <div>
                      <label className={labelCls}>Note (optional)</label>
                      <textarea rows={2} className={field} value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Explain what the new files show..." />
                    </div>
                    <button onClick={uploadEvidence} disabled={!pending.length} className={btnPrimary}>
                      Upload evidence
                    </button>
                    <p className="text-xs text-slate-400">Files stay in the browser until you connect your server.</p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Lock className="h-4 w-4" /> Evidence can't be added to a {report.status.toLowerCase()} report.
                  </p>
                )}
              </Section>
            </>
          )}

          {tab === "history" && (
            <Section title="Status history" icon={HistoryIcon}>
              <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
                {[...report.history].reverse().map((e, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${i === 0 ? "bg-blue-600" : "bg-slate-300"}`} />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill value={e.status} />
                      {i === 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Latest</span>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{e.by}</span> · {fmtDateTime(e.at)}
                    </p>
                    {e.note && <p className="mt-1.5 rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {tab === "feedback" && (
            <>
              {report.rejectionReason && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <XCircle className="h-4 w-4" /> Why this report was rejected
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-red-700">{report.rejectionReason}</p>
                </div>
              )}
              {report.infoRequest && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <HelpCircle className="h-4 w-4" /> More information requested
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-amber-800">{report.infoRequest}</p>
                  <button onClick={() => setTab("evidence")} className={`${btnPrimary} mt-3`}>
                    <ImagePlus className="h-4 w-4" /> Add evidence
                  </button>
                </div>
              )}
              {report.feedback && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <MessageSquare className="h-4 w-4" /> Control room feedback
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">{report.feedback}</p>
                </div>
              )}
              {!report.rejectionReason && !report.infoRequest && !report.feedback && (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                  <Inbox className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">No feedback from the control room yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---------- page ---------- */

export default function MyFaultReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null); // { id, tab }

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token") || sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to view your fault reports.");
        }

        const response = await fetch(`${API_BASE}/faults/my-reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load your fault reports.");
        }

        const faults = result.data?.faults || [];

        const formattedReports = faults.map((fault) => {
          const severity = fault.severity || "low";
          const priority = severity.charAt(0).toUpperCase() + severity.slice(1);
          const reportedAt = fault.reported_at;
          const status = statusMap[fault.status] || fault.status;
          const label = categoryMap[fault.fault_type] || fault.fault_type;

          return {
            id: `F-${fault.id}`,
            databaseId: fault.id,
            title: label,
            description: fault.description || "No description provided.",
            site: fault.site_name || fault.site_code || "Unknown site",
            location: fault.location || "",
            category: label,
            priority,
            reportedAt,
            status,
            gps:
              fault.detected_latitude != null && fault.detected_longitude != null
                ? {
                    lat: Number(fault.detected_latitude),
                    lng: Number(fault.detected_longitude),
                  }
                : null,
            equipment: {
              id: "—",
              type: label,
              condition: "Not recorded",
              customers: null,
            },
            safety: {
              fallenWire: "no",
              fire: "no",
              publicDanger: "no",
              safeToApproach: "yes",
            },
            evidence: [],
            feedback: null,
            infoRequest: null,
            rejectionReason: null,
            engineer: null,
            history: [
              {
                status,
                at: new Date(reportedAt).getTime(),
                by: "System",
                note: "Current status returned by the fault management system.",
              },
            ],
          };
        });

        setReports(formattedReports);
      } catch (err) {
        setError(err.message || "Unable to load fault reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, []);

  const counts = useMemo(
    () => ({
      all: reports.length,
      pending: reports.filter((r) => PENDING.includes(r.status)).length,
      approved: reports.filter((r) => APPROVED.includes(r.status)).length,
      rejected: reports.filter((r) => r.status === "Rejected").length,
      resolved: reports.filter((r) => r.status === "Resolved").length,
    }),
    [reports]
  );

  const filtered = reports
    .filter((r) => {
      if (filter === "pending") return PENDING.includes(r.status);
      if (filter === "approved") return APPROVED.includes(r.status);
      if (filter === "rejected") return r.status === "Rejected";
      if (filter === "resolved") return r.status === "Resolved";
      return true;
    })
    .filter((r) => `${r.id} ${r.title} ${r.site} ${r.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

  const openReport = (id, tab = "details") => setOpen({ id, tab });
  const openedReport = open && reports.find((r) => r.id === open.id);

  const updateReport = (id, patch, entry) =>
    setReports((list) =>
      list.map((r) => (r.id === id ? { ...r, ...patch, history: entry ? [...r.history, entry] : r.history } : r))
    );

  const unread = notifications.filter((n) => !n.read).length;

  const tiles = [
    { key: "all", label: "Total Reports", icon: ClipboardList, chip: "bg-slate-100 text-slate-600", text: "text-slate-900", ring: "ring-slate-400" },
    { key: "pending", label: "Pending Review", icon: Hourglass, chip: "bg-amber-50 text-amber-600", text: "text-amber-600", ring: "ring-amber-400" },
    { key: "approved", label: "Approved Reports", icon: ThumbsUp, chip: "bg-teal-50 text-teal-600", text: "text-teal-600", ring: "ring-teal-400" },
    { key: "rejected", label: "Rejected Reports", icon: XCircle, chip: "bg-red-50 text-red-600", text: "text-red-600", ring: "ring-red-400" },
    { key: "resolved", label: "Resolved Faults", icon: CheckCircle2, chip: "bg-emerald-50 text-emerald-600", text: "text-emerald-600", ring: "ring-emerald-400" },
  ];

  return (
    <div className="p-6">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200">
              <Zap className="h-4 w-4" /> My fault reports
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Track the faults you've reported</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-200">
              See where each report stands, who it's assigned to, and what the control room has said.
              {unread > 0 && ` You have ${unread} new update${unread === 1 ? "" : "s"}.`}
            </p>
          </div>
          <Link to="/report-fault" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-blue-50">
            <Plus className="h-4 w-4" /> Report a new fault
          </Link>
        </div>
      </section>

      {loading && (
        <p className="mb-4 text-sm text-slate-500">
          Loading your fault reports...
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
              filter === t.key ? `ring-2 ${t.ring}` : ""
            }`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
              <t.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{t.label}</p>
              <p className={`text-3xl font-bold leading-tight ${t.text}`}>{counts[t.key]}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* 2. My submitted reports */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              My submitted reports <span className="text-sm font-normal text-slate-400">({filtered.length})</span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input className={`${field} pl-9`} placeholder="Search by ID, title or site..." value={query}
                onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
                <Inbox className="h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No reports match your filter.</p>
              </div>
            )}

            {filtered.map((r) => {
              const canEdit = PENDING.includes(r.status);
              const stage =
                r.status === "Rejected" || r.status === "Cancelled"
                  ? 100
                  : Math.round((FLOW.indexOf(r.status) / (FLOW.length - 1)) * 100);
              return (
                <article key={r.id} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${priorityBar[r.priority] || priorityBar.Low}`} />
                  <div className="p-5 pl-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-500">{r.id}</span>
                      <StatusPill value={r.status} />
                      <PriorityPill value={r.priority} />
                      {r.infoRequest && (
                        <span className={`${pill} bg-amber-50 text-amber-700 ring-amber-600/20`}>
                          <HelpCircle className="h-3 w-3" /> Info requested
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{r.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{r.description}</p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {r.site}{r.location ? ` · ${r.location}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-slate-400" /> {r.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {fmtDate(r.reportedAt)}
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          r.status === "Rejected"
                            ? "bg-red-400"
                            : r.status === "Cancelled"
                            ? "bg-slate-400"
                            : r.status === "Resolved"
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.max(stage, 6)}%` }}
                      />
                    </div>

                    {/* 5. actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => openReport(r.id, "details")} className={btnPrimary}>
                        <Eye className="h-4 w-4" /> View report
                      </button>
                      <button onClick={() => navigate(`/myfault/${r.databaseId}`)} className={btnOutline}>
                        <MapPin className="h-4 w-4" /> Track fault
                      </button>
                      <button
                        onClick={() => openReport(r.id, "details")}
                        disabled={!canEdit}
                        title={canEdit ? "Edit this report" : "Reports can only be edited before approval"}
                        className={btnOutline}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => openReport(r.id, "evidence")} className={btnOutline}>
                        <ImagePlus className="h-4 w-4" /> Add evidence
                      </button>
                      <button onClick={() => openReport(r.id, "history")} className={btnOutline}>
                        <HistoryIcon className="h-4 w-4" /> History
                      </button>
                      {r.engineer && (
                        <button onClick={() => openReport(r.id, "details")} className={btnOutline}>
                          <UserCog className="h-4 w-4" /> {r.engineer.name}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 6. Feedback and notifications */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className={card}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Feedback & notifications</h2>
                  <p className="text-xs text-slate-500">Updates on your reports</p>
                </div>
              </div>
              {unread > 0 && (
                <button
                  onClick={() => setNotifications((n) => n.map((x) => ({ ...x, read: true })))}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-[70vh] space-y-2 overflow-y-auto">
              {[...notifications]
                .sort((a, b) => new Date(b.at) - new Date(a.at))
                .map((n) => {
                  const ic = notifIcon[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                          openReport(n.reportId, n.type === "info" ? "evidence" : n.type === "rejected" || n.type === "approved" ? "feedback" : "details");
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${
                          n.read ? "" : "bg-blue-50/50"
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ic.cls}`}>
                          <ic.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-snug ${n.read ? "text-slate-600" : "font-medium text-slate-900"}`}>
                            {n.text}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">{fmtDateTime(n.at)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        </aside>
      </div>

      {/* 3, 4, 5 + feedback detail drawer */}
      {openedReport && (
        <ReportDrawer
          key={openedReport.id}
          report={openedReport}
          tab={open.tab}
          setTab={(tab) => setOpen({ id: open.id, tab })}
          onClose={() => setOpen(null)}
          onChange={updateReport}
        />
      )}
    </div>
  );
}