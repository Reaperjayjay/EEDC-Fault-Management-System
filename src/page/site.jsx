import { useState } from "react";
import {
  Menu,
  Smartphone,
  Monitor,
  RefreshCw,
  Server,
  Database,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wifi,
} from "lucide-react";

import Sidebar from "../components/sideBar.jsx";

/* ---------- Static data (replace with API data) ---------- */

const statusCards = [
  { label: "Server Status", value: "Operational", icon: Server, iconBg: "bg-green-50", iconColor: "text-green-500", indicator: { type: "dot", color: "bg-green-500" } },
  { label: "Database", value: "Connected", icon: Database, iconBg: "bg-green-50", iconColor: "text-green-500", indicator: { type: "dot", color: "bg-green-500" } },
  { label: "Active Users", value: "Online Now", icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-500", indicator: { type: "number", text: "87", color: "text-blue-600" } },
  { label: "Pending Syncs", value: "Queued", icon: RefreshCw, iconBg: "bg-orange-50", iconColor: "text-orange-500", indicator: { type: "number", text: "12", color: "text-orange-500" } },
];

const syncOperations = [
  { title: "DPR Sync Completed", subtitle: "Engineer - MainPower Site", status: "Success", time: "2 min ago", variant: "success" },
  { title: "Attendance Data Synced", subtitle: "45 attendance records synchronized", status: "Success", time: "15 min ago", variant: "success" },
  { title: "Material Request Syncing", subtitle: "Material request is being processed", status: "In Progress", time: "Just now", variant: "progress" },
  { title: "Photo Upload Failed", subtitle: "DPR images could not upload (Network timeout)", status: "Failed", time: "30 min ago", variant: "failed" },
  { title: "Attendance Pending", subtitle: "Waiting for GPS verification", status: "Pending", time: "1 hour ago", variant: "pending" },
];

const systemAlerts = [
  { title: "High Pending Sync Queue", message: "12 items are waiting to sync. Check the server and network connection.", time: "30 minutes ago", variant: "warning" },
  { title: "Offline Users Detected", message: "5 users have been offline for more than 2 hours.", time: "1 hour ago", variant: "caution" },
];

const storage = [
  { label: "Database", used: 45.2, total: 100, color: "bg-blue-600" },
  { label: "Media Files", used: 78.6, total: 200, color: "bg-orange-600" },
  { label: "Backups", used: 12.3, total: 50, color: "bg-green-600" },
];

/* ---------- Style maps ---------- */

const syncStyles = {
  success: { card: "bg-green-50 border-green-200", iconWrap: "bg-green-100 text-green-600", icon: CheckCircle2, status: "text-green-700", time: "text-green-600" },
  progress: { card: "bg-blue-50 border-blue-200", iconWrap: "bg-blue-100 text-blue-600", icon: RefreshCw, status: "text-blue-700", time: "text-blue-500" },
  failed: { card: "bg-red-50 border-red-200", iconWrap: "bg-red-100 text-red-600", icon: XCircle, status: "text-red-700", time: "text-red-500" },
  // design shows the pending time in red
  pending: { card: "bg-orange-50 border-orange-200", iconWrap: "bg-orange-100 text-orange-600", icon: Clock, status: "text-orange-700", time: "text-red-500" },
};

const alertStyles = {
  warning: { card: "bg-orange-50 border-orange-200", icon: "text-orange-600" },
  caution: { card: "bg-yellow-50 border-yellow-200", icon: "text-yellow-600" },
};

/* ---------- Reusable components ---------- */

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      {title && <h3 className="mb-4 text-sm text-gray-900">{title}</h3>}
      {children}
    </section>
  );
}

function StatusCard({ card }) {
  const Icon = card.icon;
  const { indicator } = card;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
          <Icon className={`h-5 w-5 ${card.iconColor}`} />
        </div>
        {indicator.type === "dot" ? (
          <span className={`mt-1 h-2 w-2 rounded-full ${indicator.color}`} />
        ) : (
          <span className={`text-sm ${indicator.color}`}>{indicator.text}</span>
        )}
      </div>
      <p className="text-xs text-gray-500">{card.label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{card.value}</p>
    </div>
  );
}

function SyncItem({ item }) {
  const s = syncStyles[item.variant];
  const Icon = s.icon;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${s.card}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.iconWrap}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-900">{item.title}</p>
          <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-xs ${s.status}`}>{item.status}</p>
        <p className={`text-[11px] ${s.time}`}>{item.time}</p>
      </div>
    </div>
  );
}

function AlertItem({ alert }) {
  const s = alertStyles[alert.variant];
  return (
    <div className={`rounded-xl border px-4 py-3 ${s.card}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
        <div>
          <p className="text-sm text-gray-900">{alert.title}</p>
          <p className="mt-0.5 text-xs text-gray-600">{alert.message}</p>
          <p className="mt-2 text-[11px] text-gray-400">{alert.time}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ item }) {
  const pct = Math.min(100, (item.used / item.total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-gray-500">
        <span>{item.label}</span>
        <span className="text-gray-700">{item.used} / {item.total} GB</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, valueClass = "text-gray-900", icon }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-2 text-gray-500">{icon}{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

/* ---------- Page ---------- */

export default function SystemStatus() {
  const [view, setView] = useState("admin");
  const [refreshing, setRefreshing] = useState(false);
  // Open by default on md+ screens (matches the design), closed on phones
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800); // replace with API call
  };

  const tab = (name) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      view === name ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ---------- Header (sticky, ~51px like the design) ---------- */}
      <header className="sticky top-0 z-30 flex h-[51px] items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="shrink-0 rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={isSidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-base font-medium md:text-xl">
            MainPower Site Fault Management System
          </h1>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setView("mobile")} className={tab("mobile")}>
            <Smartphone className="h-4 w-4" />
            <span className="hidden md:inline">Mobile App</span>
          </button>
          <button type="button" onClick={() => setView("admin")} className={tab("admin")}>
            <Monitor className="h-4 w-4" />
            <span className="hidden md:inline">Admin Dashboard</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 top-[51px] z-20 bg-black/40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        {/* ---------- Sidebar: in the layout on md+, drawer on phones ---------- */}
        <aside
          id="admin-sidebar"
          className={`fixed bottom-0 left-0 top-[51px] z-20 w-[195px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white transition-transform duration-200 md:sticky md:h-[calc(100vh-51px)] ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
          }`}
        >
          <Sidebar onNavigate={closeSidebarOnMobile} />
        </aside>

        {/* ---------- Main ---------- */}
        <main className="min-w-0 flex-1 bg-gray-100 p-4 md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium md:text-2xl">System Status &amp; Notifications</h2>
              <p className="mt-1 text-sm text-gray-500">
                Monitor system health and synchronization operations
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh Status"}</span>
            </button>
          </div>

          {/* 4 cards across from md (was xl) */}
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {statusCards.map((c) => (
              <StatusCard key={c.label} card={c} />
            ))}
          </div>

          {/* Two columns from md (was lg), right column ~207px like the design */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_207px]">
            <div className="min-w-0 space-y-5">
              <Card title="Recent Sync Operations">
                <div className="space-y-2.5">
                  {syncOperations.map((i) => <SyncItem key={i.title} item={i} />)}
                </div>
              </Card>

              <Card title="System Alerts">
                <div className="space-y-3">
                  {systemAlerts.map((a) => <AlertItem key={a.title} alert={a} />)}
                </div>
              </Card>
            </div>

            <div className="min-w-0 space-y-5">
              <Card title="Network Status">
                <div className="space-y-3">
                  <MetricRow
                    label="Connectivity"
                    value="Excellent"
                    valueClass="text-green-600"
                    icon={<Wifi className="h-3.5 w-3.5 text-green-500" />}
                  />
                  <MetricRow label="Latency" value="45ms" />
                  <MetricRow label="Throughput" value="12.5 MB/s" />
                </div>
              </Card>

              <Card title="Storage Usage">
                <div className="space-y-4">
                  {storage.map((s) => <ProgressRow key={s.label} item={s} />)}
                </div>
              </Card>

              <Card title="System Performance">
                <div className="space-y-3">
                  <MetricRow label="CPU Usage" value="23%" valueClass="text-green-600" />
                  <MetricRow label="Memory" value="68%" valueClass="text-red-500" />
                  <MetricRow label="Uptime" value="15 days" />
                </div>
              </Card>

              <Card title="Quick Actions">
                <div className="space-y-2">
                  <button type="button" className="w-full rounded-lg bg-blue-50 py-2.5 text-xs text-blue-600 transition hover:bg-blue-100">
                    Force Sync All
                  </button>
                  <button type="button" className="w-full rounded-lg bg-gray-100 py-2.5 text-xs text-gray-700 transition hover:bg-gray-200">
                    Clear Cache
                  </button>
                  <button type="button" className="w-full rounded-lg bg-gray-100 py-2.5 text-xs text-gray-700 transition hover:bg-gray-200">
                    View Logs
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}