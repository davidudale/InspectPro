import React from "react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16 sm:pb-20">
      {/* Background Image / Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1714204385179-0102ca278981?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Inspection team reviewing digital checklist"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 mb-6 border border-orange-500/30 bg-orange-500/10 rounded-full">
          <span className="text-orange-400 text-xs font-bold uppercase tracking-[0.2em]">
            Inspection Intelligence Platform
          </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-syncopate font-bold leading-[1.02] mb-6 sm:mb-8 tracking-tight text-white">
            UNLOCK <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-600 to-amber-400">
              EFFICIENCY
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-slate-300 mb-9 sm:mb-10 font-light leading-relaxed">
            Streamline your inspections with InspectPro&apos;s all-in-one platform.
            Go digital, automate your workflows, and keep every team aligned from
            field checks to final reports.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-[0.16em] text-xs sm:text-sm transition-all hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] rounded-xl">
              Book Demo
            </button>
            <button className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 border border-slate-700 hover:border-slate-500 bg-white/5 backdrop-blur-sm text-white font-bold uppercase tracking-[0.16em] text-xs sm:text-sm transition-all rounded-xl">
              See How It Works
            </button>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {[
            { title: "Faster Turnaround", value: "60%" },
            { title: "Audit Readiness", value: "100%" },
            { title: "Site Coverage", value: "24/7" },
          ].map((metric) => (
            <div
              key={metric.title}
              className="rounded-2xl border border-slate-700/70 bg-slate-950/55 backdrop-blur-sm px-4 py-4"
            >
              <p className="text-xl sm:text-2xl font-syncopate font-bold text-orange-400">{metric.value}</p>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-slate-300 mt-1">{metric.title}</p>
            </div>
          ))}
        </div>

        <div className="absolute bottom-5 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.5em] text-slate-500 mb-2">
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-orange-500 to-transparent"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

