import React, { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../../AdminContext';
import { ShipmentStatus } from '../../../../types';

const SERVICE_TYPES = ['Standard Global', 'Priority Express', 'Next Day Air', 'Freight Logistics', 'Standard Freight', 'Ocean Cargo', 'Secure Couriers'];

interface AssetRegistryModalProps {
  onSave: (e: React.FormEvent, imageFile?: File) => void;
  onClose: () => void;
}

export const AssetRegistryModal: React.FC<AssetRegistryModalProps> = ({ onSave, onClose }) => {
  const { state, dispatch } = useAdmin();
  const firstRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (state.selectedShipment) {
      dispatch({ type: 'SET_FORM_DATA', payload: { ...state.selectedShipment } });
    } else {
      dispatch({
        type: 'SET_FORM_DATA',
        payload: {
          trackingNumber: '',
          senderName: '', senderAddress: '', senderEmail: '', origin: '',
          recipientName: '', recipientEmail: '', recipientAddress: '', destination: '',
          serviceType: 'Priority Express', weight: '', dimensions: '',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          contentDescription: '', currentStatus: ShipmentStatus.PENDING
        }
      });
    }
  }, [state.selectedShipment]);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const d = state.formData;
  const isEdit = !!state.selectedShipment;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="registry-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-8 border-b-2 border-slate-100">
          <div>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Asset Management</p>
            <h2 id="registry-title" className="text-2xl font-black uppercase tracking-tighter text-slate-950">{isEdit ? 'Modify Registry' : 'New Asset Registry'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(e, imageFile ?? undefined); }} className="flex flex-col flex-1 min-h-0">
          <div className="p-8 overflow-y-auto flex-1" style={{ maxHeight: '60vh' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tracking Number</label>
                  <input ref={firstRef} type="text" value={d.trackingNumber ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { trackingNumber: e.target.value.toUpperCase() } })} placeholder="NEC12345678" className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Sender Name</label>
                  <input type="text" value={d.senderName ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { senderName: e.target.value } })} required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Sender Address</label>
                  <textarea value={d.senderAddress ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { senderAddress: e.target.value } })} required rows={2} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold resize-none transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Sender Email</label>
                  <input type="email" value={d.senderEmail ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { senderEmail: e.target.value } })} placeholder="optional" className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Origin</label>
                  <input type="text" value={d.origin ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { origin: e.target.value } })} placeholder="e.g. London, UK" required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Recipient Name</label>
                  <input type="text" value={d.recipientName ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { recipientName: e.target.value } })} required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Recipient Email</label>
                  <input type="email" value={d.recipientEmail ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { recipientEmail: e.target.value } })} required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Recipient Address</label>
                  <textarea value={d.recipientAddress ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { recipientAddress: e.target.value } })} required rows={2} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold resize-none transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Destination</label>
                  <input type="text" value={d.destination ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { destination: e.target.value } })} placeholder="e.g. Dubai, UAE" required className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Service Type</label>
                  <select value={d.serviceType ?? 'Priority Express'} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { serviceType: e.target.value } })} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold uppercase tracking-wider transition-all bg-white">
                    {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Weight</label>
                  <input type="text" value={d.weight ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { weight: e.target.value } })} placeholder="e.g. 5.5 kg" className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Dimensions</label>
                  <input type="text" value={d.dimensions ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { dimensions: e.target.value } })} placeholder="e.g. 20x20x20 cm" className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Est. Delivery</label>
                  <input type="date" value={typeof d.estimatedDelivery === 'string' && d.estimatedDelivery.length <= 10 ? d.estimatedDelivery : ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { estimatedDelivery: e.target.value } })} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Content</label>
                  <input type="text" value={d.contentDescription ?? ''} onChange={e => dispatch({ type: 'UPDATE_FORM_DATA', payload: { contentDescription: e.target.value } })} className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Shipment Photo</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="w-full px-4 py-3 rounded-[3rem] border-2 border-slate-200 text-sm font-bold file:mr-3 file:py-2 file:rounded-full file:border-0 file:bg-slate-100 file:font-bold file:text-slate-700 file:hover:bg-slate-200"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      setImageFile(f ?? null);
                      setImagePreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  {(imagePreview || (d.imageUrl && !imageFile)) && (
                    <div className="mt-3 rounded-2xl overflow-hidden border-2 border-slate-200 max-w-[200px] shadow-md">
                      <img src={imagePreview || d.imageUrl} alt="Preview" className="w-full h-28 object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 border-t-2 border-slate-100 flex justify-end gap-4 bg-slate-50 rounded-b-[3rem]">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-[3rem] border-2 border-slate-300 font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={state.isSubmitting} className="px-8 py-4 rounded-[3rem] bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[6px_6px_0_0_rgba(245,158,11,0.3)] hover:shadow-[8px_8px_0_0_rgba(245,158,11,0.4)] active:translate-x-0.5 active:translate-y-0.5">
              {isEdit ? 'Update Ledger' : 'Authorize Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
