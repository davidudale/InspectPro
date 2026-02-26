import React from 'react';

const stats = [
  { label: 'Anywhere, Anytime', value: 'Online', suffix: '+ Offline' },
  { label: 'Increase Accuracy', value: 'Fewer', suffix: 'Errors' },
  { label: 'Enhance Safety', value: 'Proactive', suffix: 'Risk Alerts' },
  { label: 'Simplify Compliance', value: 'Always', suffix: 'Audit-Ready' },
];

const Stats = () => {
  return (
    <div className="relative z-20 mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-effect p-8 border-l-4 border-l-orange-500 group hover:bg-slate-900 transition-all duration-300 transform hover:-translate-y-2">
            <div className="text-3xl md:text-4xl font-syncopate font-bold text-white mb-2 group-hover:text-orange-500 transition-colors">
              {stat.value}<span className="text-lg md:text-xl ml-1">{stat.suffix}</span>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stats;
