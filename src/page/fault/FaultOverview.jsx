import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { statusStyles, priorityStyles } from "./faultData";
import Badge from "./Badge";

const API_URL = "http://localhost:5000/api/v1/faults";

const STATUS_LABELS = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "Under Repair",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS = {
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

function formatStatus(status) {
  return STATUS_LABELS[status] || status || "Unknown";
}

function formatReportedDate(dateValue) {
  if (!dateValue) return "Date unavailable";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString();
}

export default function FaultOverview() {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchFaults() {
      try {
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
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || `Unable to load faults (${response.status}).`);
        }

        const faultRows = result.data?.faults;
        if (!Array.isArray(faultRows)) {
          throw new Error("The server response does not contain a valid faults list.");
        }

        if (!cancelled) {
          setFaults(faultRows);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "An error occurred while loading faults.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFaults();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const cards = useMemo(() => {
    const count = (predicate) => faults.filter(predicate).length;

    return [
      { label: "Total Faults", value: faults.length, color: "text-gray-900" },
      { label: "Pending", value: count((f) => f.status === "pending"), color: "text-orange-500" },
      { label: "Critical", value: count((f) => f.severity === "critical"), color: "text-red-500" },
      { label: "Assigned", value: count((f) => f.status === "assigned"), color: "text-blue-600" },
      { label: "Under Repair", value: count((f) => f.status === "in_progress"), color: "text-purple-600" },
      { label: "Resolved", value: count((f) => f.status === "resolved"), color: "text-green-600" },
    ];
  }, [faults]);

  const latestFaults = useMemo(() => {
    return [...faults]
      .sort((a, b) => {
        const dateA = new Date(a.reported_at || 0).getTime();
        const dateB = new Date(b.reported_at || 0).getTime();
        return dateB - dateA || Number(b.id) - Number(a.id);
      })
      .slice(0, 5);
  }, [faults]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Fault Overview</h2>
          <p className="mt-1 text-xs text-gray-500">Summary of fault reports from the database.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReloadKey((key) => key + 1);
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load fault data</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`mt-2 text-2xl font-medium ${card.color}`}>
              {loading && faults.length === 0 ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Latest Faults</h3>

        {loading && faults.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">Loading fault records...</p>
        )}

        {!loading && !error && faults.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">No faults yet.</p>
        )}

        <div className="space-y-2.5">
          {latestFaults.map((fault) => {
            const priority = PRIORITY_LABELS[fault.severity] || "Medium";
            const status = formatStatus(fault.status);
            const location = fault.site_name || fault.site_code || "Unknown site";
            const faultType = formatFaultType(fault.fault_type);

            return (
              <div key={fault.id} className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-900">
                    #{fault.id} · {faultType}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {location} · {formatReportedDate(fault.reported_at)}
                  </p>
                  {fault.engineer_name && (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      Engineer: {fault.engineer_name}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Badge className={priorityStyles[priority] || priorityStyles[fault.severity] || "bg-gray-100 text-gray-700"}>
                    {priority}
                  </Badge>
                  <Badge className={statusStyles[status] || statusStyles[fault.status] || "bg-gray-100 text-gray-700"}>
                    {status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
