// Mock data for the Assignment Monitoring page.
// Replace with API calls when the backend is ready; the shapes below are what the page expects.

export const engineers = [
  { id: "E-101", name: "Chidi Okafor", specialization: "Electrical systems", skills: ["HV wiring", "Transformers", "Fault tracing"], rating: 4.8, status: "available" },
  { id: "E-102", name: "Amina Bello", specialization: "Heavy equipment", skills: ["Hydraulics", "Crane repair", "Diagnostics"], rating: 4.6, status: "active" },
  { id: "E-103", name: "Tunde Adeyemi", specialization: "Plumbing and drainage", skills: ["Pipe fitting", "Pump repair", "Leak detection"], rating: 4.2, status: "available" },
  { id: "E-104", name: "Ngozi Eze", specialization: "Generators and power", skills: ["Diesel generators", "Switchgear", "Load testing"], rating: 4.9, status: "assigned" },
  { id: "E-105", name: "Ibrahim Musa", specialization: "Structural repair", skills: ["Concrete repair", "Formwork", "Site inspection"], rating: 3.9, status: "offline" },
];

export const assignmentStatusStyles = {
  pending: { label: "Pending", badge: "bg-gray-100 text-gray-700" },
  assigned: { label: "Assigned", badge: "bg-purple-100 text-purple-700" },
  accepted: { label: "Accepted", badge: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", badge: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", badge: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", badge: "bg-red-100 text-red-700" },
};

export const priorityStyles = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

export const initialAssignments = [
  {
    id: "AS-2041", faultId: "F-310", location: "Site 4, Block C", fault: "Generator fails to start",
    engineerId: "E-104", assignedAt: "2026-10-21 07:30", deadline: "2026-10-21 15:00",
    priority: "critical", status: "in_progress",
    ai: { reason: "Highest score: generator specialist with the best rating, 2.1 km from the site and already cleared for dispatch.", candidates: [
      { engineerId: "E-104", score: 94, distanceKm: 2.1 },
      { engineerId: "E-101", score: 81, distanceKm: 4.8 },
      { engineerId: "E-102", score: 63, distanceKm: 6.3 },
    ] },
    dispatch: { response: "accepted", enRoute: false, eta: null, distanceKm: 0, gps: "On site", arrivedAt: "08:12", delayMinutes: 0 },
    progress: { siteInspection: "08:20", faultIdentified: "08:55", repairStarted: "09:30", testing: null, completionReport: null }, timeSpent: "3h 05m",
    history: [
      { at: "2026-10-21 07:30", text: "Assigned to Ngozi Eze by AI" },
      { at: "2026-10-21 07:36", text: "Accepted by engineer" },
      { at: "2026-10-21 08:12", text: "Arrival confirmed" },
      { at: "2026-10-21 09:30", text: "Repair started" },
    ],
    reassignments: [],
  },
  {
    id: "AS-2042", faultId: "F-311", location: "Site 2, Excavation Area", fault: "Excavator hydraulic leak",
    engineerId: "E-102", assignedAt: "2026-10-21 08:10", deadline: "2026-10-21 17:00",
    priority: "high", status: "accepted",
    ai: { reason: "Hydraulics and heavy equipment skills match the fault. Closest available engineer at 1.4 km.", candidates: [
      { engineerId: "E-102", score: 91, distanceKm: 1.4 },
      { engineerId: "E-104", score: 70, distanceKm: 3.9 },
      { engineerId: "E-105", score: 48, distanceKm: 7.2 },
    ] },
    dispatch: { response: "accepted", enRoute: true, eta: "10:25", distanceKm: 1.4, gps: "Haulage Road, 1.4 km from site", arrivedAt: null, delayMinutes: 0 },
    progress: { siteInspection: null, faultIdentified: null, repairStarted: null, testing: null, completionReport: null }, timeSpent: "0h 00m",
    history: [
      { at: "2026-10-21 08:10", text: "Assigned to Amina Bello by AI" },
      { at: "2026-10-21 08:14", text: "Accepted by engineer" },
      { at: "2026-10-21 09:50", text: "Engineer en route" },
    ],
    reassignments: [],
  },
  {
    id: "AS-2043", faultId: "F-312", location: "Site 1, Basement Level", fault: "Burst drainage pipe",
    engineerId: "E-103", assignedAt: "2026-10-21 09:00", deadline: "2026-10-21 14:00",
    priority: "high", status: "assigned",
    ai: { reason: "Plumbing specialist with leak detection skills. Rating is lower than other options but he is the only matching specialist available.", candidates: [
      { engineerId: "E-103", score: 86, distanceKm: 3.2 },
      { engineerId: "E-105", score: 52, distanceKm: 5.5 },
    ] },
    dispatch: { response: "no_response", enRoute: false, eta: null, distanceKm: 3.2, gps: "Depot, 3.2 km from site", arrivedAt: null, delayMinutes: 25 },
    progress: { siteInspection: null, faultIdentified: null, repairStarted: null, testing: null, completionReport: null }, timeSpent: "0h 00m",
    history: [{ at: "2026-10-21 09:00", text: "Assigned to Tunde Adeyemi by AI" }],
    reassignments: [],
  },
  {
    id: "AS-2038", faultId: "F-305", location: "Site 3, Power Room", fault: "Main switchgear tripping",
    engineerId: "E-101", assignedAt: "2026-10-19 10:00", deadline: "2026-10-19 18:00",
    priority: "critical", status: "completed",
    ai: { reason: "Electrical specialist with transformer experience and the shortest travel distance.", candidates: [
      { engineerId: "E-101", score: 96, distanceKm: 0.9 },
      { engineerId: "E-104", score: 84, distanceKm: 2.6 },
    ] },
    dispatch: { response: "accepted", enRoute: false, eta: null, distanceKm: 0, gps: "Left site", arrivedAt: "10:35", delayMinutes: 0 },
    progress: { siteInspection: "10:40", faultIdentified: "11:15", repairStarted: "11:40", testing: "13:20", completionReport: "13:55" }, timeSpent: "3h 20m",
    history: [
      { at: "2026-10-19 10:00", text: "Assigned to Chidi Okafor by AI" },
      { at: "2026-10-19 10:04", text: "Accepted by engineer" },
      { at: "2026-10-19 13:55", text: "Completion report submitted" },
    ],
    reassignments: [],
  },
  {
    id: "AS-2036", faultId: "F-301", location: "Site 5, Scaffold Yard", fault: "Tower crane slewing fault",
    engineerId: "E-102", assignedAt: "2026-10-18 08:00", deadline: "2026-10-18 12:00",
    priority: "high", status: "overdue",
    ai: { reason: "Crane repair skills and prior fixes on the same crane model.", candidates: [
      { engineerId: "E-102", score: 89, distanceKm: 2.0 },
      { engineerId: "E-105", score: 55, distanceKm: 4.1 },
    ] },
    dispatch: { response: "accepted", enRoute: false, eta: null, distanceKm: 0, gps: "On site", arrivedAt: "09:40", delayMinutes: 100 },
    progress: { siteInspection: "09:50", faultIdentified: "11:30", repairStarted: "12:15", testing: null, completionReport: null }, timeSpent: "5h 40m",
    history: [
      { at: "2026-10-18 08:00", text: "Assigned to Amina Bello by AI" },
      { at: "2026-10-18 09:40", text: "Arrival confirmed 100 min after dispatch" },
      { at: "2026-10-18 12:00", text: "Deadline passed, marked overdue" },
    ],
    reassignments: [],
  },
  {
    id: "AS-2044", faultId: "F-313", location: "Site 6, Retaining Wall", fault: "Cracks in retaining wall",
    engineerId: null, assignedAt: "2026-10-21 10:05", deadline: "2026-10-22 12:00",
    priority: "medium", status: "pending",
    ai: { reason: "No engineer assigned yet. Ibrahim Musa is the best structural match but is offline.", candidates: [
      { engineerId: "E-105", score: 74, distanceKm: 8.4 },
      { engineerId: "E-101", score: 41, distanceKm: 5.0 },
    ] },
    dispatch: { response: "pending", enRoute: false, eta: null, distanceKm: 0, gps: "No GPS data", arrivedAt: null, delayMinutes: 0 },
    progress: { siteInspection: null, faultIdentified: null, repairStarted: null, testing: null, completionReport: null }, timeSpent: "0h 00m",
    history: [{ at: "2026-10-21 10:05", text: "Fault reported, waiting for assignment" }],
    reassignments: [],
  },
  {
    id: "AS-2039", faultId: "F-307", location: "Site 2, Mixing Plant", fault: "Concrete mixer motor burnout",
    engineerId: "E-101", assignedAt: "2026-10-20 09:15", deadline: "2026-10-20 16:00",
    priority: "medium", status: "completed",
    ai: { reason: "Electrical skills match the motor fault. Selected after the first engineer rejected the job.", candidates: [
      { engineerId: "E-101", score: 85, distanceKm: 3.7 },
      { engineerId: "E-105", score: 58, distanceKm: 4.4 },
    ] },
    dispatch: { response: "accepted", enRoute: false, eta: null, distanceKm: 0, gps: "Left site", arrivedAt: "10:05", delayMinutes: 0 },
    progress: { siteInspection: "10:10", faultIdentified: "10:45", repairStarted: "11:10", testing: "13:30", completionReport: "14:00" }, timeSpent: "3h 55m",
    history: [
      { at: "2026-10-20 08:30", text: "Assigned to Ibrahim Musa by AI" },
      { at: "2026-10-20 08:52", text: "Rejected by Ibrahim Musa: not trained on motor repair" },
      { at: "2026-10-20 09:15", text: "Reassigned to Chidi Okafor" },
      { at: "2026-10-20 14:00", text: "Completion report submitted" },
    ],
    reassignments: [
      { at: "2026-10-20 09:15", fromId: "E-105", toId: "E-101", reason: "Rejected by Ibrahim Musa: not trained on motor repair" },
    ],
  },
];

// Per-engineer performance inputs. Grades are computed in the page from these.
export const performanceStats = [
  { engineerId: "E-101", avgResponseMin: 6, punctuality: 96, avgRepairHrs: 3.4, resolutionRate: 97, supervisor: 4.8 },
  { engineerId: "E-102", avgResponseMin: 9, punctuality: 82, avgRepairHrs: 4.6, resolutionRate: 90, supervisor: 4.3 },
  { engineerId: "E-103", avgResponseMin: 21, punctuality: 71, avgRepairHrs: 3.9, resolutionRate: 84, supervisor: 3.8 },
  { engineerId: "E-104", avgResponseMin: 5, punctuality: 98, avgRepairHrs: 3.1, resolutionRate: 98, supervisor: 4.9 },
  { engineerId: "E-105", avgResponseMin: 27, punctuality: 64, avgRepairHrs: 5.2, resolutionRate: 76, supervisor: 3.4 },
];