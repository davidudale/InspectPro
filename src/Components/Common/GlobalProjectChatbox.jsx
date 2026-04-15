import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext";
import ProjectChatbox from "./ProjectChatbox";

const HIDDEN_CHAT_PATHS = new Set(["/", "/login", "/register", "/unauthorized"]);

const GlobalProjectChatbox = () => {
  const authState = useAuth();
  const user = authState?.user ?? null;
  const location = useLocation();
  const role = String(user?.role || "").trim();

  if (
    !user?.uid ||
    HIDDEN_CHAT_PATHS.has(location.pathname) ||
    role === "External_Reviewer" ||
    role === "Super_Admin"
  ) {
    return null;
  }

  const assignmentField =
    role === "Inspector"
      ? "inspectorId"
      : role === "Lead Inspector"
        ? "supervisorId"
        : role === "Manager"
          ? "managerId"
          : "";
  const emptyStateLabel =
    role === "Inspector"
      ? "No assigned inspections are available for chat yet."
      : role === "Lead Inspector"
        ? "No lead-review projects are available for chat yet."
        : role === "Manager"
          ? "No approval projects are available for chat yet."
          : "No project threads are available yet.";

  return (
    <ProjectChatbox
      user={user}
      assignmentField={assignmentField}
      emptyStateLabel={emptyStateLabel}
    />
  );
};

export default GlobalProjectChatbox;
