// Fault shape (fill from your API later):
// { id, type, location, priority, engineer, status, source, reported, closure?, history?: [{ time, note }] }
// status: "Pending" | "Assigned" | "Under Repair" | "Resolved"
// priority: "Critical" | "High" | "Medium" | "Low"
// source: "Customer" | "Auto Alarm"
export const faults = [];

export const statusStyles = {
  Pending: "bg-orange-50 text-orange-700 border-orange-200",
  Assigned: "bg-blue-50 text-blue-700 border-blue-200",
  "Under Repair": "bg-purple-50 text-purple-700 border-purple-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
};

export const priorityStyles = {
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-orange-50 text-orange-700 border-orange-200",
  Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Low: "bg-gray-50 text-gray-600 border-gray-200",
};