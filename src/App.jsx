import React, { useEffect } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Homepage from "./Components/MainComponent/Homepage";
import Login from "./Components/Page/Login.jsx";
import Register from "./Components/Page/Register.jsx";
import { ToastContainer } from "react-toastify";
import { ProtectedRoute } from "./Components/Auth/ProtectedRoute.jsx";
import GlobalProjectChatbox from "./Components/Common/GlobalProjectChatbox.jsx";
import AdminDashboard from "./Components/Page/AdminDashboard.jsx";
import Unauthorized from "./Components/Page/UnauthorizedPage.jsx";
import VerifyEmail from "./Components/Page/VerifyEmail.jsx";
import InspectionDashboard from "./Components/Page/InspectionDashboard.jsx";
import UserPage from "./Components/Dashboards/AdminFiles/UserManagement/UserPage.jsx";
import Adduser from "./Components/Dashboards/AdminFiles/UserManagement/Adduser.jsx";
import EditUser from "./Components/Dashboards/AdminFiles/UserManagement/EditUser.jsx";
import UTReport from "./Components/Dashboards/AdminFiles/ReportManagement/UTReport.jsx";
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
import CompanyProfile from "./Components/Dashboards/AdminFiles/SetupManagement/CompanyProfile.jsx";
import InspectionTypeManager from "./Components/Dashboards/AdminFiles/ProjectManagement/InspectionTypeManager.jsx";
import EquipmentManager from "./Components/Dashboards/AdminFiles/ProjectManagement/EquipmentManager.jsx";
import ProjectEdit from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectEdit.jsx";
import VisualReport from "./Components/Dashboards/AdminFiles/ReportManagement/VisualReport.jsx";
import MutReport from "./Components/Dashboards/AdminFiles/ReportManagement/MutReport.jsx";
import DetailedReport from "./Components/Dashboards/AdminFiles/ReportManagement/DetailedReport.jsx";
import IntegrityCheck from "./Components/Dashboards/AdminFiles/ReportManagement/IntegrityCheck.jsx";
import ViewInspectionsList from "./Components/Dashboards/InspectorsFile/ViewInspectionsList.jsx";
import SupervisorDashboard from "./Components/Page/SupervisorDashboard.jsx";
import ExternalReviewer from "./Components/Dashboards/ExternalDashboard/ExternalReviewer.jsx";
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
import ReportPlaceholder from "./Components/Dashboards/ReportManager/ReportPlaceholder.jsx";
import Inspection360Summary from "./Components/Dashboards/ReportManager/Inspection360Summary.jsx";
import ProjectsReviewing from "./Components/Dashboards/ExternalDashboard/ProjectsReviewing.jsx";
import Feedback from "./Components/Dashboards/ExternalDashboard/Feedback.jsx";
import ExternalFeedbackManager from "./Components/Dashboards/AdminFiles/FeedbackManagement/ExternalFeedbackManager.jsx";
import InspectedEquipment from "./Components/Dashboards/ExternalDashboard/InspectedEquipment.jsx";
import ReportReviewChecklist from "./Components/Dashboards/ExternalDashboard/ReportReviewChecklist.jsx";
import NextInspectionScheduler from "./Components/Dashboards/ProjectScheduler/NextInspectionScheduler.jsx";
import ProfileSecurity from "./Components/Page/ProfileSecurity.jsx";
import IssueLogCenter from "./Components/Dashboards/Support/IssueLogCenter.jsx";
import SuperAdminDashboard from "./Components/Page/SuperAdminDashboard.jsx";
import SuperAdminAccessCenter from "./Components/Page/SuperAdminAccessCenter.jsx";
import SuperAdminSystemCenter from "./Components/Page/SuperAdminSystemCenter.jsx";
import SuperAdminAuditCenter from "./Components/Page/SuperAdminAuditCenter.jsx";
function App() {
  useEffect(() => {
    const themeMode = localStorage.getItem("inspectpro_ui_theme") || "system";
    const accent = localStorage.getItem("inspectpro_ui_accent") || "orange";
    document.documentElement.setAttribute("data-theme-mode", themeMode);
    document.documentElement.setAttribute("data-theme-accent", accent);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Inspector & Above */}
        <Route
          path="/inspectionDashboard"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <InspectionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Inspection_view"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ViewInspectionsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/visual-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <VisualReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/integrity-check"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <IntegrityCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/aut-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <Aut />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/utreport"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <UTReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/Detailed-report"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <DetailedReport />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile/security"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ProfileSecurity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["Super_Admin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/access"
          element={
            <ProtectedRoute allowedRoles={["Super_Admin"]}>
              <SuperAdminAccessCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/system"
          element={
            <ProtectedRoute allowedRoles={["Super_Admin"]}>
              <SuperAdminSystemCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/audit"
          element={
            <ProtectedRoute allowedRoles={["Super_Admin"]}>
              <SuperAdminAuditCenter />
            </ProtectedRoute>
          }
        />
       
        
        <Route
          path="/support/issues"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <IssueLogCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspector/settings"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector", "Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ProfileSecurity />
            </ProtectedRoute>
          }
        />

        {/* Lead Inspector & Above */}
        <Route
          path="/external-reviewer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["External_Reviewer"]}>
              <ExternalReviewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/external-reviewer-equipment"
          element={
            <ProtectedRoute allowedRoles={["External_Reviewer"]}>
              <InspectedEquipment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/external-reviewer-checklist"
          element={
            <ProtectedRoute allowedRoles={["External_Reviewer"]}>
              <ReportReviewChecklist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/SupervisorDashboard"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "Admin"]}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/SubInspection_view"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <SubInspectionsList />
            </ProtectedRoute>
          }
          
        />
        <Route
          path="/pendinginspections"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ReviewForConfirmation />
            </ProtectedRoute>
          }
        />
        
        
        <Route
          path="/review/:id"
          element={
            <ProtectedRoute
              allowedRoles={["Inspector","Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ReviewReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ConfirmedInspection"
          element={
            <ProtectedRoute
              allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}
            >
              <ConfirmedInspection />
            </ProtectedRoute>
          }
        />
        {/* Manager & Above */}
        <Route
          path="/ManagerDashboard"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Pending_approval"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}>
              <PendingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ReviewForApproval"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "External_Reviewer", "Manager", "Admin"]}>
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
            <ProtectedRoute allowedRoles={["Manager", "Admin",
                "External_Reviewer"
                ]}>
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
          path="/admin/reports/utreport"
          element={
            <ProtectedRoute allowedRoles={["Lead Inspector", "Manager", "Admin"]}>
              <UTReport />
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
        <Route
          path="/admin/reports/integrity"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <IntegrityCheck />
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
            <ProtectedRoute allowedRoles={["Admin", "External_Reviewer"]}>
              <UserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/addusers"
          element={
            <ProtectedRoute allowedRoles={["Admin", "External_Reviewer"]}>
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
          path="/admin/external-feedback"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <ExternalFeedbackManager />
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
          path="/admin/company-profile"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <CompanyProfile />
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
            <ProtectedRoute allowedRoles={["Admin", "External_Reviewer"]}>
              <EquipmentManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/next-inspections"
          element={
            <ProtectedRoute allowedRoles={["Admin", "Manager", "External_Reviewer"]}>
              <NextInspectionScheduler />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/daily-inspection-summary"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <Inspection360Summary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/inspection-progress"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Inspection Progress Report" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/non-conformance"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Non-Conformance Report" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/corrective-action"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Corrective Action Report" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/equipment-status"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <EquipmentManager />
              {/*<ReportPlaceholder title="Equipment Status Report" />*/}
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/personnel-activity"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Personnel Activity Report" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/safety"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Safety Report" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/next-day-plan"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ReportPlaceholder title="Next Day Plan" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/external-reviewer-projects"
          element={
            <ProtectedRoute
              allowedRoles={[
                "Inspector",
                "Lead Inspector",
                "External_Reviewer",
                "Manager",
                "Admin",
              ]}
            >
              <ProjectsReviewing/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/external-reviewer-feedback"
          element={
            <ProtectedRoute
              allowedRoles={["External_Reviewer"]}
            >
              <Feedback />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
        toastClassName="inspectpro-toast"
        bodyClassName="inspectpro-toast-body"
        progressClassName="inspectpro-toast-progress"
      />
      <GlobalProjectChatbox />
    </>
  );
}
export default App;
