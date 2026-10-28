import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../components/PageShell";
import StatusBadge from "../../components/StatusBadge";

const API_BASE = "http://localhost:5000/api/v1";

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function normalizeSite(site) {
  const rawStatus = String(site.status ?? "active").toLowerCase();
  const status = rawStatus === "active" || rawStatus === "operational"
    ? "Operational"
    : rawStatus === "maintenance"
      ? "Maintenance"
      : rawStatus === "inactive"
        ? "Inactive"
        : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

  return {
    ...site,
    id: site.id,
    name: site.site_name ?? site.siteName ?? site.name ?? site.site_code ?? site.siteCode ?? `Site ${site.id}`,
    location: site.location ?? site.address ?? "Location unavailable",
    status,
  };
}

function normalizeFault(fault, sitesById) {
  const siteId = fault.site_id ?? fault.siteId;
  const site = sitesById.get(String(siteId));
  const status = String(fault.status ?? "unknown").toLowerCase().replace(/_/g, " ");
  const type = String(fault.fault_type ?? fault.faultType ?? "fault").replace(/_/g, " ");
  const dateValue = fault.updated_at ?? fault.reported_at ?? fault.created_at;
  const date = dateValue && !Number.isNaN(new Date(dateValue).getTime())
    ? new Date(dateValue).toLocaleString()
    : "Date unavailable";

  return {
    id: `fault-${fault.id}`,
    text: `Fault #${fault.id}: ${type} — ${status}`,
    date,
    type: "Fault activity",
    siteName: site?.name ?? fault.site_name ?? fault.siteName ?? fault.site_code ?? "Unknown site",
    timestamp: dateValue ? new Date(dateValue).getTime() : 0,
  };
}

async function getList(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    // Keep the API error message below useful when the response is not JSON.
  }

  if (!response.ok) {
    throw new Error(result.message || `Request to ${path} failed (${response.status}).`);
  }

  const key = path.includes("/sites") ? "sites" : "faults";
  const records = result.data?.[key] ?? result[key] ?? result.data;
  if (!Array.isArray(records)) {
    throw new Error(`The server response for ${path} did not contain a valid ${key} list.`);
  }
  return records;
}

export default function SiteOverview() {
  const [sites, setSites] = useState([]);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    const token = getToken();
    if (!token) {
      setError("Your login session was not found. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [siteRecords, faultRecords] = await Promise.all([
        getList("/sites", token),
        getList("/faults", token),
      ]);
      setSites(siteRecords.map(normalizeSite));
      setFaults(faultRecords);
    } catch (err) {
      setError(err.message || "Unable to load site overview data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      const token = getToken();
      if (!token) {
        if (active) {
          setError("Your login session was not found. Please log in again.");
          setLoading(false);
        }
        return;
      }

      try {
        const [siteRecords, faultRecords] = await Promise.all([
          getList("/sites", token),
          getList("/faults", token),
        ]);
        if (active) {
          setSites(siteRecords.map(normalizeSite));
          setFaults(faultRecords);
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load site overview data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    initialLoad();
    return () => { active = false; };
  }, []);

  const sitesById = useMemo(() => new Map(sites.map((site) => [String(site.id), site])), [sites]);
  const attention = sites.filter((site) => site.status !== "Operational");
  const recentActivity = useMemo(
    () => faults
      .map((fault) => normalizeFault(fault, sitesById))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5),
    [faults, sitesById]
  );

  return (
    <PageShell title="Site Overview" subtitle="Summary of sites and their status">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Site and fault information from your MainPower API.</p>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Sites needing attention ({attention.length})</h3>
          {loading && sites.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading sites...</p>
          ) : attention.length === 0 ? (
            <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-500">
              {sites.length === 0 ? "No site records available." : "All sites are operational."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {attention.map((site) => (
                <li key={site.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{site.name}</p>
                    <p className="text-xs text-slate-500">{site.location}</p>
                  </div>
                  <StatusBadge value={site.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent activity</h3>
          {loading && faults.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading activity...</p>
          ) : recentActivity.length === 0 ? (
            <p className="rounded-xl border border-slate-200 py-6 text-center text-sm text-slate-500">
              No fault activity available yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {recentActivity.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm text-slate-800">{item.text}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.date} · {item.type} · {item.siteName}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
