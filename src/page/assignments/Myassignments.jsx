import { useEffect, useState } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  MapPin,
  Navigation,
  RefreshCw,
  AlertCircle,
  Wrench,
  X,
} from "lucide-react";

import { apiRequest } from "../../services/api";

const STATUS_LABELS = {
  assigned: "Awaiting Response",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  assigned: "bg-orange-50 text-orange-700",
  accepted: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function normalizeAssignment(item) {
  const status = String(item.assignment_status || "assigned").toLowerCase();

  return {
    ...item,
    id: item.assignment_id,
    faultId: item.fault_id,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    site: item.site_name || "Site not provided",
    description:
      item.description || item.fault_type || "No fault description provided.",
    priority: item.severity || "Medium",
    lat: item.site_latitude == null ? null : Number(item.site_latitude),
    lng: item.site_longitude == null ? null : Number(item.site_longitude),
    assignedAt: item.assigned_at
      ? new Date(item.assigned_at).toLocaleString()
      : "Not available",
  };
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export default function MyAssignments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [tab, setTab] = useState("active");

  // Initial load. State updates occur after the asynchronous request.
  useEffect(() => {
    const controller = new AbortController();

    async function fetchAssignments() {
      try {
        console.log("MY ASSIGNMENTS COMPONENT IS RUNNING");
        const response = await apiRequest("/assignments/my-assignments", {
          signal: controller.signal,
        });

        console.log("MY ASSIGNMENTS API RESPONSE:", response);
        console.log("ASSIGNMENTS FROM DATABASE:", response?.data?.assignments);

        const assignments = response?.data?.assignments;

        if (!Array.isArray(assignments)) {
          throw new Error(
            "The server returned an invalid assignments response.",
          );
        }

        if (!controller.signal.aborted) {
          setItems(assignments.map(normalizeAssignment));
        }
      } catch (err) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setError(err.message || "Unable to load assignments.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchAssignments();

    return () => controller.abort();
  }, []);

  async function loadAssignments() {
    try {
      setRefreshing(true);
      setError("");

      const response = await apiRequest("/assignments/my-assignments");

      const assignments = response?.data?.assignments;

      if (!Array.isArray(assignments)) {
        throw new Error("The server returned an invalid assignments response.");
      }

      setItems(assignments.map(normalizeAssignment));
    } catch (err) {
      setError(err.message || "Unable to refresh assignments.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  async function updateStatus(assignmentId, status) {
    try {
      setUpdatingId(assignmentId);
      setError("");

      await apiRequest(`/assignments/${assignmentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      // Reload the data saved by the backend.
      await loadAssignments();
    } catch (err) {
      setError(err.message || "Unable to update assignment status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const active = items.filter(
    (item) => !["completed", "rejected", "cancelled"].includes(item.status),
  );

  const history = items.filter((item) =>
    ["completed", "rejected", "cancelled"].includes(item.status),
  );

  const summary = [
    {
      label: "Total Assigned",
      value: items.length,
      icon: ClipboardList,
      color: "text-slate-700",
    },
    {
      label: "Awaiting Response",
      value: items.filter((item) => item.status === "assigned").length,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      label: "In Progress",
      value: items.filter((item) => item.status === "in_progress").length,
      icon: Wrench,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: items.filter((item) => item.status === "completed").length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Loading your assignments...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Assignments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your assigned faults and update your work status.
          </p>
        </div>

        <button
          onClick={loadAssignments}
          disabled={refreshing}
          className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="rounded-xl bg-slate-100 p-3">
              <Icon className={`h-6 w-6 ${color}`} />
            </div>

            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-slate-200/70 p-1">
        {[
          ["active", "Active", active.length],
          ["history", "History", history.length],
        ].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {count}
            </span>
          </button>
        ))}
      </div>

      {tab === "active" ? (
        <AssignmentSection
          assignments={active}
          updatingId={updatingId}
          updateStatus={updateStatus}
          onRefresh={loadAssignments}
          emptyMessage="No active assignments have been assigned to you."
        />
      ) : (
        <AssignmentSection
          assignments={history}
          updatingId={updatingId}
          updateStatus={updateStatus}
          history
          emptyMessage="Your completed and rejected assignments will appear here."
        />
      )}
    </div>
  );
}

function AssignmentSection({
  assignments,
  updatingId,
  updateStatus,
  history = false,
  emptyMessage,
}) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {assignments.map((item) => {
        const busy = updatingId === item.id;

        return (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">
                  Fault #{item.faultId}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[item.status] || "bg-slate-100 text-slate-600"
                }`}
              >
                {item.statusLabel}
              </span>
            </div>

            <dl className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info icon={MapPin} label="Site">
                {item.site}
              </Info>

              <Info icon={ClipboardList} label="Assignment ID">
                {item.id}
              </Info>

              <Info icon={Clock} label="Date assigned">
                {item.assignedAt}
              </Info>

              <Info icon={Wrench} label="Fault severity">
                {item.priority}
              </Info>

              <Info icon={MapPin} label="GPS coordinates">
                {item.lat != null &&
                item.lng != null &&
                Number.isFinite(item.lat) &&
                Number.isFinite(item.lng)
                  ? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`
                  : "Coordinates unavailable"}
              </Info>
            </dl>

            {item.lat != null &&
              item.lng != null &&
              Number.isFinite(item.lat) &&
              Number.isFinite(item.lng) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonBase} border border-slate-300 bg-white text-slate-700`}
                  >
                    <MapPin className="h-4 w-4" />
                    View Site
                  </a>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    <Navigation className="h-4 w-4" />
                    Navigate
                  </a>
                </div>
              )}

            {!history && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {item.status === "assigned" && (
                  <button
                    disabled={busy}
                    onClick={() => updateStatus(item.id, "accepted")}
                    className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Assignment
                  </button>
                )}

                {item.status === "accepted" && (
                  <button
                    disabled={busy}
                    onClick={() => updateStatus(item.id, "in_progress")}
                    className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
                  >
                    <Wrench className="h-4 w-4" />
                    Start Work
                  </button>
                )}

                {item.status === "in_progress" && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Mark this assignment as completed?",
                      );

                      if (confirmed) {
                        updateStatus(item.id, "completed");
                      }
                    }}
                    className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Assignment
                  </button>
                )}

                {busy && (
                  <span className="self-center text-sm text-slate-500">
                    Saving changes...
                  </span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="break-words text-sm font-medium text-slate-900">
          {children}
        </dd>
      </div>
    </div>
  );
}