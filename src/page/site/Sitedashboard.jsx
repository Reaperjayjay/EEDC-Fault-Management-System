import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Zap,
  Activity,
  Wrench,
  AlertTriangle,
  History,
  ArrowRight,
} from "lucide-react";

// Swap `href` for your router's <Link to=...> if you use react-router / Next.js
const sections = [
  {
    title: "All Sites",
    description: "Register, search and manage sites",
    href: "/sites",
    icon: MapPin,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Equipment Inventory",
    description: "Transformers, feeders, breakers and other assets",
    href: "/equipment",
    icon: Zap,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Equipment Status",
    description: "Monitor operational condition",
    href: "/equipment-status",
    icon: Activity,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Maintenance Records",
    description: "Service history and scheduled maintenance",
    href: "/maintenance",
    icon: Wrench,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Faulty Equipment",
    description: "Equipment requiring inspection or repair",
    href: "/faulty-equipment",
    icon: AlertTriangle,
    color: "bg-red-50 text-red-600",
  },
  {
    title: "Site & Equipment History",
    description: "Previous faults, repairs and changes",
    href: "/history",
    icon: History,
    color: "bg-slate-100 text-slate-600",
  },
];

// Replace with real data from your API
const stats = [
  { label: "Total Sites", value: 48, dot: "bg-slate-400" },
  { label: "Operational", value: 41, dot: "bg-emerald-500" },
  { label: "Under Maintenance", value: 20, dot: "bg-amber-500" },
  { label: "Faulty", value: 2, dot: "bg-red-500" },
];

export default function SiteDashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Site & Equipment Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage sites, track equipment and monitor maintenance.
          </p>
        </header>

        {/* Site Overview */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Site Overview
              </h2>
              <p className="text-sm text-slate-500">
                Summary of sites and their status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.label}
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ title, description, href, icon: Icon, color }) => (
            <Link
              key={title}
              to={href}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div>
                <div
                  className={`mb-4 inline-flex rounded-lg p-3 ${color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
              <div className="mt-5 flex items-center text-sm font-medium text-blue-600">
                Open
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}