import React, { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../../AdminContext';
import { storageService } from '../../../../services/storage';

interface PaymentVerificationModalProps {
  onSave: (notes?: string) => Promise<void>;
  onClose: () => void;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({ onSave, onClose }) => {
  const { state, dispatch } = useAdmin();
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const shipment = state.selectedShipment;

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(notes);
      // Also verify the payment in the database
      if (shipment) {
        await storageService.verifyPayment(shipment.id, notes, autoAdvance);
      }
      onClose();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shipment || !shipment.customsCharge) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="verify-payment-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-green-200 max-w-lg w-full">
        <div className="flex justify-between items-center p-8 border-b-2 border-green-100">
          <div>
            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Payment Verification</p>
            <h2 id="verify-payment-title" className="text-2xl font-black uppercase tracking-tighter text-slate-950">Confirm Payment</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-green-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Shipment Summary */}
          <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-200">
            <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-3">Shipment Details</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Tracking:</span>
                <span className="text-sm font-black text-slate-950">{shipment.trackingNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Amount:</span>
                <span className="text-lg font-black text-green-600">${shipment.customsCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Recipient:</span>
                <span className="text-sm font-medium text-slate-950">{shipment.recipientName}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="payment-notes" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Verification Notes (Optional)</label>
            <textarea 
              id="payment-notes"
              ref={firstRef}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g., Transaction hash, timestamp, payment method..."
              className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-green-600 focus:ring-0 outline-none text-sm font-bold resize-none transition-all"
            />
          </div>

          {/* Auto-advance option */}
          <div className="flex items-center gap-3 pt-2">
            <input 
              id="auto-advance" 
              type="checkbox" 
              checked={autoAdvance} 
              onChange={e => setAutoAdvance(e.target.checked)} 
              className="w-5 h-5 rounded-full border-2 border-slate-300 text-green-600 focus:ring-green-600"
            />
            <label htmlFor="auto-advance" className="text-sm font-black uppercase tracking-wider text-slate-700">
              Auto-advance to "Customs Cleared"
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-4 rounded-[3rem] border-2 border-slate-300 font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-4 rounded-[3rem] bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[6px_6px_0_0_rgba(22,163,74,0.2)] hover:shadow-[8px_8px_0_0_rgba(22,163,74,0.3)] active:translate-x-0.5 active:translate-y-0.5"
            >
              {isSubmitting ? 'Verifying...' : 'Verify Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
