import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

const API_URL = "http://localhost:5000/api/v1/faults";

const statusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "Under Repair",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function formatFaultType(type) {
  if (!type) return "Other";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function ResolvedFaults() {
  const [faults, setFaults] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadFaults({ isRefresh = false } = {}) {
    if (isRefresh) setRefreshing(true);
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("Your login session was not found. Please log in again.");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Unable to load faults (${response.status}).`);
      }

      const records = result.data?.faults;
      if (!Array.isArray(records)) {
        throw new Error("The server response does not contain a valid faults list.");
      }

      const resolvedRecords = records.filter((fault) => fault.status === "resolved");
      setFaults(resolvedRecords);
      setOpenId((currentId) => {
        if (currentId != null && resolvedRecords.some((fault) => String(fault.id) === String(currentId))) {
          return currentId;
        }
        return resolvedRecords[0]?.id ?? null;
      });
    } catch (err) {
      setError(err.message || "Unable to load resolved faults.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function fetchInitialFaults() {
      try {
        const token = getToken();
        if (!token) throw new Error("Your login session was not found. Please log in again.");

        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `Unable to load faults (${response.status}).`);
        }
        if (!Array.isArray(result.data?.faults)) {
          throw new Error("The server response does not contain a valid faults list.");
        }

        if (active) {
          const resolvedRecords = result.data.faults.filter((fault) => fault.status === "resolved");
          setFaults(resolvedRecords);
          setOpenId(resolvedRecords[0]?.id ?? null);
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load resolved faults.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchInitialFaults();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm text-gray-900">Resolved Faults &amp; History ({faults.length})</h3>
        <button
          type="button"
          onClick={() => loadFaults({ isRefresh: true })}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && faults.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">Loading resolved faults...</p>
      )}

      {!loading && !error && faults.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No resolved faults yet.</p>
      )}

      <div className="space-y-2.5">
        {faults.map((fault) => {
          const open = String(openId) === String(fault.id);
          const site = fault.site_name || fault.site_code || fault.location || "Unknown site";
          const engineer = fault.engineer_name || fault.assigned_engineer_name || "Not recorded";
          const closureNotes = fault.closure_notes || fault.resolution_notes || fault.closure || fault.notes;
          const history = Array.isArray(fault.history) ? fault.history : [];

          return (
            <div key={fault.id} className="rounded-xl border border-green-200 bg-green-50">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : fault.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">#{fault.id} · {formatFaultType(fault.fault_type)}</p>
                    <p className="text-xs text-gray-500">{site} · Engineer: {engineer}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Resolved: {formatDate(fault.resolved_at)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-green-700">{open ? "Hide" : "Details"}</span>
              </button>

              {open && (
                <div className="rounded-b-xl border-t border-green-200 bg-white px-4 py-3">
                  <p className="text-xs text-gray-500">Fault description</p>
                  <p className="mt-1 text-sm text-gray-800">{fault.description || "No description recorded."}</p>

                  <p className="mb-1 mt-4 text-xs text-gray-500">Closure evidence / resolution notes</p>
                  <p className="text-sm text-gray-800">{closureNotes || "No closure notes have been provided by the API."}</p>

                  <p className="mb-2 mt-4 text-xs text-gray-500">Update history</p>
                  {history.length > 0 ? (
                    <ol className="space-y-2 border-l border-gray-200 pl-4">
                      {history.map((entry, index) => (
                        <li key={`${entry.time || entry.created_at || "event"}-${index}`} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-green-500" />
                          <p className="text-xs text-gray-800">{entry.note || entry.description || entry.status || "Status updated"}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(entry.time || entry.created_at || entry.updated_at)}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-gray-500">No update history is available in the current API response.</p>
                  )}
                  <p className="mt-3 text-[11px] text-gray-400">Current status: {statusLabels[fault.status] || fault.status}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
