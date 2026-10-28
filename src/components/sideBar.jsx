
import { NavLink } from "react-router-dom";
import { FAULT_BASE } from "../page/fault/faultNav";

const navItemsByRole = {
  admin: [
    { label: "Dashboard Overview", to: "/dashboard" },
    { label: "Fault Management", to: FAULT_BASE, end: false },
    { label: "GIS & Live Tracking", to: "/gps" },
    { label: "AIAuto-Assignment", to: "/ai-auto-assignment" },
    { label: "Engineer Ranking", to: "/engineerranking" },
    { label: "Engineer Performance", to: "/Engineerperformance" },
    { label: "Engineer Management", to: "/Engineermanagement" },
    { label: "Assignment Monitoring", to: "/assignments" },
    { label: "Performance Review", to: "/Createperformancereview" },
    { label: "Sites & Equipment", to: "/site-management" },
  ],

  operator: [
    { label: "Dashboard Overview", to: "/dashboard" },
    { label: "Fault Management", to: FAULT_BASE, end: false },
    { label: "GIS & Live Tracking", to: "/gps" },
    { label: "AIAuto-Assignment", to: "/ai-auto-assignment" },
    { label: "Engineer Ranking", to: "/engineerranking" },
    { label: "Engineer Performance", to: "/Engineerperformance" },
    { label: "Engineer Management", to: "/Engineermanagement" },
    { label: "Assignment Monitoring", to: "/assignments" },
    { label: "Performance Review", to: "/Createperformancereview" },
    { label: "Sites & Equipment", to: "/site-management" },
  ],

  engineer: [
    { label: "Engineer Dashboard", to: "/engineer/dashboard" },
    { label: "My Assignments", to: "/my-assignments" },
    { label: "GPS & Navigation", to: "/gps-navigation" },
    { label: "Update Fault Status", to: "/fault-status" },
    { label: "My Performance", to: "/my-performance" },
    { label: "My Profile", to: "/my-profile" },
    { label: "Update My Profile", to: "/update-my-profile" },
  ],

  user: [
    { label: "User Dashboard", to: "/user/dashboard" },
    { label: "Report a Fault", to: "/report-fault" },
    { label: "My Fault Reports", to: "/my-fault-reports" },
    { label: "Track My Fault", to: "/myfault" },
    { label: "Help & Support", to: "/customersupport" },
  ],
};

export default function Sidebar({ onNavigate }) {
  const role = (
    sessionStorage.getItem("role") ||
    localStorage.getItem("role") ||
    ""
  ).toLowerCase();

  const navItems = navItemsByRole[role] || [];

  const heading =
    role === "admin" || role === "operator"
      ? "Admin Screens"
      : role === "engineer"
        ? "Engineer Screens"
        : role === "user"
          ? "Customer Screens"
          : "Menu";

  return (
    <nav
      aria-label={heading}
      className="h-full w-48 overflow-y-auto border-r border-gray-200 bg-white p-2"
    >
      <p className="px-2 pb-3 pt-1 text-[10px] uppercase tracking-wide text-gray-500">
        {heading}
      </p>

      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end ?? true}
              onClick={onNavigate}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-[13px] leading-snug transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-800 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
