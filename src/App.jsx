import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import AdminLogin from "./page/login.jsx";
import AdminSignup from "./page/signUp.jsx";
import Dashboard from "./page/dashboard";
import Site from "./page/site.jsx";
import Status from "./page/status.jsx";
import OutageInformation from "./page/OutageInformation.jsx";
import CustomerSupport from "./page/CustomerSupport.jsx";
import Createperformancereview from "./page/Createperformancereview.jsx";

import MyAssignments from "./page/assignments/Myassignments.jsx";
import FaultStatusUpdate from "./page/assignments/statusFault.jsx";
import MyProfile from "./page/MyProfile.jsx";
import UpdateMyProfile from "./page/UpdateMyProfile.jsx";
import ReportFault from "./page/ReportFault.jsx";
import MyFaultReports from "./page/MyFaultReports.jsx";
import TrackMyFault from "./page/TrackMyFault.jsx";

import AdminLayout from "./components/AdminLayout.jsx";
import FieldAssistant from "./components/FieldAssistant.jsx";
import FaultManagementLayout from "./page/fault/FaultManagementLayout.jsx";
import FaultOverview from "./page/fault/FaultOverview.jsx";
import AllFaults from "./page/fault/AllFaults.jsx";
import NewFaultReports from "./page/fault/NewFaultReports.jsx";
import CriticalFaults from "./page/fault/CriticalFaults.jsx";
import FaultLocations from "./page/fault/FaultLocations.jsx";
import ResolvedFaults from "./page/fault/ResolvedFaults.jsx";

import GPSTracking from "./page/gps/GPSTracking.jsx";
import AssignmentMonitoring from "./page/assignments/AssignmentMonitoring.jsx";
import GPSNavigation from "./page/assignments/Gpsnavigation.jsx";
import MyPerformance from "./page/assignments/MyPerformance.jsx";

import EngineerDashboard from "./page/Engineerdashboard.jsx";
import UserDashboard from "./page/UserDashboard.jsx";


import {
  RoleRedirect,
  ProtectedRoute,
} from "./components/RoleRedirect.jsx";

// Site & equipment pages
import SiteManagementLayout from "./page/site/Sitemanagementlayout.jsx";
import SiteOverview from "./page/site/Siteoverview.jsx";
import AllSites from "./page/site/Allsites.jsx";

// AI Auto Assignment page
import AIAutoAssignment from "./page/AI.jsx";
import Engineerranking from "./page/Engineerranking.jsx"
import Engineerperformance from "./page/Engineerperformance.jsx"
import Engineermanagement from "./page/Engineermanagement.jsx"

// Pages where the field assistant (Rasa chat bubble) must NOT appear:
// the login/signup pages and the customer pages.
const ASSISTANT_HIDDEN_PATHS = [
  "/",
  "/signup",
  "/user/dashboard",
  "/report-fault",
  "/my-fault-reports",
  "/myfault",
  "/customersupport",
];

// Shows the chat bubble on staff pages once the user is logged in.
function AssistantGate() {
  const { pathname } = useLocation();
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");

  const hidden = ASSISTANT_HIDDEN_PATHS.some(
    (path) =>
      pathname === path || (path !== "/" && pathname.startsWith(`${path}/`))
  );

  if (!token || hidden) return null;

  return <FieldAssistant />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<AdminLogin />} />
        <Route path="/signup" element={<AdminSignup />} />

        {/* Redirect according to the logged-in user's role */}
        <Route path="/dashboard" element={<RoleRedirect />} />

        {/* Admin and operator dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "operator"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Engineer dashboard */}
        <Route
          path="/engineer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["engineer"]}>
              <EngineerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Customer dashboard */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/site" element={<Site />} />
        <Route path="/status" element={<Status />} />

        {/* Shared application layout */}
        <Route element={<AdminLayout />}>
          {/* GPS, assignments and AI assignment */}
          <Route path="/gps" element={<GPSTracking />} />
          <Route path="/assignments" element={<AssignmentMonitoring />} />
          <Route
            path="/ai-auto-assignment"
            element={<AIAutoAssignment />}
          />
          <Route
            path="/engineerranking"
            element={<Engineerranking />}
          />

          <Route
            path="/Engineerperformance"
            element={<Engineerperformance />}
          />

          <Route
            path="/Createperformancereview"
            element={<Createperformancereview />}
          />

          <Route
            path="/Engineermanagement"
            element={<Engineermanagement  />}
          />

          {/* Site and equipment management */}
          <Route
            path="/site-management"
            element={<SiteManagementLayout />}
          >
            <Route
              index
              element={<Navigate to="overview" replace />}
            />
            <Route path="overview" element={<SiteOverview />} />
            <Route path="sites" element={<AllSites />} />
           
            
          </Route>

          {/* Fault management */}
          <Route
            path="/faults"
            element={<FaultManagementLayout />}
          >
            <Route
              index
              element={<Navigate to="overview" replace />}
            />
            <Route path="overview" element={<FaultOverview />} />
            <Route path="all" element={<AllFaults />} />
            <Route path="new" element={<NewFaultReports />} />
            <Route path="critical" element={<CriticalFaults />} />
            <Route path="locations" element={<FaultLocations />} />
            <Route path="resolved" element={<ResolvedFaults />} />
          </Route>

          {/* Engineer pages */}
          <Route path="/my-assignments" element={<MyAssignments />} />
          <Route path="/gps-navigation" element={<GPSNavigation />} />
          <Route path="/fault-status" element={<FaultStatusUpdate />} />
          <Route path="/my-performance" element={<MyPerformance />} />

          {/* Profile pages */}
          <Route path="/my-profile" element={<MyProfile />} />
          <Route
            path="/update-my-profile"
            element={<UpdateMyProfile />}
          />

          {/* Customer pages */}
          <Route path="/report-fault" element={<ReportFault />} />
          <Route path="/my-fault-reports" element={<MyFaultReports />} />
          <Route path="/myfault" element={<TrackMyFault />} />
          <Route path="/myfault/:id" element={<TrackMyFault />} />
          <Route path="/outageinformation" element={<OutageInformation />} />
          <Route path="/customersupport" element={<CustomerSupport />} />
        </Route>
      </Routes>

      {/* Rasa chat bubble: staff pages only, and only when logged in */}
      <AssistantGate />
    </BrowserRouter>
  );
}