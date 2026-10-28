import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  Wrench,
  UserX,
  Search,
  RefreshCw,
  UserCog,
  X,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Star,
  CheckCircle2,
  ShieldCheck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

import { apiRequest } from "../services/api";

/* -------------------- CONFIG -------------------- */

// Real backend endpoints (relative to your API base, e.g. /api/v1).
const ENDPOINTS = {
  list: "/engineer-management",
  details: (id) => `/engineer-management/${id}`,
  update: (id) => `/engineer-management/${id}`,
  active: (id) => `/engineer-management/${id}/active`,
  changeRole: (userId) => `/users/${userId}/role`,
};

const SPECIALIZATIONS = ["substation", "feeder", "transformer", "distribution", "general"];

// "admin" is deliberately not offered here: it is too powerful for a dropdown.
const ROLE_OPTIONS = [
  { value: "user", label: "Customer (user)" },
  { value: "engineer", label: "Engineer" },
  { value: "operator", label: "Operator" },
];

const ROLE_LABELS = {
  user: "Customer",
  engineer: "Engineer",
  operator: "Operator",
  admin: "Admin",
};

const AVAILABILITY_LABELS = {
  available: "Available",
  busy: "On assignment",
  offline: "Offline",
  inactive: "Inactive",
};

const AVAILABILITY_STYLES = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  busy: "bg-blue-50 text-blue-700 ring-blue-600/20",
  offline: "bg-slate-100 text-slate-600 ring-slate-500/20",
  inactive: "bg-red-50 text-red-700 ring-red-600/20",
};

const PAGE_SIZE = 10;

const card = "rounded-2xl border border-slate-200 bg-white p-6";
const h2 = "text-base font-medium text-slate-900";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500";
const fieldError =
  "w-full rounded-xl border border-red-400 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const btnDanger = `${btnBase} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/20`;
const pill =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

/* -------------------- HELPERS -------------------- */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function readable(value) {
  return capitalize(String(value || "").replace(/_/g, " "));
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

const engineerCode = (id) => `ENG-${String(id).padStart(3, "0")}`;
const faultCode = (id) => `FLT-${String(id).padStart(3, "0")}`;

function safetyLabel(average) {
  if (average === null) return null;
  if (average >= 4.5) return "Excellent";
  if (average >= 3.5) return "Good";
  return "Needs review";
}

// Converts one engineer from the API into what this page shows.
function mapEngineer(row) {
  const accountActive = Number(row.active) === 1;

  return {
    id: row.id,
    userId: row.user_id,
    code: engineerCode(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    specializationKey: row.specialization,
    specialization: capitalize(row.specialization),
    experienceYears: num(row.experience_years),
    accountStatus: accountActive ? "active" : "inactive",
    availability: accountActive ? row.availability : "inactive",
    performanceScore: num(row.performance_rating),
    completedJobs: num(row.completed_jobs),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    lastUpdated: row.last_updated,
    safety: safetyLabel(numberOrNull(row.avg_safety)),
    activeAssignments: num(row.active_assignments),
  };
}

function mapAssignment(row) {
  return {
    id: row.id,
    faultCode: faultCode(row.fault_id),
    site: row.site_name,
    status: readable(row.status),
    date: row.assigned_at,
  };
}

function summarise(list) {
  return {
    total: list.length,
    available: list.filter((e) => e.availability === "available").length,
    onAssignment: list.filter((e) => e.availability === "busy").length,
    inactive: list.filter((e) => e.availability === "inactive").length,
  };
}

/* -------------------- SMALL COMPONENTS -------------------- */

function CardTitle({ icon: Icon, tone, children, right }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h2 className={h2}>{children}</h2>
      </div>
      {right}
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <div className="mt-1 text-3xl text-slate-900">{children}</div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function AssignmentList({ title, items, empty }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-slate-700">{item.faultCode}</p>
                <span className={`${pill} bg-slate-100 text-slate-600 ring-slate-500/20`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.site}</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(item.date)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------- MAIN PAGE -------------------- */

export default function EngineerManagement() {
  const [engineers, setEngineers] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);

  // Change-role dialog: { user: object | null, role: string }
  const [roleDialog, setRoleDialog] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [roleMessage, setRoleMessage] = useState("");
  const [changingRole, setChangingRole] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState(null); // engineer being edited
  const [form, setForm] = useState({ specialization: "general", experienceYears: "", phone: "" });
  const [formErrors, setFormErrors] = useState({});
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Profile panel
  const [profile, setProfile] = useState(null); // { engineer, tab }
  const [assignments, setAssignments] = useState({ current: [], past: [] });
  const [profileLoading, setProfileLoading] = useState(false);

  const [confirm, setConfirm] = useState(null); // engineer to activate / deactivate
  const [toggling, setToggling] = useState(false);

  /* Load the engineers and the list of users. */
  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await apiRequest(ENDPOINTS.list);
      const data = response.data || {};

      setEngineers(Array.isArray(data.engineers) ? data.engineers.map(mapEngineer) : []);
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || "Unable to load engineers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarise(engineers), [engineers]);

  /* Filters */
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = engineers.filter((e) => {
      if (
        term &&
        !String(e.name).toLowerCase().includes(term) &&
        !String(e.code).toLowerCase().includes(term) &&
        !String(e.email).toLowerCase().includes(term) &&
        !String(e.phone).replace(/\s/g, "").includes(term.replace(/\s/g, ""))
      ) {
        return false;
      }
      if (specialization !== "all" && e.specializationKey !== specialization) return false;
      if (availability !== "all" && e.availability !== availability) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "experience") return b.experienceYears - a.experienceYears;
      if (sortBy === "performance") return b.performanceScore - a.performanceScore;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [engineers, search, specialization, availability, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  /* ---------- Change role ---------- */

  function openRoleDialog(user = null, role = "engineer") {
    setRoleDialog({ user, role });
    setUserSearch("");
    setRoleMessage("");
    setProfile(null);
  }

  // Opens the dialog for an existing engineer (default: back to a customer).
  function openRoleForEngineer(engineer) {
    openRoleDialog(
      {
        id: engineer.userId,
        name: engineer.name,
        email: engineer.email,
        role: "engineer",
        active: engineer.accountStatus === "active" ? 1 : 0,
      },
      "user"
    );
  }

  const matchingUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users.slice(0, 8);

    return users
      .filter(
        (user) =>
          String(user.name).toLowerCase().includes(term) ||
          String(user.email).toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [users, userSearch]);

  // Why the role cannot be changed right now (empty text means it can).
  function roleProblem() {
    if (!roleDialog?.user) return "Choose a user first.";

    const { user, role } = roleDialog;

    if (user.role === "admin") return "Admin roles cannot be changed from this page.";
    if (user.role === role) return `This user is already ${ROLE_LABELS[role] || role}.`;

    const engineer = engineers.find((e) => e.userId === user.id);
    if (user.role === "engineer" && engineer && engineer.activeAssignments > 0) {
      return "This engineer still has an active assignment. Wait until it is finished or cancelled.";
    }

    return "";
  }

  function roleHint() {
    const role = roleDialog?.role;
    if (role === "engineer") {
      return "They will get an engineer profile, appear in this list, and can be assigned faults once they set themselves available.";
    }
    if (role === "user") {
      return "They will lose engineer access and no longer be suggested for faults. Their past assignments and reviews are kept.";
    }
    return "They will get operator access to the admin pages.";
  }

  async function submitRole(event) {
    event.preventDefault();

    const problem = roleProblem();
    if (problem) {
      setRoleMessage(problem);
      return;
    }

    const { user, role } = roleDialog;

    try {
      setChangingRole(true);
      setRoleMessage("");

      await apiRequest(ENDPOINTS.changeRole(user.id), {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });

      setRoleDialog(null);
      setNotice({
        type: "success",
        text: `${user.name} is now ${ROLE_LABELS[role] || role}.`,
      });
      await load(true);
    } catch (err) {
      setRoleMessage(err.message || "Unable to change this role.");
    } finally {
      setChangingRole(false);
    }
  }

  /* ---------- Edit details ---------- */

  function openEdit(engineer) {
    setEditing(engineer);
    setForm({
      specialization: engineer.specializationKey,
      experienceYears: String(engineer.experienceYears),
      phone: engineer.phone,
    });
    setFormErrors({});
    setFormMessage("");
    setProfile(null);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submitEdit(event) {
    event.preventDefault();

    const errors = {};
    const years = Number(form.experienceYears);

    if (!SPECIALIZATIONS.includes(form.specialization)) {
      errors.specialization = "Choose a specialization.";
    }
    if (form.experienceYears === "" || !Number.isInteger(years) || years < 0 || years > 60) {
      errors.experienceYears = "Enter a whole number from 0 to 60.";
    }
    if (form.phone.trim() && /[^\d\s()+-]/.test(form.phone)) {
      errors.phone = "Enter a valid phone number.";
    }

    setFormErrors(errors);
    setFormMessage("");
    if (Object.keys(errors).length > 0) return;

    try {
      setSaving(true);

      await apiRequest(ENDPOINTS.update(editing.id), {
        method: "PATCH",
        body: JSON.stringify({
          specialization: form.specialization,
          experienceYears: years,
          phone: form.phone.trim(),
        }),
      });

      setEditing(null);
      setNotice({ type: "success", text: `${editing.name} was updated.` });
      await load(true);
    } catch (err) {
      setFormMessage(err.message || "Unable to save these details.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Profile panel ---------- */

  async function openProfile(engineer, tab = "profile") {
    setProfile({ engineer, tab });
    setAssignments({ current: [], past: [] });

    try {
      setProfileLoading(true);
      const response = await apiRequest(ENDPOINTS.details(engineer.id));
      const data = response.data || {};

      setAssignments({
        current: (data.currentAssignments || []).map(mapAssignment),
        past: (data.pastAssignments || []).map(mapAssignment),
      });
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Unable to load the assignments." });
    } finally {
      setProfileLoading(false);
    }
  }

  /* ---------- Activate / deactivate ---------- */

  async function toggleStatus() {
    if (!confirm) return;

    const activate = confirm.accountStatus === "inactive";

    try {
      setToggling(true);

      await apiRequest(ENDPOINTS.active(confirm.id), {
        method: "PATCH",
        body: JSON.stringify({ active: activate }),
      });

      setNotice({
        type: "success",
        text: `${confirm.name} was ${activate ? "activated" : "deactivated"}.`,
      });
      setConfirm(null);
      await load(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Unable to change the status." });
      setConfirm(null);
    } finally {
      setToggling(false);
    }
  }

  const active = profile
    ? engineers.find((e) => e.id === profile.engineer.id) || profile.engineer
    : null;

  const problem = roleDialog ? roleProblem() : "";

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium text-slate-900">Engineer Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Change user roles, manage engineer details and monitor availability.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading || refreshing}
              className={btnOutline}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={() => openRoleDialog()} className={btnPrimary}>
              <UserCog className="h-4 w-4" />
              Change role
            </button>
          </div>
        </div>

        {loading && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading engineers...
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Something went wrong.</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={() => load()} className="mt-3 underline">
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div
            className={`mb-4 flex items-start justify-between gap-3 rounded-xl border p-4 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} tone="bg-blue-50 text-blue-600" label="Total engineers" sub="Users with the engineer role">
            {summary.total}
          </StatCard>
          <StatCard icon={UserCheck} tone="bg-emerald-50 text-emerald-600" label="Available" sub="Ready for assignment">
            {summary.available}
          </StatCard>
          <StatCard icon={Wrench} tone="bg-violet-50 text-violet-600" label="On assignment" sub="Currently on a job">
            {summary.onAssignment}
          </StatCard>
          <StatCard icon={UserX} tone="bg-slate-100 text-slate-600" label="Inactive" sub="Cannot receive assignments">
            {summary.inactive}
          </StatCard>
        </div>

        {/* Search and filters */}
        <section className={`${card} mb-6`}>
          <CardTitle icon={Search} tone="bg-blue-50 text-blue-600">
            Search and filters
          </CardTitle>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <Field label="Search by name, ID, email or phone number">
                <input
                  type="search"
                  className={field}
                  placeholder="e.g. kelechi, ENG-001 or 0801"
                  value={search}
                  onChange={resetPage(setSearch)}
                />
              </Field>
            </div>

            <Field label="Specialization">
              <select className={field} value={specialization} onChange={resetPage(setSpecialization)}>
                <option value="all">All specializations</option>
                {SPECIALIZATIONS.map((item) => (
                  <option key={item} value={item}>{capitalize(item)}</option>
                ))}
              </select>
            </Field>

            <Field label="Availability">
              <select className={field} value={availability} onChange={resetPage(setAvailability)}>
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">On assignment</option>
                <option value="offline">Offline</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 max-w-xs">
            <Field label="Sort by">
              <select className={field} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="name">Name</option>
                <option value="experience">Experience (most first)</option>
                <option value="performance">Performance score (highest first)</option>
              </select>
            </Field>
          </div>
        </section>

        {/* All engineers table */}
        <section className={card}>
          <CardTitle
            icon={Users}
            tone="bg-violet-50 text-violet-600"
            right={
              <span className="text-xs text-slate-400">
                {visible.length} engineer{visible.length === 1 ? "" : "s"}
              </span>
            }
          >
            All engineers
          </CardTitle>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              {engineers.length === 0
                ? "No engineers yet. Use Change role to turn a user into an engineer."
                : "No engineers match your search and filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-3 font-medium">Engineer ID</th>
                    <th className="py-2 pr-3 font-medium">Engineer</th>
                    <th className="py-2 pr-3 font-medium">Specialization</th>
                    <th className="py-2 pr-3 font-medium">Phone</th>
                    <th className="py-2 pr-3 font-medium">Availability</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-3 font-mono text-xs text-slate-700">{e.code}</td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-900">{e.name}</p>
                        <p className="text-xs text-slate-400">{e.email}</p>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {e.specialization}
                        <p className="text-xs text-slate-400">{e.experienceYears} yrs</p>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{e.phone || "Not provided"}</td>
                      <td className="py-3 pr-3">
                        <span className={`${pill} ${AVAILABILITY_STYLES[e.availability] || AVAILABILITY_STYLES.offline}`}>
                          {AVAILABILITY_LABELS[e.availability] || e.availability}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" className={btnOutline} onClick={() => openProfile(e)}>
                            View
                          </button>
                          <button type="button" className={btnOutline} onClick={() => openProfile(e, "assignments")}>
                            Assignments
                          </button>
                          <button type="button" className={btnOutline} onClick={() => openEdit(e)}>
                            Edit
                          </button>
                          <button type="button" className={btnOutline} onClick={() => openRoleForEngineer(e)}>
                            Change role
                          </button>
                          <button type="button" className={btnOutline} onClick={() => setConfirm(e)}>
                            {e.accountStatus === "inactive" ? "Activate" : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button type="button" className={btnOutline} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" className={btnOutline} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Change role dialog */}
      {roleDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
          <form onSubmit={submitRole} noValidate className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <h2 className="text-lg font-medium text-slate-900">Change user role</h2>
              <button type="button" onClick={() => setRoleDialog(null)} aria-label="Close dialog" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {roleMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {roleMessage}
                </div>
              )}

              {roleDialog.user ? (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{roleDialog.user.name}</p>
                    <p className="text-xs text-slate-500">{roleDialog.user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Current role:{" "}
                      <span className="font-medium text-slate-700">
                        {ROLE_LABELS[roleDialog.user.role] || roleDialog.user.role}
                      </span>
                    </p>
                  </div>
                  {!engineers.some((e) => e.userId === roleDialog.user.id) && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline"
                      onClick={() => setRoleDialog({ ...roleDialog, user: null })}
                    >
                      Choose another
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <Field label="Find a user by name or email">
                    <input
                      type="search"
                      className={field}
                      placeholder="e.g. Mary or user2@mainpower.com"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                  </Field>

                  {matchingUsers.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No users match your search.</p>
                  ) : (
                    <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                      {matchingUsers.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => setRoleDialog({ ...roleDialog, user })}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                          >
                            <span>
                              <span className="block text-sm font-medium text-slate-900">{user.name}</span>
                              <span className="block text-xs text-slate-500">{user.email}</span>
                            </span>
                            <span className={`${pill} bg-slate-100 text-slate-600 ring-slate-500/20`}>
                              {ROLE_LABELS[user.role] || user.role}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {roleDialog.user && (
                <Field label="New role" hint={roleHint()}>
                  <select
                    className={field}
                    value={roleDialog.role}
                    onChange={(event) => {
                      setRoleDialog({ ...roleDialog, role: event.target.value });
                      setRoleMessage("");
                    }}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              )}

              {roleDialog.user && problem && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {problem}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button type="button" onClick={() => setRoleDialog(null)} className={btnOutline}>
                Cancel
              </button>
              <button type="submit" disabled={changingRole || !!problem} className={btnPrimary}>
                {changingRole ? "Saving..." : "Change role"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit details dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
          <form onSubmit={submitEdit} noValidate className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <h2 className="text-lg font-medium text-slate-900">Edit {editing.name}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close form" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {formMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formMessage}
                </div>
              )}

              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Name and email belong to the user account and are not edited
                here ({editing.name}, {editing.email}).
              </p>

              <Field label="Specialization" error={formErrors.specialization}>
                <select
                  className={formErrors.specialization ? fieldError : field}
                  value={form.specialization}
                  onChange={(event) => updateForm("specialization", event.target.value)}
                >
                  {SPECIALIZATIONS.map((item) => (
                    <option key={item} value={item}>{capitalize(item)}</option>
                  ))}
                </select>
              </Field>

              <Field label="Years of experience" error={formErrors.experienceYears}>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className={formErrors.experienceYears ? fieldError : field}
                  value={form.experienceYears}
                  onChange={(event) => updateForm("experienceYears", event.target.value)}
                />
              </Field>

              <Field label="Phone number" error={formErrors.phone}>
                <input
                  type="tel"
                  className={formErrors.phone ? fieldError : field}
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button type="button" onClick={() => setEditing(null)} className={btnOutline}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile panel */}
      {active && (
        <>
          <button type="button" aria-label="Close panel" onClick={() => setProfile(null)} className="fixed inset-0 z-40 bg-slate-900/40" />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <p className="text-lg font-medium text-slate-900">{active.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{active.code}</span>
                  <span className={`${pill} ${AVAILABILITY_STYLES[active.availability] || AVAILABILITY_STYLES.offline}`}>
                    {AVAILABILITY_LABELS[active.availability] || active.availability}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setProfile(null)} aria-label="Close panel" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 px-5 py-3">
              {[
                ["profile", "Profile"],
                ["assignments", "Assignments"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setProfile({ engineer: active, tab })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    profile.tab === tab ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {profile.tab === "profile" ? (
                <>
                  <div className="space-y-4">
                    <InfoRow icon={Mail} label="Email">{active.email}</InfoRow>
                    <InfoRow icon={Phone} label="Phone">{active.phone || "Not provided"}</InfoRow>
                    <InfoRow icon={Briefcase} label="Specialization and experience">
                      {active.specialization} · {active.experienceYears} yrs
                    </InfoRow>
                    <InfoRow icon={MapPin} label="Last known location">
                      {active.latitude !== null && active.longitude !== null ? (
                        <>
                          {active.latitude.toFixed(5)}, {active.longitude.toFixed(5)}
                          <span className="block text-xs text-slate-400">
                            Record updated {formatDateTime(active.lastUpdated)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500">Location sharing is not enabled.</span>
                      )}
                    </InfoRow>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <CheckCircle2 className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Completed jobs</p>
                      <p className="text-lg font-medium text-slate-900">{active.completedJobs}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Star className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Performance score</p>
                      <p className="text-lg font-medium text-slate-900">
                        {active.performanceScore > 0 ? `${active.performanceScore.toFixed(1)}/5` : "No reviews"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <ClipboardList className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Active assignments</p>
                      <p className="text-lg font-medium text-slate-900">{active.activeAssignments}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
                      <p className="mt-2 text-xs text-slate-500">Safety compliance</p>
                      <p className="text-lg font-medium text-slate-900">{active.safety || "No reviews"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {profileLoading && <p className="text-sm text-slate-500">Loading assignments...</p>}
                  <AssignmentList
                    title="Current assignments"
                    items={assignments.current}
                    empty="No current assignments."
                  />
                  <AssignmentList
                    title="Previous assignments"
                    items={assignments.past}
                    empty="No previous assignments."
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-5">
              <button type="button" className={`${btnOutline} flex-1`} onClick={() => openEdit(active)}>
                Edit details
              </button>
              <button type="button" className={`${btnOutline} flex-1`} onClick={() => openRoleForEngineer(active)}>
                Change role
              </button>
              <button type="button" className={`${btnOutline} flex-1`} onClick={() => setConfirm(active)}>
                {active.accountStatus === "inactive" ? "Activate" : "Deactivate"}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Activate / deactivate confirmation */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h2 className="text-base font-medium text-slate-900">
                  {confirm.accountStatus === "inactive" ? "Activate" : "Deactivate"} {confirm.name}?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {confirm.accountStatus === "inactive"
                    ? "This engineer will be able to log in and receive new assignments again."
                    : "This engineer will no longer receive new assignments and will be set to offline."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={btnOutline} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={confirm.accountStatus === "inactive" ? btnPrimary : btnDanger}
                disabled={toggling}
                onClick={toggleStatus}
              >
                {toggling
                  ? "Saving..."
                  : confirm.accountStatus === "inactive"
                  ? "Activate"
                  : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}