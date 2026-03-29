import React from "react";
import { Activity, Search, ShieldAlert } from "lucide-react";

const ControlCenterTableShell = ({
  navbar,
  sidebar,
  title,
  subtitle,
  eyebrow = "Control Center",
  icon,
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  summary,
  sectionTitle,
  sectionSubtitle,
  sectionBadgeLabel,
  sectionBadgeValue,
  loading = false,
  hasData = false,
  emptyTitle = "No Records Found",
  emptyDescription = "",
  toolbar,
  children,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-[#050816] text-slate-200">
      {navbar}
      <div className="flex flex-1">
        {sidebar}
        <main className="ml-16 min-w-0 flex-1 overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_25%),linear-gradient(180deg,_#07101f_0%,_#050816_55%,_#040712_100%)] p-3 sm:p-5 lg:ml-64 lg:p-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-800/80 bg-[#08101f]/95 shadow-[0_24px_80px_rgba(2,6,23,0.55)] sm:rounded-[2rem]">
              <header className="border-b border-slate-800/80 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
                      {eyebrow}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2.5 text-orange-400 sm:rounded-2xl sm:p-3">
                        {icon}
                      </div>
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-white sm:text-xl lg:text-2xl">
                          {title}
                        </h1>
                        <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 xl:max-w-[420px] xl:items-end">
                    <div className="relative w-full">
                      <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="w-full rounded-2xl border border-slate-700/80 bg-[#0a1224] py-3.5 pl-12 pr-4 text-xs text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                      />
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                        <Search size={16} />
                      </span>
                    </div>
                    {summary ? (
                      <p className="text-xs font-semibold text-slate-400 sm:text-sm">{summary}</p>
                    ) : null}
                  </div>
                </div>
              </header>

              <section className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                {loading ? (
                  <div className="flex min-h-[360px] items-center justify-center">
                    <Activity className="animate-spin text-orange-500" />
                  </div>
                ) : hasData ? (
                  <div className="rounded-[1.25rem] border border-slate-800/80 bg-[#070d1c] p-3 sm:rounded-[1.75rem] sm:p-6">
                    <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-black text-white sm:text-lg">
                          {sectionTitle}
                        </h2>
                        {sectionSubtitle ? (
                          <p className="mt-1 text-xs text-slate-400 sm:text-sm">{sectionSubtitle}</p>
                        ) : null}
                      </div>

                      {sectionBadgeValue !== undefined ? (
                        <div className="rounded-xl border border-slate-800 bg-[#091122] px-4 py-3 text-right sm:rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                            {sectionBadgeLabel}
                          </p>
                          <p className="mt-1 text-base font-black text-white sm:text-lg">
                            {sectionBadgeValue}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[1rem] border border-slate-800/80 bg-[#060b17] sm:rounded-[1.5rem]">
                      {toolbar}
                      {children}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-slate-800 bg-[#070d1c] px-6 py-16 text-center">
                    <ShieldAlert size={48} className="mb-4 text-slate-700" />
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 sm:text-sm">
                      {emptyTitle}
                    </p>
                    {emptyDescription ? (
                      <p className="mt-3 max-w-md text-xs text-slate-400 sm:text-sm">
                        {emptyDescription}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ControlCenterTableShell;
