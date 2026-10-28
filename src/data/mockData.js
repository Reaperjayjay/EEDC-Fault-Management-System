// Mock data: replace with calls to your API.

export const sites = [
  { id: "S-001", name: "Rumuola Substation", location: "Port Harcourt", voltage: "33/11kV", status: "Operational" },
  { id: "S-002", name: "Trans-Amadi Substation", location: "Port Harcourt", voltage: "132/33kV", status: "Operational" },
  { id: "S-003", name: "Eleme Injection Substation", location: "Eleme", voltage: "33/11kV", status: "Under Maintenance" },
  { id: "S-004", name: "Borokiri Substation", location: "Port Harcourt", voltage: "33/11kV", status: "Faulty" },
  { id: "S-005", name: "Ahoada Substation", location: "Ahoada", voltage: "33/11kV", status: "Operational" },
];

export const equipment = [
  { id: "EQ-101", name: "Power Transformer T1", type: "Transformer", siteId: "S-001", status: "Operational", installed: "2018-03-12" },
  { id: "EQ-102", name: "11kV Feeder F1", type: "Feeder", siteId: "S-001", status: "Operational", installed: "2019-06-20" },
  { id: "EQ-103", name: "Circuit Breaker CB1", type: "Breaker", siteId: "S-002", status: "Operational", installed: "2017-09-01" },
  { id: "EQ-104", name: "Power Transformer T2", type: "Transformer", siteId: "S-003", status: "Under Maintenance", installed: "2015-01-15" },
  { id: "EQ-105", name: "11kV Feeder F4", type: "Feeder", siteId: "S-004", status: "Faulty", installed: "2016-11-30" },
  { id: "EQ-106", name: "Circuit Breaker CB3", type: "Breaker", siteId: "S-004", status: "Faulty", installed: "2014-05-05" },
  { id: "EQ-107", name: "Power Transformer T1", type: "Transformer", siteId: "S-005", status: "Operational", installed: "2020-02-18" },
];

export const maintenance = [
  { id: "M-201", equipmentId: "EQ-104", task: "Oil filtration and testing", date: "2026-10-25", technician: "A. Okoro", state: "Scheduled" },
  { id: "M-202", equipmentId: "EQ-102", task: "Routine inspection", date: "2026-11-03", technician: "B. Nwosu", state: "Scheduled" },
  { id: "M-203", equipmentId: "EQ-101", task: "Thermal imaging check", date: "2026-09-14", technician: "C. Eze", state: "Completed" },
  { id: "M-204", equipmentId: "EQ-103", task: "Contact resistance test", date: "2026-08-02", technician: "A. Okoro", state: "Completed" },
];

export const faults = [
  { id: "F-301", equipmentId: "EQ-105", issue: "Conductor sag / tripping on overload", severity: "High", reported: "2026-10-18" },
  { id: "F-302", equipmentId: "EQ-106", issue: "Failed to close on command", severity: "Critical", reported: "2026-10-19" },
];

export const history = [
  { id: "H-401", date: "2026-10-19", siteId: "S-004", type: "Fault", text: "Circuit Breaker CB3 failed to close on command." },
  { id: "H-402", date: "2026-10-18", siteId: "S-004", type: "Fault", text: "Feeder F4 tripping on overload." },
  { id: "H-403", date: "2026-09-14", siteId: "S-001", type: "Maintenance", text: "Thermal imaging check completed on Transformer T1." },
  { id: "H-404", date: "2026-07-01", siteId: "S-003", type: "Change", text: "Transformer T2 taken offline for oil servicing." },
  { id: "H-405", date: "2026-05-22", siteId: "S-002", type: "Repair", text: "Breaker CB1 contacts replaced." },
];

export const siteName = (id) => sites.find((s) => s.id === id)?.name ?? id;
export const equipmentName = (id) => equipment.find((e) => e.id === id)?.name ?? id;