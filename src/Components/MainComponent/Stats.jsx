import React from 'react';

const stats = [
  { label: 'Anywhere, Anytime', value: 'Online', suffix: '+ Offline' },
  { label: 'Increase Accuracy', value: 'Increased', suffix: 'Reliability' },
  { label: 'Enhance Safety', value: 'Proactive', suffix: 'Risk Alerts' },
  { label: 'Simplify Compliance', value: 'Always', suffix: 'Audit-Ready' },
];

const Stats = () => {
  return (
    <section className="relative z-20 -mt-8 sm:-mt-10 lg:-mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat, idx) => (
          <article
            key={idx}
            className="glass-effect p-5 sm:p-6 border border-slate-800 rounded-2xl bg-slate-900/50 group hover:bg-slate-900 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="text-2xl sm:text-3xl font-syncopate font-bold text-white mb-2 group-hover:text-orange-400 transition-colors leading-tight">
              {stat.value}
              <span className="block text-sm sm:text-base mt-1 text-slate-300">
                {stat.suffix}
              </span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-bold">
              {stat.label}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Stats;
