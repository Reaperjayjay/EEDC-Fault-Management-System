import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { priorityStyles, statusStyles } from "./faultData";
import Badge from "./Badge";

const API_URL = "http://localhost:5000/api/v1/faults";

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

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

export default function CriticalFaults() {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFaults = useCallback(async (signal) => {
    const token = getToken();
    if (!token) {
      throw new Error("Your login session was not found. Please log in again.");
    }

    const response = await fetch(API_URL, {
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

    async function load() {
      try {
        const records = await fetchFaults(controller.signal);
        if (active) {
          setFaults(records);
          setError("");
        }
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Unable to load critical faults.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

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
      setError(err.message || "Unable to refresh critical faults.");
    } finally {
      setLoading(false);
    }
  }

  function handleEscalate(fault) {
    window.dispatchEvent(
      new CustomEvent("mainpower:escalate-fault", {
        detail: { faultId: fault.id },
      })
    );
  }

  function handleReassign(fault) {
    window.dispatchEvent(
      new CustomEvent("mainpower:reassign-fault", {
        detail: { faultId: fault.id },
      })
    );
  }

  const urgent = faults
    .filter(
      (fault) =>
        ["critical", "high"].includes(String(fault.severity || "").toLowerCase()) &&
        !["resolved", "cancelled"].includes(String(fault.status || "").toLowerCase())
    )
    .sort((a, b) => {
      const rank = { critical: 0, high: 1 };
      return (
        (rank[String(a.severity || "").toLowerCase()] ?? 2) -
        (rank[String(b.severity || "").toLowerCase()] ?? 2)
      );
    });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm text-gray-900">
          Critical &amp; Priority Faults ({urgent.length})
        </h3>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && faults.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">Loading critical faults...</p>
      )}

      <div className="space-y-3">
        {urgent.map((fault) => {
          const priorityKey = String(fault.severity || "").toLowerCase();
          const statusKey = String(fault.status || "").toLowerCase();
          const priority = priorityLabels[priorityKey] || "Medium";
          const status = statusLabels[statusKey] || statusKey || "Unknown";
          const isCritical = priorityKey === "critical";
          const location = fault.site_name || fault.site_code || "Unknown site";
          const engineer = fault.engineer_name || "Not assigned";

          return (
            <div
              key={fault.id}
              className={`rounded-xl border px-4 py-3 ${
                isCritical ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isCritical ? "text-red-600" : "text-orange-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">
                      #{fault.id} · {formatFaultType(fault.fault_type)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {location} · Engineer: {engineer}
                    </p>
                    {fault.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                        {fault.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatDate(fault.reported_at)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-row gap-1.5 sm:flex-col sm:items-end">
                  <Badge
                    className={
                      priorityStyles[priority] ||
                      priorityStyles[priorityKey] ||
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    {priority}
                  </Badge>
                  <Badge
                    className={
                      statusStyles[status] ||
                      statusStyles[statusKey] ||
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEscalate(fault)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                >
                  Escalate
                </button>
                <button
                  type="button"
                  onClick={() => handleReassign(fault)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Reassign
                </button>
              </div>
            </div>
          );
        })}

        {!loading && urgent.length === 0 && !error && (
          <p className="py-6 text-center text-sm text-gray-400">
            No urgent faults. All clear.
          </p>
        )}
      </div>
    </section>
  );
}
