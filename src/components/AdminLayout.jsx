import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Smartphone, Monitor } from "lucide-react";
import Sidebar from "./sideBar.jsx";

// Shared shell: header + main sidebar. Child routes render in <Outlet />.
export default function AdminLayout() {
  const [view, setView] = useState("admin");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const tab = (name) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      view === name ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
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
        {isSidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 top-[51px] z-20 bg-black/40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        )}

        <aside
          id="admin-sidebar"
          className={`fixed bottom-0 left-0 top-[51px] z-20 w-[195px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white transition-transform duration-200 md:sticky md:h-[calc(100vh-51px)] ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
          }`}
        >
          <Sidebar onNavigate={closeSidebarOnMobile} />
        </aside>

        <main className="min-w-0 flex-1 bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}