import React, { useEffect } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Homepage from "./Components/MainComponent/Homepage";
import Login from "./Components/Page/Login.jsx";
import Register from "./Components/Page/Register.jsx";
import { ToastContainer } from "react-toastify";
import { ProtectedRoute } from "./Components/Auth/ProtectedRoute.jsx";
import AdminDashboard from "./Components/Page/AdminDashboard.jsx";
import Supervisor from "./Components/Page/SupervisorDashboard.jsx";
import Unauthorized from "./Components/Page/UnauthorizedPage.jsx";
import InspectionDashboard from "./Components/Page/InspectionDashboard.jsx";
import UserPage from "./Components/Dashboards/AdminFiles/UserManagement/UserPage.jsx";
import Adduser from "./Components/Dashboards/AdminFiles/UserManagement/Adduser.jsx";
import EditUser from "./Components/Dashboards/AdminFiles/UserManagement/EditUser.jsx";
import ManagerDashboard from "./Components/Page/ManagerDashboard.jsx";
import InspectionLogs from "./Components/Dashboards/AdminFiles/InspectionFile/InspectionLogs.jsx";
import AddInspectionTemplate from "./Components/Dashboards/AdminFiles/InspectionFile/AddInspectionTemplate.jsx";
import Aut from "./Components/Dashboards/AdminFiles/ReportManagement/Aut.jsx";
import ViewInspection from "./Components/Dashboards/AdminFiles/InspectionFile/ViewInspection.jsx";
import ItemDetailView from "./Components/Dashboards/AdminFiles/InspectionFile/ItemDetailView.jsx";
import ProjectSetup from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectSetup.jsx";
import ProjectList from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectList.jsx";
import ClientManager from "./Components/Dashboards/AdminFiles/SetupManagement/ClientManager.jsx";
import LocationManager from "./Components/Dashboards/AdminFiles/SetupManagement/LocationManager.jsx";
import InspectionTypeManager from "./Components/Dashboards/AdminFiles/ProjectManagement/InspectionTypeManager.jsx";
import EquipmentManager from "./Components/Dashboards/AdminFiles/ProjectManagement/EquipmentManager.jsx";
import ProjectEdit from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectEdit.jsx";
import VisualReport from "./Components/Dashboards/AdminFiles/ReportManagement/VisualReport.jsx";
import MutReport from "./Components/Dashboards/AdminFiles/ReportManagement/MutReport.jsx";
import DetailedReport from "./Components/Dashboards/AdminFiles/ReportManagement/DetailedReport.jsx";
import ViewInspectionsList from "./Components/Dashboards/InspectorsFile/ViewInspectionsList.jsx";
import UserPreferences from "./Components/Dashboards/InspectorsFile/UserPreferences.jsx";
import SupervisorDashboard from "./Components/Page/SupervisorDashboard.jsx";
import SubInspectionsList from "./Components/Dashboards/SupervisorFiles/SubInspectionsList.jsx";
import PendingApproval from "./Components/Dashboards/ManagerFile/PendingApprovals.jsx";
import ReviewForConfirmation from "./Components/Dashboards/SupervisorFiles/ReviewForConfirmation.jsx";
import ConfirmedInspection from "./Components/Dashboards/SupervisorFiles/ConfirmedInspection.jsx"
import ReviewReport from "./Components/Dashboards/SupervisorFiles/ReviewReport.jsx";
import ReviewForApproval from "./Components/Dashboards/ManagerFile/ReviewForApproval.jsx";
import PendingApprovals from "./Components/Dashboards/ManagerFile/PendingApprovals.jsx";
import ApprovedProjects from "./Components/Dashboards/ManagerFile/ApprovedProjects.jsx";
import ReportDownloadView from "./Components/Dashboards/ManagerFile/ReportDownloadView.jsx";
import ProjectPreview from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectPreview.jsx";
function App() {
  useEffect(() => {
    const themeMode = localStorage.getItem("inspectpro_ui_theme") || "system";
    const accent = localStorage.getItem("inspectpro_ui_accent") || "orange";
    document.documentElement.setAttribute("data-theme-mode", themeMode);
    document.documentElement.setAttribute("data-theme-accent", accent);
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Inspector & Above */}
        <Route
          path="/inspectionDashboard"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <InspectionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Inspection_view"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <ViewInspectionsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/visual-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <VisualReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/aut-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <Aut />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/Detailed-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <DetailedReport />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/inspector/settings"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Manager", "Admin"]}
            >
              <UserPreferences />
            </ProtectedRoute>
          }
        />

        {/* Lead Inspector & Above */}
        <Route
          path="/SupervisorDashboard"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "Supervisor", "Admin"]}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/SubInspection_view"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "Supervisor", "Manager", "Admin"]}
            >
              <SubInspectionsList />
            </ProtectedRoute>
          }
          
        />
        <Route
          path="/pendinginspections"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "Supervisor", "Manager", "Admin"]}
            >
              <ReviewForConfirmation />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/review/:id"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "Supervisor", "Manager", "Admin"]}
            >
              <ReviewReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ConfirmedInspection"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "Supervisor", "Manager", "Admin"]}
            >
              <ConfirmedInspection />
            </ProtectedRoute>
          }
        />
        {/* Manager & Above */}
        <Route
          path="/ManagerDashboard"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Pending_approval"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PendingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ReviewForApproval"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ReviewForApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inspections"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <InspectionLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval_projects"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ApprovedProjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inspection-details/:id"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ViewInspection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/viewprojects/project-edit/:id"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ProjectEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/project/:id"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ProjectPreview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending_approval"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <PendingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inspection-item/:docId/:itemId"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ItemDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/aut"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <Aut />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/visual"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <VisualReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/mut"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <MutReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/detailed"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <DetailedReport />
            </ProtectedRoute>
          }
        />
        
       
        
<Route path="/report/download/:id" element={<ReportDownloadView />} />
        
        {/* Admin Only */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <UserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/addusers"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Adduser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/edit-user/:userId"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <EditUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/addInspectionTemp"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AddInspectionTemplate />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/projects"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <ProjectSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <ProjectList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Client"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <ClientManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/location"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <LocationManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspection_type"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <InspectionTypeManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipment"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <EquipmentManager />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}
export default App;
