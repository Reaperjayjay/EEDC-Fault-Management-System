import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FileWarning,
  MapPin,
  Camera,
  ShieldAlert,
  Send,
  CheckCircle2,
  Circle,
  LocateFixed,
  ImagePlus,
  Video,
  X,
  Lock,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  Zap,
  RotateCcw,
} from "lucide-react";

/* ---------- backend connection ---------- */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const REPORTER = { name: "Signed-in user", employeeId: "Authenticated account" };

const toFaultType = (category) => {
  const mapping = {
    Transformer: "transformer_fault",
    "Distribution line": "power_failure",
    Feeder: "feeder_fault",
    "Circuit breaker": "equipment_failure",
    "Switchgear / isolator": "equipment_failure",
    "Pole or cross-arm": "equipment_failure",
    Insulator: "equipment_failure",
    "Cable / service line": "equipment_failure",
    Metering: "voltage_problem",
    Other: "other",
  };
  return mapping[category] || "other";
};

const categories = [
  "Transformer",
  "Distribution line",
  "Feeder",
  "Circuit breaker",
  "Switchgear / isolator",
  "Pole or cross-arm",
  "Insulator",
  "Cable / service line",
  "Metering",
  "Other",
];

const priorities = [
  { key: "Low", sel: "border-slate-400 bg-slate-100 text-slate-700", desc: "Minor, no supply impact" },
  { key: "Medium", sel: "border-amber-500 bg-amber-50 text-amber-700", desc: "Needs attention soon" },
  { key: "High", sel: "border-orange-500 bg-orange-50 text-orange-700", desc: "Affecting supply" },
  { key: "Critical", sel: "border-red-500 bg-red-50 text-red-700", desc: "Danger or major outage" },
];

const safetyQuestions = [
  { key: "fallenWire", label: "Is there a fallen electrical wire?", dangerIfYes: true },
  { key: "fire", label: "Is there smoke, fire or sparking?", dangerIfYes: true },
  { key: "publicDanger", label: "Is there danger to the public?", dangerIfYes: true },
  { key: "safeToApproach", label: "Is the area safe to approach?", dangerIfYes: false },
];

/* ---------- styles & small pieces ---------- */

const tones = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  indigo: "bg-indigo-50 text-indigo-600",
  cyan: "bg-cyan-50 text-cyan-600",
  red: "bg-red-50 text-red-600",
};

const card = "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md focus:outline-none focus:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;

function SectionTitle({ icon: Icon, tone = "blue", title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
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

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
const fmtDateTime = (t) => new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

/* ---------- map picker ---------- */

function PickerMap({ position, onPick, flyKey }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const pickRef = useRef(onPick);
  const posRef = useRef(position);
  //pickRef.current = onPick;
  //posRef.current = position;

  useEffect(() => {
    const p = posRef.current;
    const m = L.map(el.current).setView(p ? [p.lat, p.lng] : [4.8156, 7.0498], p ? 15 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    m.on("click", (e) => pickRef.current(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marker.current?.remove();
    marker.current = null;
    if (position) {
      marker.current = L.circleMarker([position.lat, position.lng], {
        radius: 11,
        color: "#b91c1c",
        weight: 3,
        fillColor: "#ef4444",
        fillOpacity: 0.95,
      })
        .addTo(m)
        .bindTooltip("Fault location");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);

  useEffect(() => {
    const m = map.current;
    const p = posRef.current;
    if (m && p && flyKey > 0) m.flyTo([p.lat, p.lng], 16, { duration: 0.8 });
  }, [flyKey]);

  return <div ref={el} className="isolate h-80 w-full cursor-crosshair overflow-hidden rounded-xl bg-slate-100" />;
}

/* ---------- yes / no question ---------- */

function YesNo({ q, value, onChange }) {
  const yesBad = q.dangerIfYes;
  const btn = (v, label) => {
    const on = value === v;
    const bad = (v === "yes") === yesBad; // is this answer the dangerous one?
    return (
      <button
        type="button"
        onClick={() => onChange(v)}
        className={`min-w-[72px] rounded-xl border-2 px-4 py-2 text-sm font-semibold transition ${
          on
            ? bad
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">{q.label}</p>
      <div className="flex gap-2">
        {btn("yes", "Yes")}
        {btn("no", "No")}
      </div>
    </div>
  );
}

/* ---------- the form ---------- */

function FaultForm({ onDone }) {
  // 1. fault info
  const [info, setInfo] = useState({ title: "", category: "", description: "", priority: "" });

  // 2. site
  const [siteChoice, setSiteChoice] = useState("");
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [knownSites, setKnownSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [siteError, setSiteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [flyKey, setFlyKey] = useState(0);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState(null);

  // Load real sites from the protected backend API.
  useEffect(() => {
    const loadSites = async () => {
      setSitesLoading(true);
      setSiteError("");
      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Please log in before reporting a fault.");
        }

        const response = await fetch(`${API_URL}/sites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Could not load sites.");
        }

        const candidates =
          result?.data?.sites ??
          result?.data?.data ??
          result?.data?.doc ??
          result?.data ??
          result?.sites ??
          [];

        const rows = Array.isArray(candidates)
          ? candidates
          : Array.isArray(candidates?.sites)
            ? candidates.sites
            : Array.isArray(candidates?.data)
              ? candidates.data
              : [];

        const normalized = rows
          .filter((site) => site && site.id != null)
          .filter((site) => !site.status || site.status === "active")
          .map((site) => ({
            id: site.id,
            code: site.site_code ?? site.siteCode ?? `SITE-${site.id}`,
            name: site.site_name ?? site.siteName ?? site.name ?? "Unnamed site",
            address: site.location ?? site.address ?? "",
            lat: site.latitude == null ? null : Number(site.latitude),
            lng: site.longitude == null ? null : Number(site.longitude),
          }));

        setKnownSites(normalized);
        if (!normalized.length) {
          setSiteError("No active sites were returned by the backend. Add or activate a site before reporting a fault.");
        }
      } catch (error) {
        setSiteError(error.message || "Could not connect to the sites API.");
      } finally {
        setSitesLoading(false);
      }
    };

    loadSites();
  }, []);

  // 3. evidence
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const mediaRef = useRef({ photos, videos });
  mediaRef.current = { photos, videos };
  useEffect(
    () => () => [...mediaRef.current.photos, ...mediaRef.current.videos].forEach((m) => URL.revokeObjectURL(m.url)),
    []
  );

  // 4. safety
  const [safety, setSafety] = useState({ fallenWire: "", fire: "", publicDanger: "", safeToApproach: "" });

  // 5. submission
  const [now, setNow] = useState(Date.now());
  const [errors, setErrors] = useState([]);
  const errorRef = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const position =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;

  const hazard =
    safety.fallenWire === "yes" ||
    safety.fire === "yes" ||
    safety.publicDanger === "yes" ||
    safety.safeToApproach === "no";
  const safetyAnswered = safetyQuestions.every((q) => safety[q.key]);

  /* ----- site & location handlers ----- */

  const setLocation = (la, ln, fly) => {
    setLatStr(Number(la).toFixed(6));
    setLngStr(Number(ln).toFixed(6));
    if (fly) setFlyKey((k) => k + 1);
  };

  const chooseSite = (id) => {
    setSiteChoice(id);
    setGeoMsg(null);
    const selectedSite = knownSites.find((site) => String(site.id) === String(id));

    if (selectedSite) {
      setSiteName(`${selectedSite.name} (${selectedSite.code})`);
      setAddress(selectedSite.address);
      if (
        Number.isFinite(selectedSite.lat) &&
        Number.isFinite(selectedSite.lng) &&
        Math.abs(selectedSite.lat) <= 90 &&
        Math.abs(selectedSite.lng) <= 180
      ) {
        setLocation(selectedSite.lat, selectedSite.lng, true);
      }
    } else {
      setSiteName("");
      setAddress("");
    }
  };

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      return setGeoMsg({ type: "err", text: "Location is not supported on this device or browser." });
    }
    setGeoBusy(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude, true);
        setGeoMsg({ type: "ok", text: `Location detected (accurate to about ${Math.round(pos.coords.accuracy)} m).` });
        setGeoBusy(false);
      },
      (err) => {
        setGeoMsg({
          type: "err",
          text: `${err.message || "Could not get your location."} Allow location for this site, or click the map instead.`,
        });
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  /* ----- evidence handlers ----- */

  const addPhotos = (files) => {
    setEvidenceError("");
    const ok = files.filter((f) => f.type.startsWith("image/"));
    if (ok.length < files.length) setEvidenceError("Some files were skipped because they aren't images.");
    setPhotos((p) => [
      ...p,
      ...ok.map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, url: URL.createObjectURL(f) })),
    ]);
  };

  const addVideos = (files) => {
    setEvidenceError("");
    const ok = files.filter((f) => f.type.startsWith("video/") && f.size <= 50 * 1024 * 1024);
    if (ok.length < files.length) setEvidenceError("Videos must be video files up to 50 MB each; some were skipped.");
    setVideos((v) => [
      ...v,
      ...ok.map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, url: URL.createObjectURL(f) })),
    ]);
  };

  const removeMedia = (setter) => (id) =>
    setter((list) => {
      const item = list.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return list.filter((x) => x.id !== id);
    });

  /* ----- submit to backend ----- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const errs = [];
    if (!info.title.trim()) errs.push("Enter a fault title.");
    if (!info.category) errs.push("Choose a fault category.");
    if (!info.description.trim()) errs.push("Enter a fault description.");
    if (!info.priority) errs.push("Choose a fault priority.");
    if (!siteChoice) errs.push("Select a registered site from the site dropdown.");
    if (!position) errs.push("Set the fault location: choose a site, use your current location, or click the map.");
    if (!safetyAnswered) errs.push("Answer all four safety questions.");

    setErrors(errs);
    if (errs.length) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setSubmitError("Your login session was not found. Please log in again.");
      return;
    }

    const safetySummary = safetyQuestions
      .map((question) => `${question.label} ${safety[question.key]}`)
      .join("\n");

    const descriptionParts = [
      `Fault title: ${info.title.trim()}`,
      `Fault description: ${info.description.trim()}`,
      inspectionNotes.trim() ? `Inspection notes: ${inspectionNotes.trim()}` : "",
      `Safety assessment:\n${safetySummary}`,
      hazard ? "SAFETY ALERT: A potential hazard was reported." : "",
      photos.length ? `Photo evidence selected in browser: ${photos.length} file(s). These files have not been uploaded.` : "",
      videos.length ? `Video evidence selected in browser: ${videos.length} file(s). These files have not been uploaded.` : "",
    ].filter(Boolean);

    const payload = {
      site_id: Number(siteChoice),
      fault_type: toFaultType(info.category),
      description: descriptionParts.join("\n\n"),
      severity: info.priority.toLowerCase(),
      detected_latitude: position.lat,
      detected_longitude: position.lng,
    };

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/faults`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "The backend could not save this fault report.");
      }

      const savedFault = result?.data?.fault ?? result?.fault ?? result?.data;
      if (!savedFault || savedFault.id == null) {
        throw new Error("The backend responded, but did not return the saved fault ID.");
      }

      onDone({
        faultId: String(savedFault.id),
        reportedAt: savedFault.reported_at ? new Date(savedFault.reported_at).getTime() : Date.now(),
        title: info.title.trim(),
        category: info.category,
        priority: info.priority,
        site: siteName,
        address,
        position,
        hazard,
        photos: photos.length,
        videos: videos.length,
      });
    } catch (error) {
      setSubmitError(error.message || "Unable to submit the fault report. Please try again.");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setSubmitting(false);
    }
  };

  const checklist = [
    { label: "Title and category", done: !!(info.title.trim() && info.category) },
    { label: "Fault description", done: !!info.description.trim() },
    { label: "Priority chosen", done: !!info.priority },
    { label: "Fault location set", done: !!position },
    { label: "Safety questions answered", done: safetyAnswered },
  ];

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        {/* 1. Fault information */}
        <section className={card}>
          <SectionTitle icon={FileWarning} tone="blue" title="Fault information" subtitle="What's wrong?" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fault title" required>
                <input required className={field} value={info.title}
                  onChange={(e) => setInfo({ ...info, title: e.target.value })}
                  placeholder="e.g. Transformer humming and overheating" />
              </Field>
              <Field label="Fault category" required>
                <select required className={field} value={info.category}
                  onChange={(e) => setInfo({ ...info, category: e.target.value })}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Fault description" required>
              <textarea required rows={4} className={field} value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                placeholder="Describe what you see, when it started and what is affected..." />
            </Field>
            <Field label="Fault priority" required>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {priorities.map((p) => (
                  <button
                    type="button"
                    key={p.key}
                    onClick={() => setInfo({ ...info, priority: p.key })}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      info.priority === p.key ? p.sel : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{p.key}</span>
                    <span className="block text-xs opacity-80">{p.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* 2. Site information */}
        <section className={card}>
          <SectionTitle icon={MapPin} tone="emerald" title="Site information" subtitle="Where is the fault?" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site">
                <select
                  required
                  className={field}
                  value={siteChoice}
                  onChange={(e) => chooseSite(e.target.value)}
                  disabled={sitesLoading || knownSites.length === 0}
                >
                  <option value="">
                    {sitesLoading ? "Loading sites…" : "Select a registered site…"}
                  </option>
                  {knownSites.map((site) => (
                    <option key={site.id} value={String(site.id)}>
                      {site.name} ({site.code})
                    </option>
                  ))}
                </select>
                {siteError && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                    {siteError}
                  </p>
                )}
              </Field>
              <Field label="Site name or site code" required>
                <input required className={field} value={siteName} disabled={!!siteChoice}
                  onChange={(e) => setSiteName(e.target.value)} placeholder="e.g. Rumuola feeder pillar 3" />
              </Field>
            </div>
            <Field label="Site address" required>
              <textarea required rows={2} className={field} value={address}
                onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, town..." />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Latitude">
                <input className={`${field} font-mono`} inputMode="decimal" value={latStr}
                  onChange={(e) => setLatStr(e.target.value)} placeholder="4.815600" />
              </Field>
              <Field label="Longitude">
                <input className={`${field} font-mono`} inputMode="decimal" value={lngStr}
                  onChange={(e) => setLngStr(e.target.value)} placeholder="7.049800" />
              </Field>
              <button type="button" onClick={detectLocation} disabled={geoBusy} className={btnOutline}>
                <LocateFixed className="h-4 w-4" /> {geoBusy ? "Detecting…" : "Use my location"}
              </button>
            </div>

            {geoMsg && (
              <p
                className={`rounded-xl p-3 text-sm ${
                  geoMsg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {geoMsg.text}
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Select the affected site on the map <span className="font-normal text-slate-400">(click to drop the pin)</span>
              </p>
              <PickerMap position={position} flyKey={flyKey} onPick={(la, ln) => setLocation(la, ln, false)} />
            </div>
          </div>
        </section>

        {/* 3. Fault evidence */}
        <section className={card}>
          <SectionTitle icon={Camera} tone="rose" title="Fault evidence" subtitle="Photos, videos and your inspection notes" />
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Photographs</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {photos.length} photo{photos.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <img src={p.url} alt={p.name} className="h-24 w-full object-cover" />
                    <button type="button" onClick={() => removeMedia(setPhotos)(p.id)} aria-label={`Remove ${p.name}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100 focus:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600">
                  <ImagePlus className="h-5 w-5" /> Add photos
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { addPhotos(Array.from(e.target.files)); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Videos</h3>
                  <p className="text-xs text-slate-500">Optional, up to 50 MB each</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {videos.length} video{videos.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {videos.map((v) => (
                  <div key={v.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <video src={v.url} controls className="h-36 w-full bg-black object-contain" />
                    <div className="flex items-center justify-between gap-2 p-2.5 text-xs">
                      <span className="truncate font-medium text-slate-700">{v.name}</span>
                      <span className="shrink-0 text-slate-400">{fmtSize(v.size)}</span>
                    </div>
                    <button type="button" onClick={() => removeMedia(setVideos)(v.id)} aria-label={`Remove ${v.name}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white transition hover:bg-red-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-xs font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600">
                  <Video className="h-5 w-5" /> Add video
                  <input type="file" accept="video/*" multiple className="hidden"
                    onChange={(e) => { addVideos(Array.from(e.target.files)); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            {evidenceError && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{evidenceError}</p>}

            <Field label="Inspection notes">
              <textarea rows={3} className={field} value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Anything else you noticed: noises, smells, readings, recent weather..." />
            </Field>
            <p className="text-xs text-slate-400">
              Photos and videos are previewed in this page but are not uploaded by the current backend endpoint.
            </p>
          </div>
        </section>

        {/* 4. Safety information */}
        <section className={card}>
          <SectionTitle icon={ShieldAlert} tone="red" title="Safety information" subtitle="Answer all four questions" />
          <div className="space-y-3">
            {safetyQuestions.map((q) => (
              <YesNo key={q.key} q={q} value={safety[q.key]} onChange={(v) => setSafety({ ...safety, [q.key]: v })} />
            ))}
          </div>

          {hazard && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Potential hazard reported
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-red-700">
                <li>Keep a safe distance and keep other people away from the area.</li>
                <li>Do not touch fallen wires or equipment. Treat every wire as live.</li>
                <li>Contact the control room or emergency services straight away if there is fire or immediate danger.</li>
              </ul>
              {info.priority !== "Critical" && (
                <button type="button" onClick={() => setInfo({ ...info, priority: "Critical" })}
                  className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                  Set priority to Critical
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 5. Report submission */}
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <section className={card}>
          <SectionTitle icon={Send} tone="indigo" title="Report submission" subtitle="Review and send" />

          <dl className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Reporter</dt>
                <dd className="text-sm font-medium text-slate-900">{REPORTER.name}</dd>
                <dd className="text-xs text-slate-500">Employee ID: {REPORTER.employeeId}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-500">Date and time reported</dt>
                <dd className="text-sm font-medium text-slate-900">{fmtDateTime(now)}</dd>
                <dd className="text-xs text-slate-400">Filled in automatically when you submit.</dd>
              </div>
            </div>
          </dl>

          <ul className="my-5 space-y-2.5">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5 text-sm">
                {c.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <span className={c.done ? "text-slate-900" : "text-slate-500"}>{c.label}</span>
              </li>
            ))}
          </ul>

          {hazard && (
            <p className="mb-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This report includes a safety hazard and will be flagged to the control room.
            </p>
          )}

          <div ref={errorRef}>
            {submitError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {errors.length > 0 && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="mb-1 font-semibold">Please fix the following:</p>
                <ul className="list-inside list-disc space-y-0.5 text-xs">
                  {errors.map((er) => (
                    <li key={er}>{er}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || sitesLoading || knownSites.length === 0}
            className={`${btnPrimary} w-full py-3`}
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting report…" : "Submit fault report"}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            The fault ID is returned by the backend after the report is saved.
          </p>
        </section>
      </aside>
    </form>
  );
}

/* ---------- confirmation ---------- */

function Confirmation({ report, onAnother }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.faultId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const priorityChip = {
    Low: "bg-slate-100 text-slate-700 ring-slate-500/20",
    Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
    High: "bg-orange-50 text-orange-700 ring-orange-600/20",
    Critical: "bg-red-50 text-red-700 ring-red-600/20",
  }[report.priority] || "bg-slate-100 text-slate-700 ring-slate-500/20";

  return (
    <div className="mx-auto max-w-2xl">
      <section className={`${card} text-center`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Fault report submitted</h2>
        <p className="mt-1 text-sm text-slate-500">Thank you. The control room has been notified.</p>

        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-white">
          <div className="text-left">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Fault ID</p>
            <p className="font-mono text-3xl font-bold tracking-wider">{report.faultId}</p>
          </div>
          <button onClick={copy} type="button" aria-label="Copy fault ID"
            className="rounded-lg bg-white/10 p-2 transition hover:bg-white/20">
            {copied ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>

        <dl className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {[
            ["Title", report.title],
            ["Category", report.category],
            ["Site", report.site],
            ["Reported", fmtDateTime(report.reportedAt)],
            ["Evidence", `${report.photos} photo${report.photos === 1 ? "" : "s"}, ${report.videos} video${report.videos === 1 ? "" : "s"}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 p-3.5">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-sm font-medium text-slate-900">{v}</dd>
            </div>
          ))}
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs text-slate-500">Priority</dt>
            <dd className="mt-0.5">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityChip}`}>
                {report.priority}
              </span>
            </dd>
          </div>
        </dl>

        {report.hazard && (
          <p className="mt-5 flex gap-2 rounded-xl bg-red-50 p-3 text-left text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This report was flagged as a safety hazard. Stay clear of the area and follow safety instructions from the
            control room.
          </p>
        )}

        <p className="mt-6 text-sm text-slate-500">
          Next, the control room reviews your report and assigns an engineer. You'll be notified of any updates.
        </p>
        <button onClick={onAnother} className={`${btnPrimary} mt-5`}>
          <RotateCcw className="h-4 w-4" /> Report another fault
        </button>
      </section>
    </div>
  );
}

/* ---------- page ---------- */

export default function ReportFault() {
  const [report, setReport] = useState(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="p-6">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-200">
            <Zap className="h-4 w-4" /> Report a fault
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Spotted a fault? Report it here.</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-200">
            Give us the details, the location and any evidence. If there is any danger, stay clear and tell the
            control room first.
          </p>
        </div>
      </section>

      {report ? (
        <Confirmation
          report={report}
          onAnother={() => {
            setReport(null);
            setFormKey((k) => k + 1);
          }}
        />
      ) : (
        <FaultForm key={formKey} onDone={setReport} />
      )}
    </div>
  );
}