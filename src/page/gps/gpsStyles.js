export const statusStyles = {
  available: {
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700",
    text: "text-green-700",
  },
  active: {
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-700",
  },
  assigned: {
    dot: "bg-purple-500",
    badge: "bg-purple-100 text-purple-700",
    text: "text-purple-700",
  },
  en_route: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-700",
  },
  arrived: {
    dot: "bg-teal-500",
    badge: "bg-teal-100 text-teal-700",
    text: "text-teal-700",
  },
  inspecting: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
  repairing: {
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700",
    text: "text-orange-700",
  },
  offline: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
    text: "text-slate-600",
  },
  inactive: {
    dot: "bg-gray-400",
    badge: "bg-gray-100 text-gray-600",
    text: "text-gray-600",
  },
  unavailable: {
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    text: "text-red-700",
  },
};

export const getStatusStyle = (status) => {
  const normalizedStatus = String(status || "offline")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  return statusStyles[normalizedStatus] || statusStyles.offline;
};