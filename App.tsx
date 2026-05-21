
import React, { useState, useEffect, Suspense, Component, ErrorInfo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Track } from './pages/Track';
import { Ship } from './pages/Ship';
import { Login } from './pages/Login';
import { AIChat } from './components/AIChat';
import { storageService, isSupabaseConfigured } from './services/storage';
import { AuthState, UserRole } from './types';

const Admin = React.lazy(() => import('./pages/admin/Admin'));

class AdminErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('Admin panel error:', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-3">Admin panel error</h2>
          <p className="text-slate-600 text-sm mb-4">{this.state.error?.message || 'Something went wrong.'}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-slate-950 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, role: null });
  const [loading, setLoading] = useState(true);

  const Unauthorized: React.FC = () => (
    <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-[2rem] shadow-xl p-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 mb-4">Access denied</p>
        <h2 className="text-3xl font-black text-slate-950 mb-4">Administrator access required</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          You are signed in, but you do not have the required admin privileges for this section. Please use an administrator account.
        </p>
      </div>
    </div>
  );

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-3">Configuration Required</h1>
          <p className="text-slate-600 text-sm mb-4">
            Add <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to <code className="bg-slate-100 px-1 rounded">.env.local</code> and restart the dev server.
          </p>
          <p className="text-slate-500 text-xs">
            Copy <code className="bg-slate-100 px-1 rounded">.env.example</code> to <code className="bg-slate-100 px-1 rounded">.env.local</code> and fill in your Supabase project URL and anon key.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    storageService.getCurrentUser().then(session => {
      if (session) {
        setAuth({ isLoggedIn: true, role: session.role });
      }
      setLoading(false);
    });

    const { data: { subscription } } = storageService.onAuthStateChange((user, role) => {
      setAuth({ 
        isLoggedIn: !!user, 
        role: role 
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await storageService.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout isAdmin={auth.isLoggedIn && auth.role === UserRole.ADMIN} onLogout={handleLogout}>
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/track/:id" element={<Track />} />
            <Route path="/track" element={<Track />} />
            <Route path="/ship" element={<Ship />} />
            <Route
              path="/admin"
              element={
                auth.isLoggedIn ? (
                  auth.role === UserRole.ADMIN ? (
                    <AdminErrorBoundary>
                      <Admin role={auth.role} />
                    </AdminErrorBoundary>
                  ) : (
                    <Unauthorized />
                  )
                ) : (
                  <Login />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <AIChat />
      </Layout>
    </HashRouter>
  );
};

export default App;
