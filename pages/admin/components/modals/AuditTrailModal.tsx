import React, { useEffect, useRef } from 'react';
import { useAdmin } from '../../AdminContext';

interface AuditTrailModalProps {
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ onClose }) => {
  const { state } = useAdmin();
  const closeRef = useRef<HTMLButtonElement>(null);
  const s = state.selectedShipment;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!s) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="audit-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-8 border-b-2 border-slate-100">
          <div>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Black Box Data</p>
            <h2 id="audit-title" className="text-2xl font-black uppercase tracking-tighter text-slate-950">Audit Trail</h2>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mt-1">{s.trackingNumber}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 space-y-8" style={{ maxHeight: '70vh' }}>
          {/* Shipment Details Card */}
          <section className="bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-200">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Shipment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
              <div className="space-y-1">
                <p><span className="text-slate-400 uppercase tracking-wider text-[10px]">Tracking</span></p>
                <p className="text-slate-950 font-black uppercase">{s.trackingNumber}</p>
              </div>
              <div className="space-y-1">
                <p><span className="text-slate-400 uppercase tracking-wider text-[10px]">Route</span></p>
                <p className="text-slate-950 font-black uppercase">{s.origin} → {s.destination}</p>
              </div>
              <div className="space-y-1">
                <p><span className="text-slate-400 uppercase tracking-wider text-[10px]">Parties</span></p>
                <p className="text-slate-950 font-black uppercase">{s.senderName} → {s.recipientName}</p>
              </div>
              <div className="space-y-1">
                <p><span className="text-slate-400 uppercase tracking-wider text-[10px]">Service / Status</span></p>
                <p className="text-slate-950 font-black uppercase">{s.serviceType} · {s.currentStatus}</p>
              </div>
              <div className="space-y-1">
                <p><span className="text-slate-400 uppercase tracking-wider text-[10px]">ETA</span></p>
                <p className="text-slate-950 font-black uppercase">{s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : 'TBD'}</p>
              </div>
            </div>
          </section>

          {/* Transit History */}
          <section>
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Transit History</h3>
            <div className="space-y-4">
              {s.events.map((ev, idx) => (
                <li key={ev.id} className="flex gap-4 text-sm border-l-4 border-amber-600 pl-4 py-2 list-none">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(ev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="font-black text-slate-950 uppercase">{ev.status} · {ev.location}</p>
                    {ev.description && <p className="text-slate-600 italic">"{ev.description}"</p>}
                  </div>
                </li>
              ))}
            </div>
          </section>

          {/* Email Logs */}
          {s.emailLogs && s.emailLogs.length > 0 && (
            <section>
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Email Logs</h3>
              <div className="space-y-3">
                {s.emailLogs.map(log => (
                  <div key={log.id} className="bg-slate-50 rounded-[2rem] p-5 border-2 border-slate-200">
                    <p className="font-black text-slate-950 uppercase mb-2">{log.subject}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      {new Date(log.sentAt).toLocaleString()} · {log.recipient} · <span className={log.status === 'SENT' ? 'text-green-600' : 'text-rose-600'}>{log.status}</span>
                    </p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{log.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="p-8 border-t-2 border-slate-100 bg-slate-50 rounded-b-[3rem] flex justify-end">
          <button type="button" onClick={onClose} className="px-8 py-4 rounded-[3rem] bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-sm transition-all shadow-[6px_6px_0_0_rgba(15,23,42,0.2)]">Close</button>
        </div>
      </div>
    </div>
  );
};
