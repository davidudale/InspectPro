import SuperAdminNavbar from "./SuperAdminNavbar";
import SuperAdminSidebar from "./SuperAdminSidebar";

const SuperAdminShell = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
    <SuperAdminNavbar />
    <div className="flex flex-1">
      <SuperAdminSidebar />
      <main className="min-h-[calc(100vh-65px)] flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),linear-gradient(180deg,_#070c19_0%,_#090f1d_100%)] px-4 py-5 ml-16 lg:ml-64 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  </div>
);

export default SuperAdminShell;
