import React, { useEffect, useRef, useState } from 'react';
import { storageService } from '../../../../services/storage';

interface SettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSaved }) => {
  const firstRef = useRef<HTMLInputElement>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [secondaryWallet, setSecondaryWallet] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadSettings = async () => {
    try {
      const settings = await storageService.getSettings();
      setWalletAddress(settings.wallet_address || '');
      setSecondaryWallet(settings.wallet_address_secondary || '');
      setInstructions(settings.payment_instructions || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress.trim()) {
      setMessage({ type: 'error', text: 'Primary wallet address is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all([
        storageService.updateSetting('wallet_address', walletAddress.trim(), 'Primary Bitcoin/Crypto wallet address for receiving customs charges'),
        storageService.updateSetting('wallet_address_secondary', secondaryWallet.trim(), 'Optional secondary wallet address'),
        storageService.updateSetting('payment_instructions', instructions, 'Custom payment instructions for customers')
      ]);
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <div className="bg-white rounded-[3rem] shadow-[24px_24px_0_0_rgba(15,23,42,0.15)] border-4 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-8 border-b-2 border-slate-100 sticky top-0 bg-white">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">System Configuration</p>
            <h2 id="settings-title" className="text-2xl font-black uppercase tracking-tighter text-slate-950">Payment Settings</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-3 rounded-full hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-600 text-slate-400 hover:text-slate-950 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-8 space-y-6">
          {message && (
            <div className={`p-4 rounded-2xl border-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          {/* Primary Wallet Address */}
          <div>
            <label htmlFor="wallet-primary" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
              💰 Primary Wallet Address
            </label>
            <input
              id="wallet-primary"
              ref={firstRef}
              type="text"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              placeholder="e.g., bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
              required
              className="w-full px-6 py-4 rounded-[3rem] border-2 border-amber-300 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all bg-amber-50"
            />
            <p className="text-[10px] text-slate-500 mt-2">This wallet address will be displayed to customers for payment</p>
          </div>

          {/* Secondary Wallet Address */}
          <div>
            <label htmlFor="wallet-secondary" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
              💰 Secondary Wallet Address (Optional)
            </label>
            <input
              id="wallet-secondary"
              type="text"
              value={secondaryWallet}
              onChange={e => setSecondaryWallet(e.target.value)}
              placeholder="e.g., bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
              className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold transition-all"
            />
            <p className="text-[10px] text-slate-500 mt-2">Backup wallet address (not currently displayed to customers)</p>
          </div>

          {/* Payment Instructions */}
          <div>
            <label htmlFor="payment-instructions" className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">
              📋 Payment Instructions
            </label>
            <textarea
              id="payment-instructions"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              placeholder="Enter custom instructions for customers..."
              className="w-full px-6 py-4 rounded-[3rem] border-2 border-slate-200 focus:border-amber-600 focus:ring-0 outline-none text-sm font-bold resize-none transition-all"
            />
            <p className="text-[10px] text-slate-500 mt-2">These instructions appear on the payment widget for customers</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
            <p className="text-[10px] font-bold text-blue-900 mb-2">ℹ️ Important Information</p>
            <ul className="text-[10px] text-blue-800 space-y-1 list-disc list-inside">
              <li>Wallet addresses will be visible to all customers tracking shipments with customs charges</li>
              <li>Changes to these settings apply immediately to all new tracking displays</li>
              <li>Include your wallet address in payment memos when possible for easier tracking</li>
            </ul>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t-2 border-slate-100">
            <button type="button" onClick={onClose} className="px-8 py-4 rounded-[3rem] border-2 border-slate-300 font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 rounded-[3rem] bg-slate-950 hover:bg-black text-white font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[6px_6px_0_0_rgba(15,23,42,0.2)] hover:shadow-[8px_8px_0_0_rgba(15,23,42,0.3)] active:translate-x-0.5 active:translate-y-0.5"
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
