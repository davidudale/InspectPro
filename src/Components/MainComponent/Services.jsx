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
    <section id="services" className="py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-orange-500 font-bold uppercase tracking-[0.3em] text-sm mb-4">Core Capabilities</h2>
            <h3 className="text-4xl md:text-5xl font-syncopate font-bold text-white leading-tight">
              SMART TOOLS FOR <br />
              <span className="text-slate-500 italic">MODERN INSPECTIONS</span>
            </h3>
          </div>
          <button className="text-slate-400 hover:text-orange-500 flex items-center gap-3 group transition-colors uppercase tracking-widest text-sm font-bold">
            All Features
            <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, idx) => (
            <div key={idx} className="group relative h-[500px] overflow-hidden rounded-sm">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

              <div className="absolute inset-x-0 bottom-0 p-8 transform transition-transform duration-300 group-hover:-translate-y-4">
                <div className="w-16 h-16 bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500 mb-6 backdrop-blur-sm rounded-sm">
                  {service.icon}
                </div>
                <h4 className="text-2xl font-syncopate font-bold text-white mb-4">{service.title}</h4>
                <p className="text-slate-300 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {service.description}
                </p>
                <div className="mt-6 w-10 h-1 bg-orange-500 group-hover:w-24 transition-all duration-500"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

