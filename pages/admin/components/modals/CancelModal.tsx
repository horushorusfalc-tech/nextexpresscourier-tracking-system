import React, { useEffect, useRef } from 'react';
import { useAdmin } from '../../AdminContext';

interface CancelModalProps {
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({ onSave, onClose }) => {
  const { state, dispatch } = useAdmin();
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reasonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-slate-200 max-w-md w-full">
        <div className="flex justify-between items-center p-8 border-b-2 border-slate-100">
          <div>
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Critical Action</p>
            <h2 id="cancel-title" className="text-2xl font-black uppercase tracking-tighter text-rose-600">Void Authorization</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-rose-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSave} className="p-8 space-y-6">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-[2rem] p-6">
            <p className="text-sm font-bold text-rose-800 leading-relaxed">
              This will set the shipment status to Cancelled and log the event. This action cannot be undone.
            </p>
          </div>
          <div>
            <label htmlFor="cancel-reason" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Cancellation Reason</label>
            <input ref={reasonRef} id="cancel-reason" type="text" value={state.cancelReason} onChange={e => dispatch({ type: 'SET_CANCEL_REASON', payload: e.target.value })} required placeholder="e.g. Customer request, Damaged goods..." className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-rose-500 focus:ring-0 outline-none text-sm font-bold transition-all" />
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-[3rem] border-2 border-slate-300 font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={state.isSubmitting} className="px-8 py-4 rounded-[3rem] bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[6px_6px_0_0_rgba(225,29,72,0.3)] hover:shadow-[8px_8px_0_0_rgba(225,29,72,0.4)] active:translate-x-0.5 active:translate-y-0.5">
              Authorize Void
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
