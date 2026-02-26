import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-4">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 bg-orange-600 rounded-sm flex items-center justify-center transform rotate-45">
                <div className="w-3 h-3 bg-white rounded-full -rotate-45"></div>
              </div>
              <span className="text-2xl font-syncopate font-bold tracking-tighter text-white">
                InspectPro<span className="text-orange-500">.</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-sm">
              All-in-one inspection platform built to digitize field operations,
              improve safety, and simplify compliance across every site.
            </p>
            <div className="flex space-x-4">
              {['Twitter', 'LinkedIn', 'YouTube'].map(social => (
                <a key={social} href="#" className="w-10 h-10 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-orange-500 hover:text-orange-500 transition-all">
                  <span className="sr-only">{social}</span>
                  <div className="w-5 h-5 bg-current opacity-50"></div>
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h5 className="text-white font-syncopate font-bold text-xs uppercase tracking-[0.2em] mb-8">Navigation</h5>
            <ul className="space-y-4">
              {['Home', 'Features', 'Compliance', 'Pricing', 'About Us'].map(link => (
                <li key={link}><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{link}</a></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h5 className="text-white font-syncopate font-bold text-xs uppercase tracking-[0.2em] mb-8">Use Cases</h5>
            <ul className="space-y-4">
              {['Site Inspections', 'Safety Audits', 'Asset Checks', 'QA Reviews', 'Compliance Walkthroughs'].map(link => (
                <li key={link}><a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">{link}</a></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h5 className="text-white font-syncopate font-bold text-xs uppercase tracking-[0.2em] mb-8">Stay Informed</h5>
            <p className="text-slate-400 text-sm mb-6">Get product updates, implementation tips, and compliance insights.</p>
            <form className="flex">
              <input
                type="email"
                placeholder="Work Email"
                className="flex-grow bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
              />
              <button className="bg-orange-600 px-6 py-3 text-white font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-colors">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-medium">
            (c) 2026 InspectPro. All Rights Reserved.
          </p>
          <p className="text-slate-500 justify-center text-xs font-medium">
            Powered by InspectPro Technologies.
          </p>

          <div className="flex space-x-8">
            <a href="#" className="text-slate-500 hover:text-white transition-colors text-xs font-medium">Privacy Policy</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors text-xs font-medium">Terms of Service</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors text-xs font-medium">Contact Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
