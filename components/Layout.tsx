
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin: boolean;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isAdmin, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Send Item', path: '/ship' },
    { name: 'Tracking', path: '/track' },
    { name: isAdmin ? 'Admin Dashboard' : 'FLP', path: '/admin' }
  ];

  const handleLogoutClick = () => {
    onLogout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center group" onClick={() => setIsMobileMenuOpen(false)}>
            <img src="/logo.png" alt="NextExpress Logo" className="h-16 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                  location.pathname === link.path ? 'text-slate-950 border-b-2 border-slate-950 pb-1' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {link.name}
              </Link>
            ))}
            {isAdmin && (
              <button 
                onClick={handleLogoutClick} 
                className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
              >
                Secure Logout
              </button>
            )}
          </nav>

          <button 
            className="md:hidden p-2 text-slate-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col p-8 space-y-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`text-xs font-black uppercase tracking-[0.2em] ${
                    location.pathname === link.path ? 'text-slate-950' : 'text-slate-500'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {isAdmin && (
                <button 
                  onClick={handleLogoutClick} 
                  className="text-left text-xs font-black uppercase tracking-[0.2em] text-rose-600"
                >
                  Secure Logout
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-8">
            <div className="space-y-6">
              <img src="/logo.png" alt="NextExpress Logo" className="h-14 w-auto object-contain brightness-0 grayscale opacity-80 hover:opacity-100 transition-all" />
              <p className="text-slate-600 text-sm leading-relaxed max-w-xs font-medium">
                Refining global logistics through precision technology and elite infrastructure. NextExpressCourier ensures your assets cross borders seamlessly.
              </p>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] mb-8">Service</h4>
              <ul className="space-y-4 text-[13px] text-slate-600 font-bold uppercase tracking-wider">
                <li><Link to="/track" className="hover:text-slate-950 transition-colors">Track Package</Link></li>
                <li><Link to="/ship" className="hover:text-slate-950 transition-colors">Dispatch Request</Link></li>
                <li><Link to="/admin" className="hover:text-slate-950 transition-colors">FLP</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] mb-8">Global Connect</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10">
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Email Support</span>
                    <span className="text-[13px] text-slate-950 font-black break-all">nextexpresscourie@zohomail.com</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Australia HQ</span>
                    <span className="text-[14px] text-slate-950 font-black">+61 488 293 104</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Dubai Hub</span>
                    <span className="text-[14px] text-slate-950 font-black">+971 50 492 8173</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">United Kingdom HQ</span>
                    <span className="text-[14px] text-slate-950 font-black">+44 7700 900 482</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">US Hub</span>
                    <span className="text-[14px] text-slate-950 font-black">+1 720 538 4396</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Global Operations</span>
                    <span className="text-[14px] text-slate-950 font-black">24/7 Live Dispatch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-20 pt-10 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
              &copy; {new Date().getFullYear()} NEXTEXPRESS COURIER SERVICES LTD. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
