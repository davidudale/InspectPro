import React from 'react';

const services = [
  {
    title: 'Go Digital',
    description: 'Ditch paperwork and automate your inspection process with smart forms, guided workflows, and centralized records.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1887&auto=format&fit=crop',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    title: 'Real-time Reporting',
    description: 'Get instant insights and take action on inspection results as soon as they are submitted in the field.',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    title: 'Seamless Integration',
    description: 'Connect InspectPro with your existing systems for a smooth workflow across operations, compliance, and leadership teams.',
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1975&auto=format&fit=crop',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }
];

const Services = () => {
  return (
    <section id="services" className="py-20 sm:py-24 lg:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 sm:mb-14">
          <div className="max-w-3xl">
            <h2 className="text-orange-500 font-bold uppercase tracking-[0.28em] text-xs sm:text-sm mb-3">
              Core Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-syncopate font-bold text-white leading-[1.05]">
              SMART TOOLS FOR
              <span className="block text-slate-300">MODERN INSPECTIONS</span>
            </h3>
          </div>
          <button className="self-start lg:self-auto text-slate-300 hover:text-orange-400 flex items-center gap-2 group transition-colors uppercase tracking-[0.18em] text-[11px] font-bold">
            Explore Features
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {services.map((service, idx) => (
            <article
              key={idx}
              className="group relative min-h-[360px] sm:min-h-[420px] overflow-hidden rounded-2xl border border-slate-800/80 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
            >
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/5" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-600/20 border border-orange-500/40 rounded-xl flex items-center justify-center text-orange-400 mb-4 backdrop-blur-sm">
                  {service.icon}
                </div>
                <h4 className="text-xl sm:text-2xl font-syncopate font-bold text-white mb-2">
                  {service.title}
                </h4>
                <p className="text-slate-200/90 text-sm leading-relaxed">
                  {service.description}
                </p>
                <div className="mt-4 w-10 h-1 bg-orange-500 group-hover:w-20 transition-all duration-500" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

