import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import { statusStyles, priorityStyles } from "./faultData";
import Badge from "./Badge";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
const FAULTS_URL = `${API_BASE_URL}/faults`;

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

function formatFaultType(value) {
  if (!value) return "Other";

  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(value) {
  return STATUS_LABELS[value] || value || "Unknown";
}

function getBadgeClass(styleMap, rawValue, displayValue) {
  return (
    styleMap?.[rawValue] ||
    styleMap?.[displayValue] ||
    "bg-gray-100 text-gray-700"
  );
}

// Pure request function: it only fetches and returns data.
// It never touches component state, so it is safe to call from an effect.
async function fetchFaults(signal) {
  const token = getToken();

  if (!token) {
    throw new Error("Your login session was not found. Please log in again.");
  }

  const response = await fetch(FAULTS_URL, {
    method: "GET",
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    throw new Error(
      result.message || `Unable to retrieve faults (${response.status}).`
    );
  }

  // handlerFactory.getAll(Fault, 'faults') should return data.faults.
  const faultRows = result?.data?.faults;

  if (!Array.isArray(faultRows)) {
    throw new Error(
      "The server response does not contain a faults list. Check the getAll response in handlerFactory."
    );
  }

  return faultRows;
}

export default function AllFaults() {
  const [faults, setFaults] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true); // true on first render
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // The effect only starts the request. State is updated after the
  // request finishes (asynchronously), never synchronously in the effect body.
  useEffect(() => {
    const controller = new AbortController();

    fetchFaults(controller.signal)
      .then((faultRows) => {
        if (controller.signal.aborted) return;
        setFaults(faultRows);
        setError("");
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === "AbortError") return;
        setError(err.message || "An error occurred while loading faults.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  // Event handlers can set state freely. Changing reloadKey re-runs the effect.
  const handleRefresh = () => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  };

  const rows = useMemo(() => {
    const searchText = query.trim().toLowerCase();

    return faults.filter((fault) => {
      const displayStatus = formatStatus(fault.status);
      const matchesStatus = status === "All" || displayStatus === status;

      const searchFields = [
        fault.id,
        fault.fault_type,
        formatFaultType(fault.fault_type),
        fault.site_name,
        fault.site_code,
        fault.engineer_name,
        fault.description,
        fault.severity,
        PRIORITY_LABELS[fault.severity],
        displayStatus,
      ];

      const matchesText =
        !searchText ||
        searchFields.some((value) =>
          String(value ?? "").toLowerCase().includes(searchText)
        );

      return matchesStatus && matchesText;
    });
  }, [faults, query, status]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            All Faults ({rows.length})
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Fault reports retrieved from the MainPower database.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, type, location..."
              aria-label="Search faults"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 sm:w-60"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter faults by status"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
          >
            {[
              "All",
              "Pending",
              "Assigned",
              "Under Repair",
              "Resolved",
              "Cancelled",
            ].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh fault records"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load faults</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              {[
                "Fault ID",
                "Type",
                "Location",
                "Priority",
                "Assigned Engineer",
                "Status",
              ].map((heading) => (
                <th key={heading} className="py-2.5 pr-4 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && faults.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  Loading fault records...
                </td>
              </tr>
            )}

            {!error &&
              rows.map((fault) => {
                const displayStatus = formatStatus(fault.status);
                const displayPriority =
                  PRIORITY_LABELS[fault.severity] || "Medium";
                const location =
                  fault.site_name || fault.site_code || "Unknown site";

                return (
                  <tr
                    key={fault.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      #{fault.id}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {formatFaultType(fault.fault_type)}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      <div>{location}</div>
                      {fault.site_code && (
                        <div className="mt-1 text-gray-400">
                          {fault.site_code}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={getBadgeClass(
                          priorityStyles,
                          fault.severity,
                          displayPriority
                        )}
                      >
                        {displayPriority}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {fault.engineer_name || "Not assigned"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={getBadgeClass(
                          statusStyles,
                          fault.status,
                          displayStatus
                        )}
                      >
                        {displayStatus}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  {faults.length === 0
                    ? "No fault records found in the database."
                    : "No faults match your search or selected status."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && !error && (
        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Showing {rows.length} of {faults.length} fault records
        </div>
      )}
    </section>
  );
}