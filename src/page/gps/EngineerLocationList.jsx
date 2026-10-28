import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getStatusStyle } from "./gpsStyles";

const formatStatus = (status) =>
  String(status ?? "offline").replace(/[\s-]+/g, "_").replace(/_/g, " ");

export default function EngineerLocationList({
  engineers = [],
  selectedId,
  onSelect,
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return engineers;
    return engineers.filter((e) =>
      [e.name, e.currentLocation, e.assignedFault].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [engineers, query]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 md:self-start">
      <h3 className="mb-3 text-sm text-gray-900">Engineers ({rows.length})</h3>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or location..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
        />
      </div>

      <div className="max-h-[28rem] space-y-2 overflow-y-auto">
        {rows.map((e) => {
          const style = getStatusStyle(e.status);
          const selected = e.id === selectedId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect?.(e.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-gray-900">{e.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize ${style.badge}`}
                >
                  {formatStatus(e.status)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {e.currentLocation ?? "Location unavailable"}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                {e.lastUpdate ? `Updated ${e.lastUpdate}` : "No recent update"}
              </p>
            </button>
          );
        })}

        {rows.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400">
            {engineers.length === 0
              ? "No engineers yet."
              : "No engineers match your search."}
          </p>
        )}
      </div>
    </section>
  );
}