import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import EngineerMap from "./EngineerMap";
import EngineerLocationList from "./EngineerLocationList";
import TrackingDetails from "./TrackingDetails";
import ErrorBoundary from "./ErrorBoundary";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
const API_URL = `${API_BASE_URL}/engineers`;

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeStatus(engineer) {
  const raw = String(firstValue(engineer.tracking_status, engineer.assignment_status, engineer.status, engineer.availability, "offline")).toLowerCase();
  if (["en_route", "en route", "en-route", "on_the_way", "on the way"].includes(raw)) return "En Route";
  if (["arrived", "on_site", "on site", "onsite", "inspecting", "repairing", "in_progress", "in progress", "busy"].includes(raw)) return "On Site";
  if (["available", "idle", "active"].includes(raw)) return "Idle";
  return "Offline";
}

function normalizeEngineer(engineer) {
  const lat = firstValue(engineer.lat, engineer.latitude, engineer.current_latitude, engineer.currentLatitude);
  const lng = firstValue(engineer.lng, engineer.longitude, engineer.current_longitude, engineer.currentLongitude);
  const assignmentId = firstValue(engineer.assignment_id, engineer.assignmentId, engineer.current_assignment_id);
  const faultId = firstValue(engineer.fault_id, engineer.faultId, engineer.assigned_fault_id);
  const rawId = firstValue(engineer.id, engineer.engineer_id, engineer.engineerId, engineer.user_id);

  return {
    ...engineer,
    id: rawId,
    name: firstValue(engineer.name, engineer.engineer_name, engineer.full_name, engineer.fullName, engineer.email, `Engineer ${rawId ?? "Unknown"}`),
    status: normalizeStatus(engineer),
    assignedFault: firstValue(engineer.assignedFault, engineer.assigned_fault, engineer.fault_code, engineer.fault_code_label, faultId != null ? `Fault #${faultId}` : null, assignmentId != null ? `Assignment #${assignmentId}` : null),
    currentLocation: firstValue(engineer.currentLocation, engineer.current_location, engineer.site_name, engineer.site_code, engineer.location, "Location unavailable"),
    lat: lat == null || lat === "" ? null : Number(lat),
    lng: lng == null || lng === "" ? null : Number(lng),
    speed: Number(firstValue(engineer.speed, engineer.speed_kmh, 0)),
    battery: firstValue(engineer.battery, engineer.battery_level, null) == null ? null : Number(firstValue(engineer.battery, engineer.battery_level)),
    accuracy: firstValue(engineer.accuracy, engineer.gps_accuracy, null) == null ? null : Number(firstValue(engineer.accuracy, engineer.gps_accuracy)),
    eta: firstValue(engineer.eta, engineer.estimated_arrival, null),
    lastUpdate: firstValue(engineer.lastUpdate, engineer.last_update, engineer.location_updated_at, engineer.updated_at, null),
  };
}

function extractEngineers(result) {
  const candidates = [
    result?.data?.engineers,
    result?.data?.data?.engineers,
    result?.engineers,
    result?.data,
  ];
  return candidates.find(Array.isArray) || null;
}

// Pure request function: fetches and returns normalized engineers.
// It never touches component state, so it is safe to call from an effect.
async function fetchEngineers(signal) {
  const token = getToken();
  if (!token) throw new Error("Your login session was not found. Please log in again.");

  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Please log in again.");
    throw new Error(result.message || `Unable to load engineers (${response.status}).`);
  }

  const records = extractEngineers(result);
  if (!records) throw new Error("The engineers API response does not contain an engineers list.");

  return records.map(normalizeEngineer).filter((engineer) => engineer.id != null);
}

function GPSTrackingPage() {
  const [engineers, setEngineers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true); // true on first render
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // The effect only starts the request. State is updated after the
  // request finishes (asynchronously), never synchronously in the effect body.
  useEffect(() => {
    const controller = new AbortController();

    fetchEngineers(controller.signal)
      .then((normalized) => {
        if (controller.signal.aborted) return;
        setEngineers(normalized);
        setSelectedId((currentId) =>
          normalized.some((engineer) => String(engineer.id) === String(currentId)) ? currentId : null
        );
        setError("");
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === "AbortError") return;
        setError(err.message || "Unable to load engineer locations.");
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
    if (refreshing || loading) return;
    setRefreshing(true);
    setError("");
    setReloadKey((key) => key + 1);
  };

  const selected = useMemo(
    () => engineers.find((engineer) => String(engineer.id) === String(selectedId)) ?? null,
    [engineers, selectedId]
  );

  const count = (status) => engineers.filter((engineer) => engineer.status === status).length;
  const cards = [
    { label: "Total Engineers", value: engineers.length, color: "text-gray-900" },
    { label: "En Route", value: count("En Route"), color: "text-blue-600" },
    { label: "On Site", value: count("On Site"), color: "text-green-600" },
    { label: "Idle", value: count("Idle"), color: "text-yellow-600" },
    { label: "Offline", value: count("Offline"), color: "text-gray-500" },
  ];

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium md:text-2xl">GIS &amp; Live Tracking</h2>
          <p className="mt-1 text-sm text-gray-500">Monitor engineer locations and movement using the latest locations reported by the API.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>{error}</p>
            <button type="button" onClick={handleRefresh} className="mt-2 font-medium underline">Try again</button>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-medium ${card.color}`}>{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      {loading && engineers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading engineer locations...</div>
      ) : !error && engineers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No engineers were returned by the API.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <ErrorBoundary title="The map failed to load">
              <EngineerMap engineers={engineers} selectedId={selectedId} onSelect={setSelectedId} />
            </ErrorBoundary>
            <TrackingDetails engineer={selected} />
          </div>
          <EngineerLocationList engineers={engineers} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      )}
    </div>
  );
}

export default function GPSTracking() {
  return (
    <ErrorBoundary title="GPS page error">
      <GPSTrackingPage />
    </ErrorBoundary>
  );
}