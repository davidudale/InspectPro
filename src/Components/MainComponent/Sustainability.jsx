import React from 'react';
import wind from '../../assets/wind.jpg';

const Sustainability = () => {
  return (
    <section id="sustainability" className="py-32 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[40%] h-full opacity-10">
        <img
          src={wind}
          alt="Compliance and safety overview"
          className="w-full h-full object-cover grayscale"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-orange-500 font-bold uppercase tracking-[0.3em] text-sm mb-4">Compliance & Safety</h2>
            <h3 className="text-4xl md:text-5xl font-syncopate font-bold text-white mb-8 leading-tight">
              BUILT FOR <br />
              <span className="text-orange-500">ACCURATE EXECUTION</span>
            </h3>
            <p className="text-slate-300 text-lg leading-relaxed mb-10">
              Tailor InspectPro to fit your specific business needs, standardize
              field operations, and keep every audit trail complete from first
              check to final sign-off.
            </p>

            <div className="space-y-6">
              {[
                'Increase Accuracy: Reduce errors and ensure compliance with our intuitive platform',
                'Enhance Safety: Identify risks and take proactive measures with advanced analytics',
                'Simplify Compliance: Stay on top of regulations and standards with expert guidance',
                'Data-Driven Decisions: Turn inspection data into actionable insights for growth'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-6 h-6 border border-orange-500 flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-500"></div>
                  </div>
                  <span className="text-slate-100 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <button className="mt-12 px-8 py-4 bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold uppercase tracking-widest transition-all">
              Talk to a Specialist
            </button>
          </div>

          <div className="relative group">
            <div className="absolute -inset-4 bg-orange-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full"></div>
            <div className="relative glass-effect p-2 rounded-sm transform hover:rotate-1 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1594818378824-766485bcd33b?q=80&w=2070&auto=format&fit=crop"
                alt="Inspection analytics dashboard"
                className="w-full rounded-sm"
              />
              <div className="absolute -bottom-8 -left-8 bg-slate-950 p-6 border-l-4 border-orange-500 shadow-2xl max-w-xs">
                <p className="text-orange-500 font-syncopate font-bold text-xl mb-1">Real-time</p>
                <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Reporting Across Every Inspection Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Sustainability;

