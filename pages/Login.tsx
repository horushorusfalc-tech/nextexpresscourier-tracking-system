import React, { useState } from 'react';
import { storageService } from '../services/storage';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await storageService.signIn(email, password);
    } catch (err: any) {
      console.error("Login failure:", err);
      setError(err.message || 'AUTHENTICATION FAILED');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 relative overflow-hidden">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }

        @keyframes route-flow {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        .fade-in-up {
          animation: fade-in-up 0.7s ease-out forwards;
        }

        .pulse-dot {
          animation: pulse-ring 2.5s ease-in-out infinite;
        }

        .route-flow {
          stroke-dasharray: 1000;
          animation: route-flow 4s ease-out forwards;
        }
      `}</style>

      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <path d="M 80 450 Q 350 250, 600 350 T 1200 400 T 1360 450" fill="none" stroke="#f59e0b" strokeWidth="4" className="route-flow" />
        </svg>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-12 fade-in-up">
          <div className="inline-block mb-8">
            <img src="/logo.png" alt="NextExpress Logo" className="h-28 w-auto mx-auto" />
          </div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-3">Secure Access Portal</p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 mb-4 uppercase tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
            Portal Access
          </h2>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.25em]">Infrastructure Entry Point</p>
        </div>

        {/* Trust indicator */}
        <div className="flex items-center justify-center gap-2 mb-10 fade-in-up" style={{ animationDelay: '0.1s' }}>
          <span className="w-2 h-2 bg-amber-600 rounded-full pulse-dot"></span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encrypted Connection</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Work Email</label>
            <input
              type="email"
              placeholder="operations@nextexpress.com"
              className="w-full px-8 py-5 rounded-[3rem] border-2 border-slate-200 bg-white text-slate-950 text-sm font-bold focus:border-amber-600 focus:ring-0 outline-none transition-all placeholder:text-slate-300 shadow-[6px_6px_0_0_rgba(15,23,42,0.05)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Credential Key</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-8 py-5 rounded-[3rem] border-2 border-slate-200 bg-white text-slate-950 text-sm font-bold focus:border-amber-600 focus:ring-0 outline-none transition-all placeholder:text-slate-300 shadow-[6px_6px_0_0_rgba(15,23,42,0.05)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-[3rem] animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-relaxed text-center">
                {error}
              </p>
              {error.includes('relation') && (
                <p className="mt-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">
                  Database Schema mismatch detected. Please check Supabase tables.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-950 hover:bg-black text-white py-6 rounded-[3rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-[8px_8px_0_0_rgba(15,23,42,0.15)] hover:shadow-[12px_12px_0_0_rgba(15,23,42,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[6px_6px_0_0_rgba(15,23,42,0.1)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden mt-8"
          >
            <span className="relative z-10">{isSubmitting ? 'Verifying Identity...' : 'Authorize Session'}</span>
            {isSubmitting && (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center rounded-[3rem]">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-16 pt-10 border-t border-slate-100 text-center fade-in-up" style={{ animationDelay: '0.25s' }}>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Access is strictly governed by corporate security policy.<br />Unauthorized entry attempts will be investigated.
          </p>
        </div>

        {/* Security badge */}
        <div className="mt-8 text-center fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="inline-flex items-center gap-2 text-[8px] text-slate-300 font-bold uppercase tracking-widest">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};
