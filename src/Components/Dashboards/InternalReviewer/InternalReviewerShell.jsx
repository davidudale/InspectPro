import React from "react";
import InternalReviewerNavbar from "./InternalReviewerNavbar";
import InternalReviewerSidebar from "./InternalReviewerSidebar";

const InternalReviewerShell = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
    <InternalReviewerNavbar />
    <div className="flex flex-1">
      <InternalReviewerSidebar />
      <main className="flex-1 ml-16 lg:ml-64 p-4 sm:p-6 lg:p-8 bg-slate-950">
        {children}
      </main>
    </div>
  </div>
);

export default InternalReviewerShell;
