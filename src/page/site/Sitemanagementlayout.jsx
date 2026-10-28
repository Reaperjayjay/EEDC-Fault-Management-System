import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { API_URL, authHeaders } from "../../utils/api";

const nav = [
  { to: "overview", title: "Site Overview", desc: "Summary of sites and their status" },
  { to: "sites", title: "All Sites", desc: "Register, search and manage sites" }
];

export default function SiteManagementLayout() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/sites`, {
        headers: authHeaders(),
        credentials: "include", // needed only if your backend uses cookies
      });

      // Session missing or expired: clear token and go to login
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }

      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        throw new Error(json.message || "Failed to load sites");
      }
      setSites(json.data.sites);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const count = (status) => sites.filter((s) => s.status === status).length;

  const stats = [
    { label: "Total Sites", value: sites.length, color: "text-slate-900" },
    { label: "Active", value: count("active"), color: "text-emerald-600" },
    { label: "Under Maintenance", value: count("maintenance"), color: "text-amber-500" },
    { label: "Inactive", value: count("inactive"), color: "text-red-500" },
  ];

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Site & Equipment Management
        </h1>
        <p className="mt-1 text-slate-500">
          Manage sites, track equipment and monitor maintenance.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        {/* Sidebar */}
        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-2 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Site Management
          </p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2.5 transition ${
                    isActive ? "bg-blue-50" : "hover:bg-slate-50"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <p className={`text-sm ${isActive ? "text-blue-600" : "text-slate-900"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className={`mt-2 text-3xl font-bold ${s.color}`}>
                  {loading ? "–" : s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {error ? (
              <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <span>{error}</span>
                <button
                  onClick={fetchSites}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <p className="text-sm text-slate-500">Loading sites…</p>
            ) : (
              <Outlet context={{ sites, refreshSites: fetchSites }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}