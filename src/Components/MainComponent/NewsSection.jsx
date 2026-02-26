import React from 'react';

const news = [
  {
    category: 'Workflow',
    title: 'Unlock Efficiency: Streamline your inspections with InspectPro\'s all-in-one platform',
    date: 'Feature Highlight',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop'
  },
  {
    category: 'Flexibility',
    title: 'Customizable: Tailor InspectPro to fit your specific business needs',
    date: 'Platform Benefit',
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop'
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
    <section id="news" className="py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-16">
          <h2 className="text-3xl md:text-4xl font-syncopate font-bold text-white tracking-tighter uppercase">Why Teams Choose InspectPro</h2>
          <div className="hidden md:flex space-x-2">
            <button className="p-2 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-500 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="p-2 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-500 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {news.map((item, idx) => (
            <div key={idx} className="group cursor-pointer">
              <div className="relative overflow-hidden mb-6 aspect-video">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-orange-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  {item.category}
                </div>
              </div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">{item.date}</div>
              <h4 className="text-xl font-bold text-white group-hover:text-orange-500 transition-colors leading-snug mb-4">
                {item.title}
              </h4>
              <div className="flex items-center text-orange-500 font-bold uppercase tracking-widest text-[10px] group-hover:translate-x-2 transition-transform">
                Learn More
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;

