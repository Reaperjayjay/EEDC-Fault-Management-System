import { NavLink, Outlet } from "react-router-dom";
import { faultNav } from "./faultNav";

export default function FaultManagementLayout() {
  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-xl font-medium md:text-2xl">Fault Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Track, assign and resolve distribution network faults
        </p>
      </div>

      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        {/* Secondary sidebar (vertical on md+, scrollable tabs on phones) */}
        <nav
          aria-label="Fault management"
          className="md:sticky md:top-[71px] md:w-56 md:shrink-0 md:rounded-2xl md:border md:border-gray-200 md:bg-white md:p-3"
        >
          <p className="hidden px-2 pb-2 pt-1 text-[10px] uppercase tracking-wide text-gray-500 md:block">
            Fault Management
          </p>

          <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
            {faultNav.map((item) => (
              <li key={item.to} className="shrink-0 md:shrink">
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "bg-white text-gray-800 hover:bg-gray-100 max-md:border max-md:border-gray-200"
                    }`
                  }
                >
                  <span className="block text-[13px] leading-snug">{item.label}</span>
                  <span className="hidden text-[11px] leading-snug text-gray-400 md:block">
                    {item.desc}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Selected page renders here */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}