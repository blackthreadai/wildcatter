'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  return (
    <div className="min-h-screen text-gray-200 antialiased relative">
      {/* Animated dark gradient background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(-45deg, #0a0a0a, #110f08, #0a0a0a, #0d0b06, #0a0a0a, #12100a, #080808, #0f0c07, #0a0a0a, #0e0c08, #080808, #0a0a0a)',
          backgroundSize: '600% 600%',
          animation: 'gradientShift 30s ease infinite',
        }}
      />
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-4 bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 border-[1.5px] border-[#DAA520] rounded-md flex items-center justify-center text-[#DAA520] font-bold text-base">W</div>
          <span className="text-[14px] font-light tracking-[2.8px] uppercase text-[#DAA520]">Wildcatter</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#products" className="text-[13px] tracking-[1px] uppercase text-gray-500 hover:text-gray-200 transition-colors">Products</a>
          <a href="#pricing" className="text-[13px] tracking-[1px] uppercase text-gray-500 hover:text-gray-200 transition-colors">Pricing</a>
          <a href="#contact" className="text-[13px] tracking-[1px] uppercase text-gray-500 hover:text-gray-200 transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/login')}
            className="text-[13px] tracking-[1px] uppercase text-gray-500 hover:text-gray-200 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/register')}
            className="px-6 py-2 border border-[#DAA520] rounded-md text-[#DAA520] text-xs tracking-[1.5px] uppercase font-medium hover:bg-[#DAA520] hover:text-[#0a0a0a] transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center text-center px-6 pt-[100px] pb-0 relative" style={{ justifyContent: 'start', paddingTop: 'calc(50vh - 200px)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(218,165,32,0.06) 0%, transparent 70%)' }} />
        <div className="text-[10px] font-medium tracking-[3px] uppercase text-[#DAA520] border border-[#DAA520]/30 rounded-full px-5 py-1.5 mb-10 relative">
          YOUR EDGE IS IN THE DATA
        </div>
        <h1 className="text-[48px] font-extralight tracking-[3px] text-white leading-[1.15] mb-5 relative whitespace-nowrap">
          Energy intelligence. <span className="text-[#DAA520] font-light">Delivered.</span>
        </h1>
        <p className="text-lg font-light text-gray-500 max-w-[560px] mb-12 tracking-[0.5px] relative">
          Real-time energy data, operational tools, and market intelligence built for professionals who move fast.
        </p>
        <div className="flex gap-4 relative">
          <button
            onClick={() => router.push('/register')}
            className="px-10 py-3.5 bg-[#DAA520] text-[#0a0a0a] rounded-lg text-[13px] font-semibold tracking-[2px] uppercase hover:bg-[#c4941c] transition-all"
          >
            Get Started
          </button>
          <a
            href="#products"
            className="px-10 py-3.5 border border-gray-700 text-gray-200 rounded-lg text-[13px] tracking-[2px] uppercase hover:border-gray-500 transition-all"
          >
            View Products
          </a>
        </div>

        {/* Stats - bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-16 py-10 border-t border-b border-white/[0.06]">
          {[
            { num: '4', label: 'Independent Apps' },
            { num: '24/7', label: 'Real-Time Updates' },
            { num: '1 MILLION+', label: 'Energy Industry Assets' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-extralight text-[#DAA520] tracking-[2px]">{s.num}</div>
              <div className="text-[11px] text-gray-600 tracking-[2px] uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="py-24 px-12 max-w-[1100px] mx-auto">
        <div className="text-[10px] font-medium tracking-[3px] uppercase text-[#DAA520] mb-4">Products</div>
        <h2 className="text-[40px] font-extralight tracking-[4px] uppercase text-white mb-4">Four apps, one platform</h2>
        <p className="text-base font-light text-gray-500 max-w-[520px] mb-12">
          Everything you need to monitor, analyze, trade, and operate in energy markets.
        </p>

        <div className="grid grid-cols-2 gap-5">
          {/* Terminal - Featured */}
          <div className="col-span-2 bg-[#111] border border-[#DAA520]/35 rounded-[14px] p-9">
            <div className="flex gap-12 items-center">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-[10px] border-[1.5px] border-[#DAA520] flex items-center justify-center text-xl font-bold text-[#DAA520] mb-5">W</div>
                <div className="text-base font-light tracking-[2.8px] uppercase text-[#DAA520] mb-2">Energy Terminal</div>
                <p className="text-sm font-light text-gray-500 mb-4 leading-relaxed">
                  Real-time energy markets dashboard. 27 live modules covering crude, natural gas, renewables, metals, crypto, geopolitics, and prediction markets.
                </p>
                <div className="text-[13px] text-[#DAA520]">Free with every account</div>
              </div>
              <div className="flex-1 h-[280px] bg-[#171717] rounded-[10px] border border-gray-800 overflow-hidden p-4">
                <div className="grid grid-cols-3 gap-2 h-full">
                  {[
                    { title: 'WTI Crude', w: '80%' },
                    { title: 'Nat Gas', w: '65%' },
                    { title: 'OPEC+', w: '90%' },
                    { title: 'News', w: '45%' },
                    { title: 'Sanctions', w: '70%' },
                    { title: 'Rig Count', w: '50%' },
                  ].map((m, i) => (
                    <div key={i} className="bg-[#1e1e1e] rounded-md p-2.5 border border-gray-800">
                      <div className="text-[8px] tracking-[1.5px] uppercase text-[#DAA520] mb-1.5">{m.title}</div>
                      <div className="h-[3px] rounded-full mb-1" style={{ background: 'rgba(218,165,32,0.4)', width: m.w }} />
                      <div className="h-[3px] bg-gray-700 rounded-full mb-1 w-[60%]" />
                      <div className="h-[3px] bg-gray-700 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence */}
          <div className="bg-[#111] border border-white/[0.07] rounded-[14px] p-9 hover:border-gray-700 transition-colors">
            <div className="w-11 h-11 rounded-[10px] border-[1.5px] border-[#DAA520] flex items-center justify-center text-xl font-bold text-[#DAA520] mb-5">W</div>
            <div className="text-base font-light tracking-[2.8px] uppercase text-[#DAA520] mb-2">Energy Intelligence</div>
            <p className="text-sm font-light text-gray-500 mb-4 leading-relaxed">
              Deep energy industry data aggregation. Basin analytics, operator profiles, production data, and competitive intelligence.
            </p>
            <div className="text-[13px] text-[#DAA520]">$19/month</div>
          </div>

          {/* Exchange */}
          <div className="bg-[#111] border border-white/[0.07] rounded-[14px] p-9 opacity-60">
            <div className="w-11 h-11 rounded-[10px] border-[1.5px] border-gray-700 flex items-center justify-center text-xl font-bold text-gray-700 mb-5">W</div>
            <div className="text-base font-light tracking-[2.8px] uppercase text-gray-600 mb-2">Energy Exchange</div>
            <p className="text-sm font-light text-gray-500 mb-4 leading-relaxed">
              Deal flow manager powered by intelligence. Source, evaluate, and close energy deals with integrated market data.
            </p>
            <div className="text-[10px] tracking-[2px] uppercase text-gray-600">Coming Soon</div>
          </div>

          {/* Operations - full width */}
          <div className="col-span-2 bg-[#111] border border-white/[0.07] rounded-[14px] p-9 opacity-60">
            <div className="w-11 h-11 rounded-[10px] border-[1.5px] border-gray-700 flex items-center justify-center text-xl font-bold text-gray-700 mb-5">W</div>
            <div className="text-base font-light tracking-[2.8px] uppercase text-gray-600 mb-2">Energy Operations</div>
            <p className="text-sm font-light text-gray-500 mb-4 leading-relaxed max-w-[520px]">
              Field operations management. Track assets, coordinate crews, monitor production, and manage compliance from one dashboard.
            </p>
            <div className="text-[10px] tracking-[2px] uppercase text-gray-600">Coming Soon</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-12 max-w-[800px] mx-auto border-t border-white/[0.06] text-center">
        <div className="text-[10px] font-medium tracking-[3px] uppercase text-[#DAA520] mb-4">Pricing</div>
        <h2 className="text-[40px] font-extralight tracking-[4px] uppercase text-white mb-12">Start free, scale when ready</h2>

        <div className="grid grid-cols-2 gap-5">
          {/* Free */}
          <div className="p-10 bg-[#111] border border-white/[0.07] rounded-[14px] text-left">
            <div className="text-xs tracking-[2.5px] uppercase text-gray-500 mb-4">Terminal</div>
            <div className="text-5xl font-extralight text-white mb-1">$0 <span className="text-base text-gray-600 font-normal">/month</span></div>
            <div className="text-[13px] text-gray-600 mb-7">Free forever</div>
            <ul className="space-y-0">
              {['27 live data modules', 'Real-time energy prices', 'OPEC+ production monitor', 'Prediction markets', 'AI price forecasts', 'Interactive world map'].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] text-gray-400 py-2 border-b border-white/[0.04]">
                  <span className="w-1 h-1 rounded-full bg-[#DAA520] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/register')}
              className="block w-full mt-7 py-3.5 rounded-lg text-xs font-medium tracking-[2px] uppercase text-gray-200 border border-gray-700 hover:border-gray-500 transition-all text-center"
            >
              Get Started
            </button>
          </div>

          {/* Pro */}
          <div className="p-10 bg-[#111] border border-[#DAA520]/40 rounded-[14px] text-left">
            <div className="text-xs tracking-[2.5px] uppercase text-gray-500 mb-4">Terminal + Intelligence</div>
            <div className="text-5xl font-extralight text-white mb-1">$19 <span className="text-base text-gray-600 font-normal">/month</span></div>
            <div className="text-[13px] text-gray-600 mb-7">Everything in Terminal, plus</div>
            <ul className="space-y-0">
              {['Basin-level analytics', 'Operator profiles and rankings', 'Production data aggregation', 'Competitive intelligence', 'Custom data exports', 'Priority support'].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] text-gray-400 py-2 border-b border-white/[0.04]">
                  <span className="w-1 h-1 rounded-full bg-[#DAA520] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/register')}
              className="block w-full mt-7 py-3.5 rounded-lg text-xs font-semibold tracking-[2px] uppercase bg-[#DAA520] text-[#0a0a0a] hover:bg-[#c4941c] transition-all text-center"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-28 px-12 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(218,165,32,0.05) 0%, transparent 70%)' }} />
        <h2 className="text-4xl font-extralight tracking-[6px] uppercase text-white mb-4 relative">See it live</h2>
        <p className="text-base text-gray-500 font-light mb-10 relative">The Terminal is free. No credit card. No trial period. Just data.</p>
        <button
          onClick={() => router.push('/terminal')}
          className="px-10 py-3.5 bg-[#DAA520] text-[#0a0a0a] rounded-lg text-[13px] font-semibold tracking-[2px] uppercase hover:bg-[#c4941c] transition-all relative"
        >
          Open Terminal
        </button>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto">
          <div className="text-[10px] font-medium tracking-[3px] uppercase text-[#DAA520] mb-4 text-center">Contact</div>
          <h2 className="text-[40px] font-extralight tracking-[4px] uppercase text-white mb-4 text-center">Get in touch</h2>
          <p className="text-base font-light text-gray-500 text-center mb-12">
            Questions, partnerships, or enterprise inquiries. We&apos;ll get back to you within 24 hours.
          </p>

          {contactSent ? (
            <div className="text-center py-16">
              <div className="text-[#DAA520] text-lg font-light mb-2">Message sent.</div>
              <p className="text-sm text-gray-500">We&apos;ll be in touch shortly.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: wire to API endpoint
                setContactSent(true);
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] tracking-[2px] uppercase text-gray-500 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-[#111] border border-white/[0.07] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#DAA520]/50 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[2px] uppercase text-gray-500 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-[#111] border border-white/[0.07] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#DAA520]/50 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] uppercase text-gray-500 mb-2">Company</label>
                <input
                  type="text"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="w-full bg-[#111] border border-white/[0.07] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#DAA520]/50 transition-colors"
                  placeholder="Company name (optional)"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] uppercase text-gray-500 mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full bg-[#111] border border-white/[0.07] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#DAA520]/50 transition-colors resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-[#DAA520] text-[#0a0a0a] rounded-lg text-xs font-semibold tracking-[2px] uppercase hover:bg-[#c4941c] transition-all"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex justify-between items-center px-12 py-8 border-t border-white/[0.06]">
        <p className="text-xs text-white/40">&copy; 2026 Wildcatter, LLC. All Rights Reserved.</p>
        <div className="flex gap-6">
          {['Terms', 'Privacy', 'Contact'].map((l, i) => (
            <a key={i} href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
