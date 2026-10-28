const styles = {
  Operational: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "Under Maintenance": "bg-amber-50 text-amber-700 ring-amber-600/20",
  Faulty: "bg-red-50 text-red-700 ring-red-600/20",
  Scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Critical: "bg-red-100 text-red-800 ring-red-600/30",
  High: "bg-orange-50 text-orange-700 ring-orange-600/20",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Low: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export default function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/20"
      }`}
    >
      {value}
    </span>
  );
}