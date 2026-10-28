import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, RefreshCw, X } from "lucide-react";
import PageShell, { Card, inputClass, primaryBtn } from "../../components/PageShell";
import StatusBadge from "../../components/StatusBadge";

const API_BASE = "http://localhost:5000/api/v1";
const emptyForm = { siteCode: "", siteName: "", location: "", siteType: "substation" };

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function unwrapList(result, key) {
  const data = result?.data;
  const candidates = [data?.[key], result?.[key], data?.data?.[key], data?.data, data];
  return candidates.find(Array.isArray) || [];
}

function normaliseSite(site) {
  const rawStatus = String(site.status || "active").toLowerCase();
  const status = rawStatus === "active" || rawStatus === "operational"
    ? "Operational"
    : rawStatus === "maintenance" || rawStatus === "under maintenance"
      ? "Under Maintenance"
      : rawStatus === "faulty" || rawStatus === "fault"
        ? "Faulty"
        : "Inactive";

  return {
    id: site.id ?? site.site_code ?? site.siteCode ?? "—",
    siteCode: site.site_code ?? site.siteCode ?? "",
    name: site.site_name ?? site.siteName ?? site.name ?? "Unnamed site",
    location: site.location ?? site.address ?? "Location not provided",
    siteType: site.site_type ?? site.siteType ?? "substation",
    status,
    raw: site,
  };
}

function messageFromError(error) {
  return error?.message || "Something went wrong. Please try again.";
}

export default function AllSites() {
  const [sites, setSites] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const token = getToken();
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || result.error || `Request failed (${response.status})`);
    }
    return result;
  }, []);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request("/sites");
      setSites(unwrapList(result, "sites").map(normaliseSite));
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const filtered = useMemo(() => sites.filter((site) => {
    const matchesStatus = status === "All" || site.status === status;
    const searchable = `${site.name} ${site.location} ${site.id} ${site.siteCode} ${site.siteType}`.toLowerCase();
    return matchesStatus && searchable.includes(query.toLowerCase().trim());
  }), [sites, query, status]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const register = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = {
        siteCode: form.siteCode.trim(),
        siteName: form.siteName.trim(),
        location: form.location.trim(),
        siteType: form.siteType,
        status: "active",
      };
      const result = await request("/sites", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const created = result?.data?.site ?? result?.site ?? result?.data?.doc ?? result?.doc;
      if (created && typeof created === "object") {
        setSites((current) => [normaliseSite(created), ...current.filter((item) => String(item.id) !== String(created.id))]);
      } else {
        await loadSites();
      }
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Site registered successfully.");
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="All Sites"
      subtitle="Register, search and manage electricity distribution sites"
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${primaryBtn} inline-flex items-center gap-2`} onClick={() => { setShowForm((open) => !open); setError(""); }}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close form" : "Register site"}
          </button>
          <button type="button" onClick={loadSites} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      }
    >
      {showForm && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Register a new site</h3>
          <form onSubmit={register} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input required maxLength={40} className={inputClass} placeholder="Site code (e.g. MP-NSK-002)" value={form.siteCode}
              onChange={(event) => updateForm("siteCode", event.target.value)} />
            <input required maxLength={120} className={inputClass} placeholder="Site name" value={form.siteName}
              onChange={(event) => updateForm("siteName", event.target.value)} />
            <input required maxLength={255} className={inputClass} placeholder="Location / address" value={form.location}
              onChange={(event) => updateForm("location", event.target.value)} />
            <select className={inputClass} value={form.siteType} onChange={(event) => updateForm("siteType", event.target.value)}>
              <option value="substation">Substation</option>
              <option value="transformer">Transformer</option>
              <option value="feeder">Feeder</option>
              <option value="distribution">Distribution site</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" disabled={saving} className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`}>
              {saving ? "Saving…" : "Save site"}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">New sites are registered with an active status. The site code must be unique.</p>
        </Card>
      )}

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadSites} className="font-semibold underline">Try again</button>
        </div>
      )}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input aria-label="Search sites" className={`${inputClass} w-full pl-9`} placeholder="Search sites…" value={query}
            onChange={(event) => setQuery(event.target.value)} />
        </div>
        <select aria-label="Filter sites by status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="All">All statuses</option>
          <option value="Operational">Operational</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Faulty">Faulty</option>
          <option value="Inactive">Inactive</option>
        </select>
        <p className="self-center text-sm text-slate-500">{filtered.length} site{filtered.length === 1 ? "" : "s"}</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Site code / ID</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Site type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && sites.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading sites from the server…</td></tr>
            )}
            {!loading && filtered.map((site) => (
              <tr key={site.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-500">{site.siteCode || site.id}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{site.name}</td>
                <td className="px-4 py-3 text-slate-600">{site.location}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{String(site.siteType).replaceAll("_", " ")}</td>
                <td className="px-4 py-3"><StatusBadge value={site.status} /></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{error ? "Sites could not be loaded." : "No sites match your search or selected status."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
