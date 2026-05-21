
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Animated Counter Component
const AnimatedCounter: React.FC<{ target: number; suffix: string; label: string }> = ({ target, suffix, label }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const duration = 2000;
            const steps = 60;
            const increment = target / steps;
            const stepDuration = duration / steps;

            let current = 0;
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                setCount(target);
                clearInterval(timer);
              } else {
                setCount(Math.floor(current));
              }
            }, stepDuration);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [target, hasAnimated]);

  return (
    <div ref={counterRef} className="text-center">
      <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-[0.2em]">
        {label}
      </div>
    </div>
  );
};

// Service Icon Components (inline SVG)
const ServiceIcon: React.FC<{ type: 'standard' | 'priority' | 'nextday' | 'freight' }> = ({ type }) => {
  const icons = {
    standard: (
      <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="10" y="18" width="44" height="32" rx="2"/>
        <path d="M22 18 L22 10 L42 10 L42 18"/>
        <circle cx="20" cy="38" r="3"/>
        <circle cx="44" cy="38" r="3"/>
        <line x1="26" y1="30" x2="38" y2="30"/>
      </svg>
    ),
    priority: (
      <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M32 6 L42 28 L32 22 L22 28 Z" fill="currentColor"/>
        <rect x="14" y="28" width="36" height="24" rx="2"/>
        <line x1="22" y1="38" x2="42" y2="38"/>
        <line x1="22" y1="44" x2="42" y2="44"/>
      </svg>
    ),
    nextday: (
      <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="32" cy="32" r="22"/>
        <path d="M32 18 L32 32 L44 40" strokeLinecap="round"/>
        <path d="M18 18 L26 18 L26 46 L18 46 Z" fill="currentColor"/>
        <path d="M38 18 L46 18 L46 46 L38 46 Z" fill="currentColor"/>
      </svg>
    ),
    freight: (
      <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="10" y="22" width="44" height="28" rx="2"/>
        <path d="M18 22 L18 14 L36 14 L36 22"/>
        <circle cx="18" cy="50" r="5" fill="currentColor"/>
        <circle cx="46" cy="50" r="5" fill="currentColor"/>
        <line x1="22" y1="32" x2="42" y2="32"/>
        <line x1="22" y1="38" x2="42" y2="38"/>
      </svg>
    )
  };
  return icons[type];
};

export const Home: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/track/${trackingNumber.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="overflow-x-hidden">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @keyframes route-flow {
          0% {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-dot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.15);
          }
        }
        
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .route-flow {
          stroke-dasharray: 1000;
          animation: route-flow 4s ease-out forwards;
        }
        
        .fade-in-up {
          animation: fade-in-up 0.9s ease-out forwards;
        }
        
        .pulse-dot {
          animation: pulse-dot 2.5s ease-in-out infinite;
        }
        
        .slide-in-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }
      `}</style>

      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white">
        {/* Subtle animated route line */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
            <path
              d="M 80 450 Q 350 250, 600 350 T 1200 400 T 1360 450"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="4"
              className="route-flow"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="max-w-6xl">
            {/* Headline - Oversized, one word in accent */}
            <h1 
              className="text-7xl sm:text-8xl md:text-9xl lg:text-[120px] font-black leading-[0.85] mb-10 text-slate-950 tracking-tighter"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="block">WORLDWIDE</span>
              <span className="block">
                <span className="text-amber-600">LOGISTICS</span>
                <span className="text-slate-950">.</span>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl md:text-3xl text-slate-600 mb-14 max-w-3xl font-medium leading-relaxed">
              Ship, track, and manage deliveries across 180+ countries with precision and reliability.
            </p>

            {/* Large Tracking Search Bar */}
            <div className="mb-10 fade-in-up">
              <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-4 max-w-3xl">
                <input
                  type="text"
                  placeholder="Enter tracking number"
                  className="flex-grow px-10 py-7 rounded-none border-3 border-slate-950 focus:border-amber-600 focus:ring-0 outline-none text-slate-950 bg-white uppercase tracking-wider text-base font-bold placeholder:text-slate-400 transition-all shadow-[10px_10px_0_0_rgba(15,23,42,0.08)] hover:shadow-[14px_14px_0_0_rgba(15,23,42,0.12)]"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  required
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-14 py-7 rounded-none text-base font-black uppercase tracking-wider transition-all shadow-[10px_10px_0_0_rgba(15,23,42,0.15)] hover:shadow-[14px_14px_0_0_rgba(15,23,42,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-[6px_6px_0_0_rgba(15,23,42,0.15)]"
                >
                  Track
                </button>
              </form>
              
              {/* Trust Text with Pulse Dot */}
              <div className="flex items-center gap-3 mt-8 text-base text-slate-500">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-full pulse-dot"></span>
                <span className="font-medium">Track any NextExpress shipment in real-time</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="bg-slate-950 text-white py-14 md:py-18 border-y-4 border-amber-600">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
            <AnimatedCounter target={50000} suffix="+" label="Shipments" />
            <AnimatedCounter target={99} suffix=".2%" label="On-Time" />
            <AnimatedCounter target={180} suffix="+" label="Countries" />
            <div className="text-center col-span-2 md:col-span-1">
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                24/7
              </div>
              <div className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-[0.2em]">
                Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES - Editorial Layout */}
      <section className="py-28 md:py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <h2 
            className="text-6xl md:text-8xl font-black text-slate-950 mb-20 md:mb-28 tracking-tighter"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CHOOSE YOUR<br className="md:hidden" /> SPEED
          </h2>

          {/* Full-width alternating rows */}
          <div className="space-y-16 md:space-y-24">
            {/* Service 1 - Left aligned */}
            <div className="group border-t-4 border-slate-950 pt-12 md:pt-16 pb-12 md:pb-16 flex flex-col md:flex-row md:items-center gap-12 md:gap-16 hover:bg-slate-50 transition-colors duration-300">
              <div className="flex-1">
                <div className="flex items-start gap-6 mb-6">
                  <div className="text-amber-600 flex-shrink-0">
                    <ServiceIcon type="standard" />
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-950 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      Standard Global
                    </h3>
                    <p className="text-amber-600 font-bold text-base uppercase tracking-wider mb-4">7-14 Days</p>
                    <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl">
                      Cost-effective international shipping with reliable transit times. Ideal for standard business shipments and personal packages.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/ship" 
                  className="inline-flex items-center gap-3 text-slate-950 font-bold uppercase tracking-wider text-sm hover:text-amber-600 transition-colors group-hover:gap-5"
                >
                  Ship Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Service 2 - Right aligned */}
            <div className="group border-t-4 border-amber-600 pt-12 md:pt-16 pb-12 md:pb-16 flex flex-col md:flex-row-reverse md:items-center gap-12 md:gap-16 hover:bg-slate-50 transition-colors duration-300">
              <div className="flex-1 md:text-right">
                <div className="flex items-start gap-6 mb-6 md:flex-row-reverse">
                  <div className="text-amber-600 flex-shrink-0">
                    <ServiceIcon type="priority" />
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-950 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      Priority Express
                    </h3>
                    <p className="text-amber-600 font-bold text-base uppercase tracking-wider mb-4">3-5 Days</p>
                    <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl md:ml-auto">
                      Expedited delivery for time-sensitive packages. Priority handling, customs clearance, and dedicated tracking.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/ship" 
                  className="inline-flex items-center gap-3 text-slate-950 font-bold uppercase tracking-wider text-sm hover:text-amber-600 transition-colors group-hover:gap-5 md:ml-auto md:flex-row-reverse"
                >
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Ship Now
                </Link>
              </div>
            </div>

            {/* Service 3 - Left aligned */}
            <div className="group border-t-4 border-slate-950 pt-12 md:pt-16 pb-12 md:pb-16 flex flex-col md:flex-row md:items-center gap-12 md:gap-16 hover:bg-slate-50 transition-colors duration-300">
              <div className="flex-1">
                <div className="flex items-start gap-6 mb-6">
                  <div className="text-amber-600 flex-shrink-0">
                    <ServiceIcon type="nextday" />
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-950 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      Next Day Air
                    </h3>
                    <p className="text-amber-600 font-bold text-base uppercase tracking-wider mb-4">1 Day</p>
                    <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl">
                      Urgent delivery guaranteed within 24 hours. Premium service for critical shipments requiring immediate attention.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/ship" 
                  className="inline-flex items-center gap-3 text-slate-950 font-bold uppercase tracking-wider text-sm hover:text-amber-600 transition-colors group-hover:gap-5"
                >
                  Ship Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Service 4 - Right aligned */}
            <div className="group border-t-4 border-amber-600 pt-12 md:pt-16 pb-12 md:pb-16 flex flex-col md:flex-row-reverse md:items-center gap-12 md:gap-16 hover:bg-slate-50 transition-colors duration-300">
              <div className="flex-1 md:text-right">
                <div className="flex items-start gap-6 mb-6 md:flex-row-reverse">
                  <div className="text-amber-600 flex-shrink-0">
                    <ServiceIcon type="freight" />
                  </div>
                  <div>
                    <h3 className="text-4xl md:text-5xl font-black text-slate-950 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      Freight Logistics
                    </h3>
                    <p className="text-amber-600 font-bold text-base uppercase tracking-wider mb-4">Custom</p>
                    <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-2xl md:ml-auto">
                      Tailored solutions for large-scale shipments. Custom routing, dedicated handling, and specialized logistics support.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/ship" 
                  className="inline-flex items-center gap-3 text-slate-950 font-bold uppercase tracking-wider text-sm hover:text-amber-600 transition-colors group-hover:gap-5 md:ml-auto md:flex-row-reverse"
                >
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Ship Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS - Flowing Connected Layout */}
      <section className="py-28 md:py-40 bg-slate-50 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, #0f172a 0, #0f172a 1px, transparent 0, transparent 50px)`,
          backgroundSize: '50px 50px'
        }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <h2 
            className="text-6xl md:text-8xl font-black text-slate-950 mb-20 md:mb-28 tracking-tighter"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            HOW IT WORKS
          </h2>

          {/* Flowing connected layout */}
          <div className="relative">
            {/* Connecting flow line - desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-slate-200 transform -translate-y-1/2 z-0">
              <div className="h-full bg-amber-600 transition-all duration-1000" style={{ width: '66%' }}></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 relative z-10">
              {/* Step 1 - Ship */}
              <div className="slide-in-left">
                <div className="bg-white border-4 border-slate-950 p-10 md:p-12 shadow-[16px_16px_0_0_rgba(15,23,42,0.08)]">
                  <div className="text-7xl md:text-8xl font-black text-amber-600 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                    01
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-950 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                    Ship
                  </h3>
                  <p className="text-slate-600 text-lg md:text-xl leading-relaxed">
                    Create your shipment request. We handle pickup, packaging, and all documentation.
                  </p>
                </div>
              </div>

              {/* Step 2 - Track (accent) */}
              <div className="slide-in-left" style={{ animationDelay: '0.2s' }}>
                <div className="bg-amber-600 border-4 border-slate-950 p-10 md:p-12 shadow-[16px_16px_0_0_rgba(15,23,42,0.08)] text-white">
                  <div className="text-7xl md:text-8xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                    02
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                    Track
                  </h3>
                  <p className="text-amber-50 text-lg md:text-xl leading-relaxed">
                    Monitor your shipment in real-time. Get updates at every checkpoint, anywhere in the world.
                  </p>
                </div>
              </div>

              {/* Step 3 - Deliver */}
              <div className="slide-in-left" style={{ animationDelay: '0.4s' }}>
                <div className="bg-white border-4 border-slate-950 p-10 md:p-12 shadow-[16px_16px_0_0_rgba(15,23,42,0.08)]">
                  <div className="text-7xl md:text-8xl font-black text-amber-600 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                    03
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-950 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                    Deliver
                  </h3>
                  <p className="text-slate-600 text-lg md:text-xl leading-relaxed">
                    Receive confirmation and proof of delivery. Your package arrives safely, on time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST - Masonry Trust Grid */}
      <section className="py-28 md:py-40 bg-white relative">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle, #0f172a 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <h2 
            className="text-6xl md:text-8xl font-black text-slate-950 mb-20 md:mb-28 tracking-tighter"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            WHY NEXTEXPRESS
          </h2>

          {/* Masonry grid with varying sizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Large testimonial card */}
            <div className="lg:col-span-2 lg:row-span-2 bg-slate-950 text-white p-12 md:p-20 border-4 border-amber-600">
              <div className="text-7xl md:text-8xl font-black text-amber-600 mb-8" style={{ fontFamily: 'var(--font-display)' }}>"</div>
              <blockquote className="text-3xl md:text-4xl font-bold mb-8 leading-relaxed">
                NextExpress transformed our supply chain. Real-time tracking across 40 countries. Zero delays in six months of operations.
              </blockquote>
              <div className="text-amber-200 font-bold uppercase tracking-wider text-sm">
                — Global Manufacturing Corp
              </div>
            </div>

            {/* Medium cards */}
            <div className="bg-slate-50 border-4 border-slate-950 p-10 md:p-12">
              <h3 className="text-2xl md:text-3xl font-black text-slate-950 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Real-Time Tracking
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Every checkpoint, every movement. Know exactly where your shipment is, 24/7.
              </p>
            </div>

            <div className="bg-amber-600 border-4 border-slate-950 p-10 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                AI-Powered Updates
              </h3>
              <p className="text-amber-50 text-lg leading-relaxed">
                Intelligent notifications keep you informed. No surprises, just clarity.
              </p>
            </div>

            <div className="bg-slate-50 border-4 border-slate-950 p-10 md:p-12">
              <h3 className="text-2xl md:text-3xl font-black text-slate-950 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Global Coverage
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                180+ countries. One network. Seamless cross-border logistics.
              </p>
            </div>

            <div className="bg-slate-950 border-4 border-amber-600 p-10 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Customs Clearance
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                Expert handling of documentation. We navigate regulations so you don't have to.
              </p>
            </div>

            <div className="bg-slate-50 border-4 border-slate-950 p-10 md:p-12">
              <h3 className="text-2xl md:text-3xl font-black text-slate-950 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Proof of Delivery
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                Digital signatures, photo confirmation. Complete delivery verification.
              </p>
            </div>

            <div className="bg-amber-600 border-4 border-slate-950 p-10 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                24/7 Support
              </h3>
              <p className="text-amber-50 text-lg leading-relaxed">
                Round-the-clock assistance. When you need help, we're there.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA SECTION */}
      <section className="bg-slate-950 text-white py-28 md:py-40 border-y-4 border-amber-600">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 
            className="text-6xl md:text-8xl font-black mb-12 md:mb-16 tracking-tighter"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            READY TO SHIP?
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link
              to="/ship"
              className="bg-amber-600 hover:bg-amber-700 text-white px-14 py-7 rounded-none text-base font-black uppercase tracking-wider transition-all shadow-[10px_10px_0_0_rgba(245,158,11,0.3)] hover:shadow-[14px_14px_0_0_rgba(245,158,11,0.4)] active:translate-x-1 active:translate-y-1 active:shadow-[6px_6px_0_0_rgba(245,158,11,0.3)]"
            >
              Send a Package
            </Link>
            <Link
              to="/track"
              className="bg-transparent border-3 border-white text-white hover:bg-white hover:text-slate-950 px-14 py-7 rounded-none text-base font-black uppercase tracking-wider transition-all"
            >
              Track Shipment
            </Link>
          </div>

          {/* Tracking Input */}
          <form onSubmit={handleTrack} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter tracking number"
              className="flex-grow px-10 py-6 rounded-none border-3 border-white bg-transparent text-white placeholder:text-slate-400 focus:border-amber-600 focus:ring-0 outline-none uppercase tracking-wider text-base font-bold"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white px-14 py-6 rounded-none text-base font-black uppercase tracking-wider transition-all"
            >
              Track
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
