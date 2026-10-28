import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { priorityStyles } from "./faultData";
import Badge from "./Badge";

const API_URL = "http://localhost:5000/api/v1/faults";

/*const statusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "Under Repair",
  resolved: "Resolved",
  cancelled: "Cancelled",
};*/

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
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
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString();
}

export default function NewFaultReports() {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  //const [assigningId, setAssigningId] = useState(null);

  const loadFaults = useCallback(async ({ initial = false } = {}) => {
    if (!initial) setLoading(true);
    setError("");

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Your login session was not found. Please log in again.");
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Unable to load reports (${response.status}).`);
      }

      const records = result.data?.faults;
      if (!Array.isArray(records)) {
        throw new Error("The server response does not contain a valid faults list.");
      }

      setFaults(records);
    } catch (err) {
      setError(err.message || "Unable to load new fault reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchInitialFaults() {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Your login session was not found. Please log in again.");
        }

        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `Unable to load reports (${response.status}).`);
        }

        if (!Array.isArray(result.data?.faults)) {
          throw new Error("The server response does not contain a valid faults list.");
        }

        if (active) setFaults(result.data.faults);
      } catch (err) {
        if (active) setError(err.message || "Unable to load new fault reports.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchInitialFaults();
    return () => {
      active = false;
    };
  }, []);

  const newReports = faults.filter((fault) => fault.status === "pending");

  function handleAssign(fault) {
    // Assignment requires a selected engineer and a valid numeric fault ID.
    // Route to the assignment screen; do not create a fake assignment here.
    window.dispatchEvent(
      new CustomEvent("mainpower:assign-fault", {
        detail: { faultId: fault.id },
      })
    );
  }

  function handleView(fault) {
    window.dispatchEvent(
      new CustomEvent("mainpower:view-fault", {
        detail: { faultId: fault.id },
      })
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          New Fault Reports ({newReports.length})
        </h3>

        <button
          type="button"
          onClick={() => loadFaults()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
        <p className="py-6 text-center text-sm text-gray-500">Loading new reports...</p>
      )}

      {!loading && !error && newReports.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No new reports right now.</p>
      )}

      <div className="space-y-2.5">
        {newReports.map((fault) => {
          const priority = priorityLabels[fault.severity] || "Medium";
          const location = fault.site_name || fault.site_code || "Unknown site";

          return (
            <div
              key={fault.id}
              className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900">
                  #{fault.id} · {formatFaultType(fault.fault_type)}
                </p>
                <p className="text-xs text-gray-600">{location}</p>

                {fault.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                    {fault.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-gray-200 bg-white text-gray-600">
                    {fault.reported_by_name ? `Reported by ${fault.reported_by_name}` : "Fault report"}
                  </Badge>
                  <Badge className={priorityStyles[fault.severity] || "bg-gray-100 text-gray-700"}>
                    {priority}
                  </Badge>
                  <span className="text-[11px] text-gray-400">
                    {formatDate(fault.reported_at)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleAssign(fault)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700"
                >
                  Assign Engineer
                </button>
                <button
                  type="button"
                  onClick={() => handleView(fault)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
