import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Clock,
  Route,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  LocateFixed,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getMyGPSAssignments,
  updateEngineerLocation,
  checkInAtFaultSite,
} from "../../services/api";

import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* =====================================================
   CONSTANTS
===================================================== */

const UPLOAD_INTERVAL_MS = 15000;
const ROUTE_REFRESH_METERS = 100; // refetch route only after moving this far
const DEFAULT_CENTER = [4.8156, 7.0498];

// Adjust to match the status values your backend uses after check-in.
const CHECKED_IN_STATUSES = ["checked_in", "arrived", "on_site"];

/* =====================================================
   LEAFLET ICONS
===================================================== */

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Blue dot for the engineer so it differs from the site pin.
const engineerIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb,0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function validCoordinates(lat, lng) {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180
  );
}

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalizeAssignments(rows) {
  return rows
    .map((item) => ({
      id: item.assignment_id ?? item.id,
      faultId: item.fault_id ?? item.faultId,
      priority: item.severity ?? item.priority ?? "Medium",
      site: item.site_name ?? item.site ?? "Unnamed site",
      address: item.address ?? item.location ?? "Address unavailable",
      lat: Number(item.site_latitude ?? item.latitude ?? item.lat),
      lng: Number(item.site_longitude ?? item.longitude ?? item.lng),
      status: item.assignment_status ?? item.status ?? "assigned",
      faultType: item.fault_type ?? item.faultType ?? "Electrical fault",
      description: item.description ?? "",
      assignedAt: item.assigned_at ?? null,
    }))
    .filter(
      (item) => item.id != null && validCoordinates(item.lat, item.lng)
    );
}

function extractAssignments(response) {
  const rows =
    response?.data?.assignments ??
    response?.assignments ??
    response?.data ??
    [];

  if (!Array.isArray(rows)) {
    throw new Error("Invalid assignments response from the server.");
  }

  return rows;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "--";
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

function formatTime(date) {
  if (!date) return "--";

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function priorityStyle(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "critical":
      return "border-red-200 bg-red-100 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "medium":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    default:
      return "border-green-200 bg-green-100 text-green-700";
  }
}

function statusLabel(status) {
  return String(status || "assigned")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =====================================================
   MAP CONTROLLER

   - Fits the map once per assignment (not on every GPS tick)
   - Recenters on demand via recenterToken
===================================================== */

function MapController({ position, site, assignmentId, recenterToken }) {
  const map = useMap();
  const positionRef = useRef(position);
  const fittedKeyRef = useRef(null);
  const hasPosition = Boolean(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Initial fit per assignment (and once when GPS first arrives)
  useEffect(() => {
    if (!site) return;

    const key = `${assignmentId}:${hasPosition ? "gps" : "nogps"}`;
    if (fittedKeyRef.current === key) return;
    fittedKeyRef.current = key;

    const current = positionRef.current;

    if (current) {
      map.fitBounds(
        [
          [current.lat, current.lng],
          [site.lat, site.lng],
        ],
        { padding: [45, 45], maxZoom: 15 }
      );
    } else {
      map.setView([site.lat, site.lng], 15);
    }
  }, [map, site, assignmentId, hasPosition]);

  // "My location" button
  useEffect(() => {
    if (!recenterToken) return;

    const current = positionRef.current;
    if (current) {
      map.flyTo([current.lat, current.lng], Math.max(map.getZoom(), 16));
    }
  }, [map, recenterToken]);

  return null;
}

/* =====================================================
   MAIN GPS NAVIGATION COMPONENT
===================================================== */

export default function GPSNavigation() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState("");

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [apiError, setApiError] = useState("");
  const [shareError, setShareError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [position, setPosition] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(true);

  const [sharing, setSharing] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [lastLocationSent, setLastLocationSent] = useState(null);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState({});
  const [checkInNotes, setCheckInNotes] = useState("");

  const [routeOrigin, setRouteOrigin] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const [trackingHistory, setTrackingHistory] = useState([]);
  const [recenterToken, setRecenterToken] = useState(0);

  const positionRef = useRef(null);
  const routeOriginRef = useRef(null);
  const uploadInProgressRef = useRef(false);

  const assignment = useMemo(
    () =>
      assignments.find(
        (item) => String(item.id) === String(assignmentId)
      ) ?? null,
    [assignments, assignmentId]
  );

  const selectedId = assignment?.id ?? null;
  const siteLat = assignment?.lat;
  const siteLng = assignment?.lng;

  // Depends on coordinates only, so a refresh doesn't trigger a new route fetch
  const site = useMemo(() => {
    if (siteLat == null || siteLng == null) return null;
    if (!validCoordinates(siteLat, siteLng)) return null;
    return { lat: siteLat, lng: siteLng };
  }, [siteLat, siteLng]);

  const siteKey = site ? `${site.lat},${site.lng}` : null;
  const activeRoute = route && route.key === siteKey ? route : null;

  const checkedIn = Boolean(
    assignment &&
      (checkedInIds[assignment.id] ||
        CHECKED_IN_STATUSES.includes(
          String(assignment.status).toLowerCase()
        ))
  );

  /* -----------------------------------------------------
     APPLY / LOAD ASSIGNMENTS
  ----------------------------------------------------- */

  const applyAssignments = useCallback((rows) => {
    const mapped = normalizeAssignments(rows);

    setAssignments(mapped);

    setAssignmentId((previousId) => {
      const stillExists = mapped.some(
        (item) => String(item.id) === String(previousId)
      );

      if (stillExists) return previousId;

      return mapped.length ? String(mapped[0].id) : "";
    });

    if (rows.length > 0 && mapped.length === 0) {
      setAssignmentError(
        "Assignments were found, but their site coordinates are missing or invalid. Check the site coordinates in your database."
      );
    } else if (mapped.length === 0) {
      setAssignmentError(
        "You have no active assignments available for GPS navigation."
      );
    } else {
      setAssignmentError("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAssignments() {
      try {
        const response = await getMyGPSAssignments();
        if (cancelled) return;

        applyAssignments(extractAssignments(response));
      } catch (error) {
        if (!cancelled) {
          setAssignmentError(
            error.message || "Unable to load your assignments."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingAssignments(false);
        }
      }
    }

    fetchAssignments();

    return () => {
      cancelled = true;
    };
  }, [applyAssignments]);

  const loadAssignments = useCallback(async () => {
    setRefreshing(true);
    setApiError("");
    setSuccessMessage("");

    try {
      const response = await getMyGPSAssignments();
      applyAssignments(extractAssignments(response));
    } catch (error) {
      setApiError(error.message || "Unable to refresh assignments.");
    } finally {
      setRefreshing(false);
    }
  }, [applyAssignments]);

  /* -----------------------------------------------------
     REAL GPS LOCATION
  ----------------------------------------------------- */

  useEffect(() => {
    let watchId;

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (result) => {
          const nextPosition = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
            accuracy: result.coords.accuracy,
            timestamp: new Date(result.timestamp).toISOString(),
          };

          if (!validCoordinates(nextPosition.lat, nextPosition.lng)) {
            setGpsError("The browser returned invalid GPS coordinates.");
            setGpsLoading(false);
            return;
          }

          setPosition(nextPosition);
          setGpsLoading(false);
          setGpsError("");

          setTrackingHistory((previous) =>
            [{ ...nextPosition, type: "location" }, ...previous].slice(0, 20)
          );
        },
        (error) => {
          const messages = {
            1: "Location permission was denied. Allow location access in your browser settings.",
            2: "Your current location is unavailable.",
            3: "GPS location request timed out.",
          };

          setGpsError(
            messages[error.code] || "Unable to retrieve GPS location."
          );
          setGpsLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 20000,
        }
      );
    } else {
      queueMicrotask(() => {
        setGpsLoading(false);
        setGpsError("This browser does not support GPS location.");
      });
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Keep latest position available to the upload interval
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  /* -----------------------------------------------------
     UPLOAD LIVE LOCATION

     Interval-based: sends every 15 s while sharing is on,
     even if the device is stationary.
  ----------------------------------------------------- */

  useEffect(() => {
    if (!sharing || selectedId == null) return;

    let stopped = false;

    async function sendLocation() {
      const current = positionRef.current;

      if (!current || uploadInProgressRef.current) return;

      uploadInProgressRef.current = true;
      setLocationSaving(true);

      try {
        await updateEngineerLocation(selectedId, {
          latitude: current.lat,
          longitude: current.lng,
        });

        if (!stopped) {
          setLastLocationSent(new Date().toISOString());
          setShareError("");
        }
      } catch (error) {
        if (!stopped) {
          setShareError(
            error.message || "Unable to upload your GPS location."
          );
        }
      } finally {
        uploadInProgressRef.current = false;
        setLocationSaving(false);
      }
    }

    sendLocation();
    const intervalId = setInterval(sendLocation, UPLOAD_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [sharing, selectedId]);

  /* -----------------------------------------------------
     ROUTE ORIGIN

     Only update when the engineer has moved far enough,
     so OSRM isn't called on every GPS reading.
  ----------------------------------------------------- */

  useEffect(() => {
    if (!position) return;

    const last = routeOriginRef.current;

    if (!last || distanceMeters(last, position) > ROUTE_REFRESH_METERS) {
      const origin = { lat: position.lat, lng: position.lng };
      routeOriginRef.current = origin;
      setRouteOrigin(origin);
    }
  }, [position]);

  /* -----------------------------------------------------
     FETCH DRIVING ROUTE FROM OSRM
  ----------------------------------------------------- */

  useEffect(() => {
    if (!routeOrigin || !site) return;

    const controller = new AbortController();
    const key = `${site.lat},${site.lng}`;

    async function fetchRoute() {
      setRouteLoading(true);
      setRouteError("");

      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${routeOrigin.lng},${routeOrigin.lat};${site.lng},${site.lat}` +
          "?overview=full&geometries=geojson";

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("The route service is unavailable.");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error("No driving route could be found.");
        }

        const best = data.routes[0];

        setRoute({
          key,
          coordinates: best.geometry.coordinates.map(([lng, lat]) => [
            lat,
            lng,
          ]),
          distance: best.distance,
          duration: best.duration,
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        setRouteError(
          error.message || "Unable to calculate the driving route."
        );
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    }

    fetchRoute();

    return () => controller.abort();
  }, [routeOrigin, site]);

  /* -----------------------------------------------------
     HANDLERS
  ----------------------------------------------------- */

  function handleAssignmentChange(event) {
    setAssignmentId(event.target.value);
    setCheckInNotes("");
    setSuccessMessage("");
    setApiError("");
  }

  function toggleSharing() {
    if (!sharing && !position) {
      setApiError("Wait for your GPS location before sharing.");
      return;
    }

    if (!sharing && !assignment) {
      setApiError("Select an assignment before sharing your location.");
      return;
    }

    setApiError("");
    setShareError("");
    setSuccessMessage("");
    setSharing((previous) => !previous);
  }

  function handleRecenter() {
    if (!position) {
      setApiError("Your current GPS location is unavailable.");
      return;
    }

    setApiError("");
    setRecenterToken((token) => token + 1);
  }

  async function handleCheckIn() {
    if (!assignment) {
      setApiError("Select an assignment before checking in.");
      return;
    }

    if (!position) {
      setApiError("Your current GPS location is unavailable.");
      return;
    }

    if (checkedIn) return;

    const targetId = assignment.id;
    const targetSite = assignment.site;
    const snapshot = { ...position };

    setCheckingIn(true);
    setApiError("");
    setSuccessMessage("");

    try {
      await checkInAtFaultSite(targetId, {
        latitude: snapshot.lat,
        longitude: snapshot.lng,
        notes: checkInNotes.trim(),
      });

      setCheckedInIds((previous) => ({ ...previous, [targetId]: true }));
      setCheckInNotes("");
      setSuccessMessage(
        `Check-in recorded successfully for ${targetSite}.`
      );

      setTrackingHistory((previous) =>
        [
          {
            ...snapshot,
            timestamp: new Date().toISOString(),
            type: "check-in",
          },
          ...previous,
        ].slice(0, 20)
      );
    } catch (error) {
      setApiError(error.message || "Check-in failed. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  }

  /* =====================================================
     LOADING SCREEN
  ===================================================== */

  if (loadingAssignments) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Loading GPS navigation
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Retrieving your assignments...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     EMPTY ASSIGNMENTS SCREEN
  ===================================================== */

  if (assignments.length === 0) {
    return (
      <div className="min-h-[400px] bg-gray-50 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <MapPin className="mb-4 h-10 w-10 text-blue-600" />

          <h1 className="text-2xl font-bold text-gray-900">
            GPS Navigation
          </h1>

          <p className="mt-2 text-gray-600">
            Your assigned fault sites will appear here when available.
          </p>

          {assignmentError && (
            <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{assignmentError}</p>
            </div>
          )}

          {apiError && (
            <p className="mt-3 text-sm text-red-600">{apiError}</p>
          )}

          <button
            type="button"
            onClick={loadAssignments}
            disabled={refreshing}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh assignments
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6">
      {/* PAGE HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Navigation className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              GPS Navigation
            </h1>
            <p className="text-sm text-gray-500">
              Navigate to assigned fault sites and share your location.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAssignments}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* ALERTS */}

      {assignmentError && (
        <AlertBox type="warning" message={assignmentError} />
      )}

      {apiError && <AlertBox type="error" message={apiError} />}

      {successMessage && (
        <AlertBox type="success" message={successMessage} />
      )}

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Assigned Fault Sites"
          value={assignments.length}
          icon={<MapPin className="h-5 w-5" />}
          iconClass="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="GPS Status"
          value={
            gpsLoading
              ? "Searching..."
              : position
                ? "Available"
                : "Unavailable"
          }
          icon={<LocateFixed className="h-5 w-5" />}
          iconClass="bg-green-50 text-green-600"
        />

        <SummaryCard
          title="Location Sharing"
          value={sharing ? "Enabled" : "Disabled"}
          icon={
            sharing ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )
          }
          iconClass={
            sharing
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-500"
          }
        />

        <SummaryCard
          title="Distance to Site"
          value={formatDistance(activeRoute?.distance)}
          icon={<Route className="h-5 w-5" />}
          iconClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* ASSIGNMENT DETAILS */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">
            Select Assignment
          </h2>

          {assignment && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyle(
                assignment.priority
              )}`}
            >
              {assignment.priority}
            </span>
          )}
        </div>

        <label
          htmlFor="gps-assignment"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Your assigned fault
        </label>

        <select
          id="gps-assignment"
          value={assignmentId}
          onChange={handleAssignmentChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {assignments.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {`Assignment #${item.id} — ${item.site} (${item.faultId ?? "Fault"})`}
            </option>
          ))}
        </select>

        {assignment && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Fault ID" value={assignment.faultId ?? "--"} />
            <Detail
              label="Assignment Status"
              value={statusLabel(assignment.status)}
            />
            <Detail label="Fault Type" value={assignment.faultType} />
            <Detail label="Site Address" value={assignment.address} />

            {assignment.description && (
              <div className="sm:col-span-2">
                <Detail
                  label="Fault Description"
                  value={assignment.description}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAP AND SIDEBAR */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-gray-900">
                Navigation Map
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Blue dot: your current location. Pin: assigned fault site.
              </p>
            </div>
          </div>

          <div className="relative h-[350px] sm:h-[450px]">
            <MapContainer
              center={
                site
                  ? [site.lat, site.lng]
                  : position
                    ? [position.lat, position.lng]
                    : DEFAULT_CENTER
              }
              zoom={13}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                position={position}
                site={site}
                assignmentId={selectedId}
                recenterToken={recenterToken}
              />

              {position && (
                <>
                  {Number.isFinite(position.accuracy) && (
                    <Circle
                      center={[position.lat, position.lng]}
                      radius={position.accuracy}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 1,
                        fillOpacity: 0.1,
                      }}
                    />
                  )}

                  <Marker
                    position={[position.lat, position.lng]}
                    icon={engineerIcon}
                  >
                    <Popup>
                      <strong>Your current location</strong>
                      <br />
                      Accuracy: {Math.round(position.accuracy)} m
                    </Popup>
                  </Marker>
                </>
              )}

              {site && (
                <Marker position={[site.lat, site.lng]}>
                  <Popup>
                    <strong>{assignment?.site}</strong>
                    <br />
                    {assignment?.address}
                    <br />
                    Assignment #{assignment?.id}
                  </Popup>
                </Marker>
              )}

              {activeRoute && activeRoute.coordinates.length > 0 && (
                <Polyline
                  positions={activeRoute.coordinates}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 5,
                    opacity: 0.8,
                  }}
                />
              )}
            </MapContainer>
          </div>

          {gpsError && (
            <div className="border-t border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {gpsError}
            </div>
          )}

          {routeError && (
            <div className="border-t border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {routeError}
            </div>
          )}

          {routeLoading && (
            <div className="flex items-center gap-2 border-t border-gray-200 p-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating driving route...
            </div>
          )}

          <div className="border-t border-gray-200 p-3">
            <button
              type="button"
              onClick={handleRecenter}
              disabled={!position}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <LocateFixed className="h-4 w-4" />
              My location
            </button>
          </div>
        </div>

        {/* ROUTE INFORMATION */}

        <div className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">
              Route Information
            </h2>

            <div className="mt-5 space-y-5">
              <InfoRow
                icon={<Route className="h-5 w-5" />}
                title="Distance"
                value={formatDistance(activeRoute?.distance)}
              />

              <InfoRow
                icon={<Clock className="h-5 w-5" />}
                title="Estimated Driving Time"
                value={formatDuration(activeRoute?.duration)}
              />

              <InfoRow
                icon={<MapPin className="h-5 w-5" />}
                title="Destination"
                value={assignment?.site ?? "--"}
              />

              <InfoRow
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Check-in Status"
                value={checkedIn ? "Checked in" : "Not checked in"}
              />
            </div>

            <p className="mt-5 text-xs leading-5 text-gray-500">
              Travel time is an estimate from the routing service and may
              differ from actual travel time.
            </p>
          </div>

          {/* LOCATION SHARING */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Live Location Sharing
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your GPS coordinates to the backend.
                </p>
              </div>

              <Radio
                className={`h-5 w-5 ${
                  sharing ? "text-green-600" : "text-gray-400"
                }`}
              />
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">Sharing Status</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    sharing
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {sharing ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600">Last upload</span>
                <span className="text-xs text-gray-600">
                  {locationSaving
                    ? "Sending..."
                    : lastLocationSent
                      ? formatTime(lastLocationSent)
                      : "Not sent yet"}
                </span>
              </div>
            </div>

            {shareError && (
              <p className="mt-3 text-sm text-red-600">{shareError}</p>
            )}

            <button
              type="button"
              onClick={toggleSharing}
              className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white ${
                sharing
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {sharing ? "Stop Sharing Location" : "Start Sharing Location"}
            </button>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Location uploads occur approximately every 15 seconds while
              sharing is active and a GPS reading is available.
            </p>
          </div>
        </div>
      </div>

      {/* SITE CHECK-IN */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Check In at Fault Site
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Record your arrival using your current GPS coordinates.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="checkin-notes"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Arrival Notes (Optional)
          </label>

          <textarea
            id="checkin-notes"
            value={checkInNotes}
            onChange={(event) => setCheckInNotes(event.target.value)}
            rows={3}
            placeholder="Enter any notes about your arrival..."
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            {position
              ? `GPS accuracy: ${Math.round(position.accuracy)} metres`
              : "Waiting for GPS location..."}
          </p>

          <button
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn || checkedIn || !position || !assignment}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {checkingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording Check-in...
              </>
            ) : checkedIn ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Checked In
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Check In at Site
              </>
            )}
          </button>
        </div>
      </div>

      {/* TRACKING HISTORY */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              GPS Tracking History
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Recent GPS readings in this browser session.
            </p>
          </div>

          <Clock className="h-5 w-5 text-gray-400" />
        </div>

        {trackingHistory.length === 0 ? (
          <div className="py-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Waiting for your first GPS reading...
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {trackingHistory.map((item, index) => (
              <div
                key={`${item.type}-${item.timestamp}-${index}`}
                className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-blue-50 p-2 text-blue-600">
                    {item.type === "check-in" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.type === "check-in"
                        ? "Site Check-in"
                        : "GPS Location Recorded"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="pl-11 text-xs text-gray-500 sm:pl-0 sm:text-right">
                  <p>{formatTime(item.timestamp)}</p>
                  {Number.isFinite(item.accuracy) && (
                    <p className="mt-1">
                      Accuracy: {Math.round(item.accuracy)} m
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

function SummaryCard({ title, value, icon, iconClass }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-gray-100 p-2 text-gray-600">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-1 break-words text-sm font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-800">{value}</p>
    </div>
  );
}

function AlertBox({ type, message }) {
  const styles = {
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-green-200 bg-green-50 text-green-700",
  };

  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
        ? XCircle
        : AlertTriangle;

  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 text-sm ${styles[type]}`}
      role={type === "error" ? "alert" : "status"}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}