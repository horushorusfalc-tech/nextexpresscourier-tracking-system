import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Shipment, ShipmentStatus, PaymentStatus } from '../types';
import { PaymentWidget } from '../components/PaymentWidget';

export const Track: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(id?.toUpperCase() || '');
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      setSearchInput(id.toUpperCase());
      performLookup(id);
    }
  }, [id]);

  useEffect(() => {
    if (shipment && shipment.estimatedDelivery) {
      const interval = setInterval(() => setTick(prev => prev + 1), 60000);
      return () => clearInterval(interval);
    }
  }, [shipment]);

  useEffect(() => {
    if (!shipment) return;

    const needsAutoRefresh =
      shipment.customsCharge !== undefined ||
      shipment.currentStatus === ShipmentStatus.CUSTOMS_HOLD ||
      shipment.paymentStatus === PaymentStatus.PENDING;

    if (!needsAutoRefresh) return;

    const interval = setInterval(() => {
      performLookup(shipment.trackingNumber);
    }, 10000);

    return () => clearInterval(interval);
  }, [shipment?.id, shipment?.customsCharge, shipment?.currentStatus, shipment?.paymentStatus]);

  const performLookup = async (trackingNo: string) => {
    setLoading(true);
    setNotFound(false);
    setErrorMessage(null);

    try {
      const result = await storageService.getShipmentByTracking(trackingNo);
      if (!result) {
        setShipment(null);
        setNotFound(true);
        return;
      }
      setShipment(result);
    } catch (err: any) {
      setShipment(null);
      setNotFound(false);
      setErrorMessage(err?.message || 'Unable to load tracking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) navigate(`/track/${searchInput.trim().toUpperCase()}`);
  };

  const getStatusBadgeStyle = (status: ShipmentStatus | undefined) => {
    switch (status) {
      case ShipmentStatus.DELIVERED: return 'bg-green-100 text-green-800 border-green-200';
      case ShipmentStatus.CUSTOMS_HOLD: return 'bg-amber-100 text-amber-800 border-amber-200';
      case ShipmentStatus.ON_HOLD: return 'bg-rose-100 text-rose-800 border-rose-200';
      case ShipmentStatus.CANCELLED: return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-slate-950 text-white border-slate-950';
    }
  };

  const getProgressStep = (status: ShipmentStatus): number => {
    switch (status) {
      case ShipmentStatus.PENDING:
      case ShipmentStatus.PRE_TRANSIT: return 0;
      case ShipmentStatus.PICKED_UP: return 1;
      case ShipmentStatus.IN_TRANSIT: return 2;
      case ShipmentStatus.CUSTOMS_HOLD:
      case ShipmentStatus.CUSTOMS_CLEARED: return 3;
      case ShipmentStatus.OUT_FOR_DELIVERY: return 4;
      case ShipmentStatus.DELIVERED: return 5;
      default: return 0;
    }
  };

  const getETAString = (): string => {
    if (!shipment) return 'Calculating Transit...';
    if (shipment.currentStatus === ShipmentStatus.DELIVERED) return 'Delivered';
    if (shipment.currentStatus === ShipmentStatus.CANCELLED) return 'Cancelled';
    if (!shipment.estimatedDelivery) return 'Transit ETA unavailable';

    const now = new Date();
    const eta = new Date(shipment.estimatedDelivery);
    const diff = eta.getTime() - now.getTime();

    if (diff < 0) return `Delayed — Expected ${eta.toLocaleDateString()}`;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0 && hours < 24) return 'Arriving today!';
    return `Arriving in ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const handleCopy = async () => {
    if (!shipment) return;
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(shipment.trackingNumber);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!shipment) return;
    const url = `${window.location.origin}/#/track/${shipment.trackingNumber}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Track ${shipment.trackingNumber}`, text: `Track this NextExpress shipment: ${shipment.trackingNumber}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied('url');
        setTimeout(() => setCopied(null), 2000);
      }
    } catch {}
  };

  const handleRefresh = async () => {
    if (!shipment) return;
    await performLookup(shipment.trackingNumber);
  };

  const currentStep = shipment ? getProgressStep(shipment.currentStatus) : 0;
  const isCancelled = shipment?.currentStatus === ShipmentStatus.CANCELLED;
  const isWarning = shipment?.currentStatus === ShipmentStatus.ON_HOLD || shipment?.currentStatus === ShipmentStatus.DELIVERY_FAILED;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .skeleton {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
          @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
        `}</style>

        {/* Loading Header */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="skeleton h-32 rounded-[3rem] mb-12"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="skeleton h-64 rounded-[3rem]"></div>
              <div className="skeleton h-48 rounded-[3rem]"></div>
            </div>
            <div className="skeleton h-96 rounded-[3rem]"></div>
          </div>
        </div>
        <p className="text-center text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Scanning Global Network...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes route-flow {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .route-flow {
          stroke-dasharray: 1000;
          animation: route-flow 4s ease-out forwards;
        }

        .fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .pulse-ring {
          animation: pulse-ring 2.5s ease-in-out infinite;
        }

        .slide-in-left {
          animation: slide-in-left 0.8s ease-out forwards;
        }

        .timeline-item {
          opacity: 0;
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 bg-white border-b border-slate-100">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice">
            <path d="M 80 200 Q 350 100, 600 150 T 1200 180 T 1360 200" fill="none" stroke="#f59e0b" strokeWidth="3" className="route-flow" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {!shipment ? (
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-4">Global Tracking System</p>
              {notFound && (
                <div className="mb-8 rounded-[2rem] border border-rose-200 bg-rose-50 px-8 py-6 text-rose-700 text-sm font-bold uppercase tracking-wider">
                  No shipment was found for that tracking number. Please confirm the NEC number and try again.
                </div>
              )}
              {errorMessage && (
                <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50 px-8 py-6 text-amber-700 text-sm font-bold uppercase tracking-wider">
                  {errorMessage}
                </div>
              )}
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-slate-950 mb-8 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                TRACE ASSET
              </h1>

              {/* Animated route line */}
              <div className="relative mb-12 h-1 overflow-hidden max-w-2xl mx-auto">
                <svg className="w-full h-full" viewBox="0 0 400 2" preserveAspectRatio="none">
                  <line x1="0" y1="1" x2="400" y2="1" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="10 5" className="route-line" />
                  <circle cx="0" cy="1" r="4" fill="#f59e0b" className="route-dot" style={{ animation: 'route-dot 8s linear infinite' }} />
                </svg>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto mb-10">
                <input
                  className="flex-grow px-10 py-7 rounded-none border-3 border-slate-950 focus:border-amber-600 focus:ring-0 outline-none text-slate-950 bg-white uppercase tracking-wider text-base font-bold placeholder:text-slate-400 transition-all shadow-[10px_10px_0_0_rgba(15,23,42,0.08)]"
                  placeholder="ENTER TRACKING NUMBER"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                />
                <button className="bg-amber-600 hover:bg-amber-700 text-white px-14 py-7 rounded-none text-base font-black uppercase tracking-wider transition-all shadow-[10px_10px_0_0_rgba(245,158,11,0.3)] hover:shadow-[14px_14px_0_0_rgba(245,158,11,0.4)] active:translate-x-1 active:translate-y-1">
                  Track
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Track by NEC number</span>
                <span className="text-slate-300">·</span>
                <span>Real-time updates</span>
                <span className="text-slate-300">·</span>
                <span>Global coverage</span>
              </div>
            </div>
          ) : (
            <div className={`space-y-12 ${shipment.currentStatus === ShipmentStatus.CANCELLED ? 'grayscale' : ''}`}>
              {/* Header Card */}
              <div className="bg-white border-2 border-slate-200 border-t-4 border-t-amber-600 p-10 md:p-14 rounded-[3rem] shadow-[16px_16px_0_0_rgba(15,23,42,0.04)] fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Shipment Identifier</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <h2 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter" style={{ fontFamily: 'var(--font-display)' }}>
                        {shipment.trackingNumber}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-slate-950 transition-colors">
                          {copied === shipment.trackingNumber ? (
                            <span className="text-xs font-bold text-green-600">Copied!</span>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        <button onClick={handleShare} className="p-2 text-slate-400 hover:text-slate-950 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.885 12.938 9 12.482 9 12c0-.482-.115-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <button onClick={handleRefresh} disabled={loading} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={`px-8 py-4 rounded-full border-2 text-[11px] font-black uppercase tracking-widest shadow-sm ${getStatusBadgeStyle(shipment.currentStatus)}`}>
                    {shipment.currentStatus}
                  </div>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="bg-white border-2 border-slate-200 p-10 md:p-12 rounded-[3rem] shadow-[16px_16px_0_0_rgba(15,23,42,0.04)] fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="hidden sm:flex items-center justify-between relative">
                  <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 z-0">
                    <div className={`h-full transition-all duration-800 ${isCancelled ? 'bg-rose-500' : currentStep > 0 ? 'bg-slate-950' : 'bg-slate-200'}`} style={{ width: `${(currentStep / 5) * 100}%` }}></div>
                  </div>

                  {['Picked Up', 'In Transit', 'Customs', 'Out for Delivery', 'Delivered'].map((label, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep >= stepNum;
                    const isCurrent = currentStep === stepNum;

                    return (
                      <div key={label} className="relative z-10 flex flex-col items-center flex-1">
                        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                          isCancelled ? 'bg-rose-500 border-rose-500' :
                          isCompleted ? 'bg-slate-950 border-slate-950' :
                          isCurrent ? 'bg-white border-slate-950 pulse-ring' : 'bg-white border-slate-200'
                        }`}>
                          {isCompleted && !isCancelled ? (
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isCancelled ? (
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <span className={`text-lg font-black ${isCurrent ? 'text-slate-950' : ''}`}>{stepNum}</span>
                          )}
                        </div>
                        <p className={`mt-3 text-[9px] font-black uppercase tracking-widest text-center ${
                          isCancelled ? 'text-rose-600' : isCurrent ? 'text-slate-950' : 'text-slate-400'
                        }`}>{label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile vertical stepper */}
                <div className="sm:hidden space-y-6">
                  {['Picked Up', 'In Transit', 'Customs', 'Out for Delivery', 'Delivered'].map((label, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep >= stepNum;
                    const isCurrent = currentStep === stepNum;

                    return (
                      <div key={label} className="flex items-center gap-4 relative">
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center flex-shrink-0 transition-all ${
                          isCancelled ? 'bg-rose-500 border-rose-500' :
                          isCompleted ? 'bg-slate-950 border-slate-950' :
                          isCurrent ? 'bg-white border-slate-950 pulse-ring' : 'bg-white border-slate-200'
                        }`}>
                          {isCompleted && !isCancelled ? (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isCancelled ? (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <span className={`text-base font-black ${isCurrent ? 'text-slate-950' : ''}`}>{stepNum}</span>
                          )}
                        </div>
                        {idx < 4 && <div className={`absolute left-[22px] top-12 w-0.5 h-8 ${isCompleted ? 'bg-slate-950' : 'bg-slate-200'}`}></div>}
                        <p className={`text-sm font-black uppercase tracking-wider ${
                          isCancelled ? 'text-rose-600' : isCurrent ? 'text-slate-950' : 'text-slate-400'
                        }`}>{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column */}
                <div className="space-y-10 fade-in-up" style={{ animationDelay: '0.2s' }}>
                  {/* Logistics Card */}
                  <section className="bg-white p-10 md:p-12 rounded-[3rem] border-2 border-slate-200 shadow-[12px_12px_0_0_rgba(15,23,42,0.04)]">
                    <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] mb-10 border-b-2 border-slate-100 pb-4">Logistics Routing</h3>
                    <div className="grid grid-cols-2 gap-y-10 gap-x-8">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Origin</p>
                        <p className="text-lg font-black text-slate-950 uppercase">{shipment.origin}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Destination</p>
                        <p className="text-lg font-black text-slate-950 uppercase">{shipment.destination}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Service Level</p>
                        <p className="text-base font-bold text-slate-950 uppercase tracking-tight">{shipment.serviceType}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Arrival Target</p>
                        <p className={`text-base font-bold ${shipment.currentStatus === ShipmentStatus.DELIVERED ? 'text-green-600' : shipment.currentStatus === ShipmentStatus.CANCELLED ? 'text-rose-600' : 'text-slate-950'}`}>
                          {getETAString()}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Consignee Card */}
                  <section className="bg-white p-10 md:p-12 rounded-[3rem] border-2 border-slate-200 shadow-[12px_12px_0_0_rgba(15,23,42,0.04)]">
                    <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] mb-8 border-b-2 border-slate-100 pb-4">Authorized Consignee</h3>
                    <p className="text-xl font-black text-slate-950 mb-3">{shipment.recipientName}</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium uppercase tracking-tight">{shipment.recipientAddress}</p>
                  </section>

                  {/* Payment Widget - Show when customs charge exists or shipment is held in customs */}
                  {(shipment.customsCharge || shipment.currentStatus === ShipmentStatus.CUSTOMS_HOLD) && (
                        <PaymentWidget shipment={shipment} onPaymentClaimed={() => performLookup(shipment.trackingNumber)} />
                      )}
                </div>

                {/* Right Column - Timeline */}
                <div className="bg-slate-950 text-white p-10 md:p-14 rounded-[3rem] shadow-[16px_16px_0_0_rgba(15,23,42,0.1)] fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-10 border-b border-slate-800 pb-4">Real-Time Audit Trail</h3>
                  <div className="space-y-10 relative">
                    <div className="absolute left-[6px] top-2 bottom-2 w-px bg-slate-800"></div>
                    {shipment.events.length === 0 ? (
                      <div className="relative pl-10 timeline-item">
                        <div className="space-y-4 rounded-[2rem] border border-slate-800 bg-slate-900/90 p-10 text-center text-slate-300">
                          <p className="text-sm font-black uppercase tracking-widest">Audit trail not found</p>
                          <p className="text-xs leading-relaxed">
                            The shipment is visible, but no protocol events were returned from Supabase.
                            Please confirm that the shipment has saved tracking events in the admin panel and that the public tracking function is updated to include `tracking_events`.
                          </p>
                        </div>
                      </div>
                    ) : (
                      shipment.events.map((event, idx) => (
                        <div key={event.id} className="relative pl-10 timeline-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                          <div className={`absolute left-0 top-1 w-[12px] h-[12px] rounded-full border-2 border-slate-950 shadow-sm transition-all ${
                            idx === 0 ? 'bg-amber-600 pulse-ring' : 'bg-slate-600'
                          }`}></div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-base font-black text-white uppercase tracking-tight leading-none">{event.status} | {event.location}</p>
                            <p className="text-[13px] text-slate-400 leading-relaxed italic opacity-80">"{event.description}"</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
