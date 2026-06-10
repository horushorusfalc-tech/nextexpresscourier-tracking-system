import React, { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../../AdminContext';
import { ShipmentStatus } from '../../../../types';

const STATUS_OPTIONS = Object.values(ShipmentStatus);

interface ProtocolCommandModalProps {
  onSave: (form: {
    status: ShipmentStatus;
    location: string;
    description: string;
    sendEmail: boolean;
    selectedTemplateId: string;
    customsCharge?: number;
  }, e: React.FormEvent) => void;
  onClose: () => void;
}

export const ProtocolCommandModal: React.FC<ProtocolCommandModalProps> = ({ onSave, onClose }) => {
  const { state, dispatch } = useAdmin();
  const firstRef = useRef<HTMLSelectElement>(null);
  const [localStatusForm, setLocalStatusForm] = useState(state.statusForm);
  const [customsCharge, setCustomsCharge] = useState<string>('');

  useEffect(() => {
    setLocalStatusForm(state.statusForm);
    setCustomsCharge(state.selectedShipment?.customsCharge?.toString() || '');
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, state.statusForm, state.selectedShipment]);

  const handleLocalChange = (payload: Partial<typeof localStatusForm>) => {
    setLocalStatusForm((prev) => ({ ...prev, ...payload }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = { ...localStatusForm };
    if (localStatusForm.status === ShipmentStatus.CUSTOMS_HOLD && customsCharge) {
      Object.assign(formData, { customsCharge: parseFloat(customsCharge) });
    }
    dispatch({ type: 'SET_STATUS_FORM', payload: localStatusForm });
    onSave(formData, e);
  };

  const isCustomsStatus = localStatusForm.status === ShipmentStatus.CUSTOMS_HOLD || state.selectedShipment?.customsCharge !== undefined;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="protocol-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-slate-200 max-w-lg w-full">
        <div className="flex justify-between items-center p-8 border-b-2 border-slate-100">
          <div>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Status Update</p>
            <h2 id="protocol-title" className="text-2xl font-black uppercase tracking-tighter text-slate-950">Protocol Command</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label htmlFor="protocol-status" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
            <select id="protocol-status" ref={firstRef} value={localStatusForm.status} onChange={e => handleLocalChange({ status: e.target.value as ShipmentStatus })} required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all bg-white">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="protocol-location" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Location</label>
            <input id="protocol-location" type="text" value={localStatusForm.location} onChange={e => handleLocalChange({ location: e.target.value })} required placeholder="e.g. London, UK" className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all" />
          </div>
          <div>
            <label htmlFor="protocol-description" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Description</label>
            <textarea id="protocol-description" value={localStatusForm.description} onChange={e => handleLocalChange({ description: e.target.value })} rows={4} minLength={5} required placeholder="Enter status update details..." className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold resize-none transition-all" />
          </div>
          {isCustomsStatus && (
            <div>
              <label htmlFor="protocol-customs-charge" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">💰 Customs Charge (USD)</label>
              <input 
                id="protocol-customs-charge" 
                type="number" 
                step="0.01" 
                min="0" 
                value={customsCharge} 
                onChange={e => setCustomsCharge(e.target.value)} 
                placeholder="e.g. 50.00"
                className="w-full px-6 py-4 rounded-[3rem] border-2 border-amber-300 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all bg-amber-50" 
              />
              <p className="text-[10px] text-amber-700 mt-2">Enter the total customs charge amount the customer must pay.</p>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <input id="protocol-send-email" type="checkbox" checked={localStatusForm.sendEmail} onChange={e => handleLocalChange({ sendEmail: e.target.checked })} className="w-5 h-5 rounded-full border-2 border-slate-300 text-amber-600 focus:ring-amber-600" />
            <label htmlFor="protocol-send-email" className="text-sm font-black uppercase tracking-wider text-slate-700">Send Email Notification</label>
          </div>
          {localStatusForm.sendEmail && (
            <div>
              <label htmlFor="protocol-template" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Template</label>
              <select id="protocol-template" value={localStatusForm.selectedTemplateId} onChange={e => handleLocalChange({ selectedTemplateId: e.target.value })} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all bg-white">
                <option value="ai">AI-Generated</option>
                {state.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-[3rem] border-2 border-slate-300 font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={state.isSubmitting} className="px-8 py-4 rounded-[3rem] bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[6px_6px_0_0_rgba(15,23,42,0.2)] hover:shadow-[8px_8px_0_0_rgba(15,23,42,0.3)] active:translate-x-0.5 active:translate-y-0.5">
              Execute Protocol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
