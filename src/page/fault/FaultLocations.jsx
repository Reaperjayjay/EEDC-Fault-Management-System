import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, RefreshCw, AlertCircle } from "lucide-react";

const API_URL = "http://localhost:5000/api/v1/faults";

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function isOpen(status) {
  return !["resolved", "cancelled"].includes(String(status || "").toLowerCase());
}

function getCoordinates(fault) {
  const latitude =
    fault.site_latitude ??
    fault.siteLatitude ??
    fault.latitude ??
    fault.detected_latitude ??
    fault.detectedLatitude;
  const longitude =
    fault.site_longitude ??
    fault.siteLongitude ??
    fault.longitude ??
    fault.detected_longitude ??
    fault.detectedLongitude;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { latitude: lat, longitude: lng };
}

function getSiteName(fault) {
  return fault.site_name || fault.siteName || fault.site_code || fault.siteCode || "Unknown site";
}

export default function FaultLocations() {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFaults = useCallback(async (signal) => {
    const token = getToken();
    if (!token) {
      throw new Error("Your login session was not found. Please log in again.");
    }

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Unable to load faults (${response.status}).`);
    }

    if (!Array.isArray(result.data?.faults)) {
      throw new Error("The server response does not contain a valid faults list.");
    }

    return result.data.faults;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadFaults() {
      try {
        const records = await fetchFaults(controller.signal);
        if (active) {
          setFaults(records);
          setError("");
        }
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Unable to load fault locations.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFaults();

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchFaults]);

  async function handleRefresh() {
    setLoading(true);
    setError("");

    try {
      const records = await fetchFaults();
      setFaults(records);
    } catch (err) {
      setError(err.message || "Unable to refresh fault locations.");
    } finally {
      setLoading(false);
    }
  }

  const sites = useMemo(() => {
    const grouped = new Map();

    for (const fault of faults) {
      const name = getSiteName(fault);
      const key = String(fault.site_id ?? fault.siteId ?? fault.site_code ?? fault.siteCode ?? name);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          name,
          total: 0,
          open: 0,
          critical: 0,
          coordinates: getCoordinates(fault),
        });
      }

      const site = grouped.get(key);
      site.total += 1;

      if (isOpen(fault.status)) site.open += 1;
      if (
        String(fault.severity || "").toLowerCase() === "critical" &&
        isOpen(fault.status)
      ) {
        site.critical += 1;
      }

      if (!site.coordinates) site.coordinates = getCoordinates(fault);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.critical - a.critical || b.open - a.open || a.name.localeCompare(b.name)
    );
  }, [faults]);

  const sitesWithCoordinates = sites.filter((site) => site.coordinates);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Fault Map</h3>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
          {loading && faults.length === 0 ? (
            <p className="text-sm text-gray-500">Loading fault locations...</p>
          ) : sites.length === 0 ? (
            <>
              <MapPin className="mb-2 h-7 w-7 text-gray-400" />
              <p className="text-sm text-gray-600">No fault locations to display.</p>
            </>
          ) : (
            <>
              <MapPin className="mb-2 h-7 w-7 text-blue-600" />
              <p className="text-sm font-medium text-gray-800">
                {sitesWithCoordinates.length} of {sites.length} affected sites have coordinates
              </p>
              <p className="mt-1 max-w-md text-xs text-gray-500">
                This panel prepares the site locations for mapping. To display interactive map
                markers, connect a map library such as React Leaflet and ensure the API returns
                each site's latitude and longitude.
              </p>
              {sitesWithCoordinates.length > 0 && (
                <div className="mt-4 w-full max-w-lg space-y-2 text-left">
                  {sitesWithCoordinates.slice(0, 5).map((site) => (
                    <div
                      key={site.key}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <p className="text-xs font-medium text-gray-800">{site.name}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {site.coordinates.latitude.toFixed(6)}, {site.coordinates.longitude.toFixed(6)}
                      </p>
                    </div>
                  ))}
                  {sitesWithCoordinates.length > 5 && (
                    <p className="text-xs text-gray-500">
                      And {sitesWithCoordinates.length - 5} more sites with coordinates.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          Affected Sites ({sites.length})
        </h3>

        {sites.length === 0 && !loading && !error && (
          <p className="py-6 text-center text-xs text-gray-400">No affected sites.</p>
        )}

        <div className="space-y-2.5">
          {sites.map((site) => (
            <div key={site.key} className="rounded-xl border border-gray-200 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-sm text-gray-900">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span>{site.name}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {site.open} open · {site.total} total
                {site.critical > 0 && (
                  <span className="text-red-500"> · {site.critical} critical</span>
                )}
              </p>
              {!site.coordinates && (
                <p className="mt-1 text-[10px] text-amber-600">Coordinates unavailable</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
