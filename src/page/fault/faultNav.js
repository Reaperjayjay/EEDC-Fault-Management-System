export const FAULT_BASE = "/faults";

export const faultNav = [
  { label: "Fault Overview", to: `${FAULT_BASE}/overview`, desc: "Summary of all fault counts" },
  { label: "All Faults", to: `${FAULT_BASE}/all`, desc: "Searchable table of every fault" },
  { label: "New Fault Reports", to: `${FAULT_BASE}/new`, desc: "Customer reports and alarm tickets" },
  { label: "Critical & Priority Faults", to: `${FAULT_BASE}/critical`, desc: "Urgent faults and escalations" },
  { label: "Fault Locations", to: `${FAULT_BASE}/locations`, desc: "Map of affected sites" },
  { label: "Resolved Faults & History", to: `${FAULT_BASE}/resolved`, desc: "Closed jobs and update history" },
];