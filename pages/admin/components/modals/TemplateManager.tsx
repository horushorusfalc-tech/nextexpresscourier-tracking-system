import React, { useEffect, useRef } from 'react';
import { useAdmin } from '../../AdminContext';

const inputStyle = { background: '#f1f5f9', color: '#0f172a', borderColor: '#e2e8f0' };
const TYPES = ['General', 'Delivery', 'Hold', 'Customs', 'Cancellation'];

interface TemplateManagerProps {
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ onSave, onDelete, onClose }) => {
  const { state, dispatch } = useAdmin();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tf = state.templateForm;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="templates-title">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col" style={{ background: 'var(--bg-card, #fff)', color: 'var(--text, #0f172a)' }}>
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 id="templates-title" className="text-lg font-black uppercase tracking-widest">Template Manager</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6" style={{ maxHeight: '70vh' }}>
          <form id="template-form" onSubmit={onSave} className="space-y-3">
            <div>
              <label htmlFor="tm-name" className="block text-[10px] font-black uppercase tracking-widest mb-1">Name</label>
              <input ref={nameRef} id="tm-name" type="text" value={tf.name ?? ''} onChange={e => dispatch({ type: 'SET_TEMPLATE_FORM', payload: { name: e.target.value } })} required className="w-full px-4 py-2 rounded-xl border text-sm font-bold" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="tm-subject" className="block text-[10px] font-black uppercase tracking-widest mb-1">Subject ({{tracking}})</label>
              <input id="tm-subject" type="text" value={tf.subject ?? ''} onChange={e => dispatch({ type: 'SET_TEMPLATE_FORM', payload: { subject: e.target.value } })} required className="w-full px-4 py-2 rounded-xl border text-sm font-bold" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="tm-body" className="block text-[10px] font-black uppercase tracking-widest mb-1">Body ({{name}}, {{status}}, {{location}}, {{tracking}})</label>
              <textarea id="tm-body" value={tf.body ?? ''} onChange={e => dispatch({ type: 'SET_TEMPLATE_FORM', payload: { body: e.target.value } })} required rows={4} className="w-full px-4 py-2 rounded-xl border text-sm font-bold" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="tm-type" className="block text-[10px] font-black uppercase tracking-widest mb-1">Type</label>
              <select id="tm-type" value={tf.type ?? 'General'} onChange={e => dispatch({ type: 'SET_TEMPLATE_FORM', payload: { type: e.target.value } })} className="w-full px-4 py-2 rounded-xl border text-sm font-bold" style={inputStyle}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button type="submit" className="px-6 py-2 rounded-xl bg-slate-950 text-white font-black uppercase tracking-widest text-sm">Save Template</button>
          </form>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Existing Templates</h3>
            <ul className="space-y-2">
              {state.templates.map(t => (
                <li key={t.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-4 py-2 text-sm">
                  <span className="font-bold">{t.name}</span>
                  <button type="button" onClick={() => onDelete(t.id)} className="text-rose-600 font-black uppercase text-xs">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl bg-slate-950 text-white font-black uppercase tracking-widest text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};
