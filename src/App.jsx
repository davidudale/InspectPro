import React from "react";
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
import Aut from "./Components/Dashboards/AdminFiles/InspectionFile/Aut.jsx";
import ViewInspection from "./Components/Dashboards/AdminFiles/InspectionFile/ViewInspection.jsx";
import ItemDetailView from "./Components/Dashboards/AdminFiles/InspectionFile/ItemDetailView.jsx";
import ProjectSetup from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectSetup.jsx";
import ProjectList from "./Components/Dashboards/AdminFiles/ProjectManagement/ProjectList.jsx";
import ClientManager from "./Components/Dashboards/AdminFiles/SetupManagement/ClientManager.jsx";
import LocationManager from "./Components/Dashboards/AdminFiles/SetupManagement/LocationManager.jsx";
import InspectionTypeManager from "./Components/Dashboards/AdminFiles/ProjectManagement/InspectionTypeManager.jsx";
import EquipmentManager from "./Components/Dashboards/AdminFiles/ProjectManagement/EquipmentManager.jsx";

function App() {
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
              allowedRoles={["Inspector", "Supervisor", "Manager", "Admin"]}
            >
              <InspectionDashboard />
            </ProtectedRoute>
          }
        />

        {/* Supervisor & Above */}
        <Route
          path="/SupervisorDashboard"
          element={
            <ProtectedRoute allowedRoles={["Supervisor", "Manager", "Admin"]}>
              <Supervisor />
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
          path="/admin/inspections"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <InspectionLogs />
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
          path="/admin/inspection-item/:docId/:itemId"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <ItemDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/aut-report"
          element={
            <ProtectedRoute allowedRoles={["Manager", "Admin"]}>
              <Aut />
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
          path="/viewprojects"
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
      </Routes>
      <ToastContainer />
    </>
  );
}
export default App;
