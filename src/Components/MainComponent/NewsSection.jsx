import React from 'react';

const news = [
  {
    category: 'Workflow',
    title: 'Unlock Efficiency: Streamline your inspections with InspectPro\'s all-in-one platform',
    date: 'Feature Highlight',
    image: 'https://images.unsplash.com/photo-1622554129912-c541b2542385?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    category: 'Flexibility',
    title: 'Customizable: Tailor InspectPro to fit your specific business needs',
    date: 'Platform Benefit',
    image: 'https://images.unsplash.com/photo-1678693361474-d9aa8a7a96cc?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    category: 'Access',
    title: 'Anywhere, Anytime: Access InspectPro on any device, online or offline',
    date: 'Team Ready',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop'
  }
];

const NewsSection = () => {
  return (
    <section id="news" className="py-20 sm:py-24 lg:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5 mb-12 sm:mb-14">
          <div>
            <p className="text-orange-500 text-xs font-bold uppercase tracking-[0.24em] mb-2">Product Impact</p>
            <h2 className="text-3xl sm:text-4xl font-syncopate font-bold text-white tracking-tight uppercase">
              Why Teams Choose InspectPro
            </h2>
          </div>
          <div className="hidden md:flex space-x-2">
            <button className="p-2 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-500 transition-all rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="p-2 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-500 transition-all rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {news.map((item, idx) => (
            <article key={idx} className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/35 p-4 sm:p-5 hover:border-slate-700 transition-colors">
              <div className="relative overflow-hidden mb-5 rounded-xl aspect-video">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 bg-orange-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white rounded">
                  {item.category}
                </div>
              </div>
              <div className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-3">{item.date}</div>
              <h4 className="text-lg sm:text-xl font-bold text-white group-hover:text-orange-500 transition-colors leading-snug mb-4">
                {item.title}
              </h4>
              <div className="flex items-center text-orange-500 font-bold uppercase tracking-widest text-[10px] group-hover:translate-x-2 transition-transform">
                Learn More
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;

