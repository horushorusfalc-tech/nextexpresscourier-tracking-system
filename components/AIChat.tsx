import React, { useState, useRef, useEffect } from 'react';
import { supabase, storageService } from '../services/storage';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '🪙 NEC AI Assistant Online\n\n**Website payments: Bitcoin (BTC) only.**\n\nEnter your tracking number (NEC-XXXXXX) to get:\n✓ Real-time shipment status\n✓ Delivery time estimates  \n✓ Customs duty information\n✓ BTC payment setup help\n\nOr ask general questions about shipping & payments.' }
  ]);
  const [input, setInput] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleVerifyTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsTyping(true);
    setError('');

    try {
      const payload = { trackingNumber: trackingNumber.trim(), action: 'verify' };
      const { data, error: verifyError } = await storageService.invokeEdgeFunction('ai-chat', { body: JSON.stringify(payload) });

      if (verifyError || !data?.valid) {
        const msg = data?.text || verifyError?.message || 'Invalid tracking number. Please try again.';
        setError(msg);
        setIsTyping(false);
        return;
      }

      setIsVerified(true);
      // prefer canonical tracking number from shipment if available
      const canonical = data?.shipment?.trackingNumber || trackingNumber.trim();
      setTrackingNumber(canonical);
      setMessages(prev => [
        ...prev,
        { role: 'user', text: `Tracking: ${canonical}` },
        { role: 'ai', text: `✅ Tracking number verified. I now have access to your shipment data. What would you like to know?` }
      ]);
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    setError('');

    try {
      const payload = {
        message: userMsg,
        trackingNumber: isVerified ? trackingNumber.trim() : undefined,
        action: 'query'
      };

      const { data, error } = await storageService.invokeEdgeFunction('ai-chat', { body: JSON.stringify(payload) });

      if (error) {
        const msg = error.message || 'Protocol Error: Assistant offline. Please contact IT Support.';
        setMessages(prev => [...prev, { role: 'ai', text: msg }]);
      } else {
        const text = data?.text ?? "I'm having trouble processing your request. Please try again.";
        setMessages(prev => [...prev, { role: 'ai', text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Protocol Error: Assistant offline. Please contact IT Support.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[1000]">
      {isOpen ? (
        <div className="bg-white w-80 sm:w-96 h-[600px] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-5 flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">🔒 <span>Secure AI</span></p>
              <h3 className="text-white text-xs font-black uppercase tracking-widest">NEC Crypto Support</h3>
              <p className="text-[9px] text-slate-400 mt-1">Crypto Payments • Tracking • Customs Help</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Tracking Verification Panel */}
          {!isVerified && (
            <div className="p-6 bg-gradient-to-b from-blue-50 to-indigo-50 border-b border-blue-200">
              <p className="text-[11px] font-black text-slate-700 mb-1 uppercase tracking-widest">🔐 Secure Verification</p>
              <p className="text-[10px] text-slate-600 mb-4">Enter your tracking number to unlock full access to your shipment data and crypto payment options.</p>
              <form onSubmit={handleVerifyTracking} className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g., NEC-123456"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-300"
                />
                {error && <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">⚠️ {error}</p>}
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md">
                  🔓 Verify & Continue
                </button>
              </form>
              <p className="text-[9px] text-slate-600 mt-3 text-center">✅ Secure • 🔒 Encrypted • 🛡️ No Spam</p>
            </div>
          )}

          <div ref={scrollRef} className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' 
                    ? 'bg-slate-950 text-white rounded-tr-none shadow-md' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 space-y-2">
            <div className="flex gap-2">
              <input 
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-300" 
                placeholder={isVerified ? "Ask about BTC payments, delivery, customs, tracking... (try: 'How do I pay with Bitcoin?')" : "Verify tracking first..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={!isVerified}
              />
              <button type="submit" disabled={!isVerified} className="bg-slate-950 text-white p-2 rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            {isVerified && (
              <p className="text-[9px] text-slate-500 px-1">💡 **Pro Tip**: Ask "How do I pay with Bitcoin (BTC)?" or "When will my package arrive?"</p>
            )}
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-950 text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all group border-4 border-white"
        >
          <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        </button>
      )}
    </div>
  );
};
