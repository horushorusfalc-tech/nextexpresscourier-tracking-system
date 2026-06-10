import React, { useState, useEffect } from 'react';
import * as QRCodeLib from 'qrcode.react';
import { Shipment, PaymentStatus, TrackingEvent } from '../types';
import { storageService } from '../services/storage';
import { verifyTransaction, VerificationResult } from '../services/blockchainVerification';

const QRCode = (QRCodeLib as any).QRCodeCanvas || (QRCodeLib as any).QRCodeSVG || QRCodeLib;

interface PaymentWidgetProps {
  shipment: Shipment;
  onPaymentClaimed?: () => void;
}

export const PaymentWidget: React.FC<PaymentWidgetProps> = ({ shipment, onPaymentClaimed }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [secondaryWalletAddress, setSecondaryWalletAddress] = useState<string>('');
  const [customPaymentInstructions, setCustomPaymentInstructions] = useState<string>('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [claimedPayment, setClaimedPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Blockchain verification state
  const [txHash, setTxHash] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showTxInput, setShowTxInput] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await storageService.getSettings();
      setWalletAddress(settings.wallet_address || '');
      setSecondaryWalletAddress(settings.wallet_address_secondary || '');
      setCustomPaymentInstructions(settings.payment_instructions || 'Please send payment to the wallet address below.');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const effectiveWalletAddress = walletAddress || secondaryWalletAddress;

  useEffect(() => {
    setClaimedPayment(false);
    setTxHash('');
    setVerificationResult(null);
    setShowTxInput(false);
  }, [shipment.id, shipment.customsCharge, shipment.paymentStatus]);

  // Try to infer customs charge from recent tracking events when admin omitted it
  const parseChargeFromEvents = (events: TrackingEvent[] | undefined): number | null => {
    if (!events || events.length === 0) return null;
    for (const ev of events) {
      const text = (ev.description || '') as string;
      const usdMatch = text.match(/(?:USD|\$)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      if (usdMatch && usdMatch[1]) {
        const cleaned = usdMatch[1].replace(/,/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) return val;
      }
      const altMatch = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:dollars|usd)/i);
      if (altMatch && altMatch[1]) {
        const cleaned = altMatch[1].replace(/,/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return null;
  };

  const inferredCharge = parseChargeFromEvents(shipment.events);
  const displayCharge = shipment.customsCharge ?? inferredCharge;

  const handleCopyAddress = async () => {
    if (!effectiveWalletAddress) return;
    try {
      await navigator.clipboard.writeText(effectiveWalletAddress);
      setCopied('address');
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleClaimPayment = async () => {
    setIsSubmitting(true);
    try {
      await storageService.claimPayment(shipment.id, displayCharge || 0);
      setClaimedPayment(true);
      if (onPaymentClaimed) onPaymentClaimed();
    } catch (err) {
      console.error('Failed to claim payment:', err);
      alert('Failed to notify admin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTransaction = async () => {
    if (!txHash.trim()) {
      setVerificationResult({
        verified: false,
        transactionHash: '',
        status: 'error',
        message: 'Please enter a transaction hash'
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyTransaction(
        txHash.trim(),
        effectiveWalletAddress,
        shipment.customsCharge || 0
      );
      setVerificationResult(result);

      // If verified, save to database and auto-claim
      if (result.verified) {
        try {
          await storageService.verifyPaymentWithBlockchain(
            shipment.id,
            result.transactionHash,
            true // Auto-verify payment
          );
          
          // Mark as claimed and proceed
          setClaimedPayment(true);
          if (onPaymentClaimed) onPaymentClaimed();
        } catch (err) {
          console.error('Failed to save blockchain verification:', err);
          // Still show success to user even if save fails (they can try again)
        }
      }
    } catch (err: any) {
      setVerificationResult({
        verified: false,
        transactionHash: txHash,
        status: 'error',
        message: `Verification failed: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Only show payment widget if we have a customs charge (stored or inferred)
  if (!displayCharge || shipment.paymentStatus === PaymentStatus.VERIFIED) {
    return null;
  }

  const isPaid = shipment.paymentStatus === PaymentStatus.VERIFIED;
  const isPending = shipment.paymentStatus === PaymentStatus.PENDING;

  return (
    <div className="mt-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-3 border-amber-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-black text-lg">
          💰
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-950">Customs Charge Due</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-2xl border-2 border-amber-300 shadow-lg">
            {effectiveWalletAddress ? (
              <QRCode 
                value={effectiveWalletAddress} 
                size={200} 
                level="H" 
                includeMargin={true}
                fgColor="#0f172a"
                bgColor="#fffbeb"
              />
            ) : settingsLoaded ? (
              <div className="w-[200px] h-[200px] bg-slate-200 rounded-lg flex items-center justify-center p-4 text-center">
                <span className="text-xs text-slate-500">Wallet address not configured.</span>
              </div>
            ) : (
              <div className="w-[200px] h-[200px] bg-slate-200 rounded-lg flex items-center justify-center">
                <span className="text-xs text-slate-500">Loading...</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-amber-700 mt-4 text-center font-bold">Scan to pay</p>
        </div>

        {/* Payment Details Section */}
        <div className="space-y-4">
          {/* Amount */}
          <div className="bg-white p-4 rounded-2xl border-2 border-amber-300">
            <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider mb-1">Amount Due</p>
            <p className="text-3xl font-black text-amber-600">${displayCharge.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-2">USD</p>
          </div>

          {/* Wallet Address */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-300">
            <p className="text-[10px] font-bold uppercase text-slate-700 tracking-wider mb-2">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono bg-slate-50 p-3 rounded-lg break-all text-slate-900">
                {effectiveWalletAddress || (settingsLoaded ? 'Not configured' : 'Loading...')}
              </code>
              <button
                onClick={handleCopyAddress}
                disabled={!effectiveWalletAddress}
                className="p-3 rounded-lg text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                title="Copy address"
              >
                {copied === 'address' ? (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          {customPaymentInstructions && (
            <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
              <p className="text-[10px] font-bold uppercase text-blue-700 tracking-wider mb-2">📋 Instructions</p>
              <p className="text-xs text-blue-900 leading-relaxed">{customPaymentInstructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status & Action */}
      <div className="mt-6 pt-6 border-t-2 border-amber-300">
        {isPaid ? (
          <div className="p-4 bg-green-100 rounded-2xl border-2 border-green-300 text-center">
            <p className="text-sm font-black text-green-800 uppercase">✓ Payment Verified</p>
            <p className="text-[10px] text-green-700 mt-1">Your payment has been confirmed. Thank you!</p>
          </div>
        ) : isPending ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-100 rounded-2xl border-2 border-amber-300 text-center">
              <p className="text-sm font-black text-amber-800 uppercase">⏳ Payment Awaiting Verification</p>
              <p className="text-[10px] text-amber-700 mt-1">We're reviewing your payment. This usually takes 1-2 hours.</p>
            </div>
            
            {/* Blockchain Verification Section */}
            {!showTxInput && (
              <button
                onClick={() => setShowTxInput(true)}
                className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs uppercase rounded-xl transition-colors border-2 border-blue-300"
              >
                🔍 Verify with Transaction Hash
              </button>
            )}
            
            {showTxInput && (
              <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200 space-y-3">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Paste your transaction hash to auto-verify
                </p>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... (Ethereum) or Bitcoin tx ID"
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-blue-300 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                />
                
                {verificationResult && (
                  <div className={`p-3 rounded-lg text-xs ${
                    verificationResult.status === 'verified' ? 'bg-green-100 border-2 border-green-300 text-green-800' :
                    verificationResult.status === 'pending' ? 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800' :
                    'bg-red-100 border-2 border-red-300 text-red-800'
                  }`}>
                    <p className="font-bold mb-1">{verificationResult.message}</p>
                    {verificationResult.amount && (
                      <p className="text-[9px]">Amount: {verificationResult.amount.toFixed(8)}</p>
                    )}
                    {verificationResult.confirmations !== undefined && (
                      <p className="text-[9px]">Confirmations: {verificationResult.confirmations}</p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyTransaction}
                    disabled={isVerifying || !txHash.trim()}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? '⏳ Verifying...' : '✓ Verify'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTxInput(false);
                      setTxHash('');
                      setVerificationResult(null);
                    }}
                    className="px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold text-xs uppercase rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] text-slate-600 text-center">
              After sending payment, click below to notify us:
            </p>
            <button
              onClick={handleClaimPayment}
              disabled={isSubmitting || claimedPayment}
              className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {claimedPayment ? '✓ Payment Notified' : isSubmitting ? 'Notifying...' : 'I\'ve Sent Payment - Notify Admin'}
            </button>
            <p className="text-[9px] text-slate-500 text-center">
              Include your tracking number ({shipment.trackingNumber}) in the payment memo if possible.
            </p>
            
            {/* Blockchain Verification Button (for advanced users) */}
            {!showTxInput && (
              <button
                onClick={() => setShowTxInput(true)}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-xl transition-colors border-2 border-slate-400"
              >
                🔍 Or Verify with Transaction Hash
              </button>
            )}
            
            {showTxInput && (
              <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200 space-y-3">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Paste your transaction hash to auto-verify
                </p>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... (Ethereum) or Bitcoin tx ID"
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-blue-300 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                />
                
                {verificationResult && (
                  <div className={`p-3 rounded-lg text-xs ${
                    verificationResult.status === 'verified' ? 'bg-green-100 border-2 border-green-300 text-green-800' :
                    verificationResult.status === 'pending' ? 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800' :
                    'bg-red-100 border-2 border-red-300 text-red-800'
                  }`}>
                    <p className="font-bold mb-1">{verificationResult.message}</p>
                    {verificationResult.amount && (
                      <p className="text-[9px]">Amount: {verificationResult.amount.toFixed(8)}</p>
                    )}
                    {verificationResult.confirmations !== undefined && (
                      <p className="text-[9px]">Confirmations: {verificationResult.confirmations}</p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyTransaction}
                    disabled={isVerifying || !txHash.trim()}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? '⏳ Verifying...' : '✓ Verify'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTxInput(false);
                      setTxHash('');
                      setVerificationResult(null);
                    }}
                    className="px-3 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold text-xs uppercase rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
