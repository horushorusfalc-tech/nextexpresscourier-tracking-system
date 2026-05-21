import React from 'react';
import { useAdmin } from '../AdminContext';
import { storageService } from '../../../services/storage';
import { ShipmentStatus } from '../../../types';

export const AdminToolbar: React.FC = () => {
  const { state, dispatch } = useAdmin();

  const handleNewAsset = () => {
    dispatch({
      type: 'SET_FORM_DATA',
      payload: {
        serviceType: 'Priority Express',
        currentStatus: ShipmentStatus.PENDING,
        packagingType: 'Box',
        trackingNumber: storageService.generateTrackingNumber(),
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'registry' });
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: null });
  };

  return (
    <>
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em] mb-3">Command Terminal</p>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase leading-none" style={{ fontFamily: 'var(--font-display)' }}>
            Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-white shadow-[8px_8px_0_0_rgba(15,23,42,0.1)] border-2 border-slate-200 p-2 rounded-[2rem]">
          <button
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'PULSE' })}
            className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              state.viewMode === 'PULSE' ? 'bg-slate-950 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pulse View
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'LEDGER' })}
            className={`px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              state.viewMode === 'LEDGER' ? 'bg-slate-950 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Data Ledger
          </button>
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'templates' })}
            className="p-4 text-slate-400 hover:text-amber-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-[12px_12px_0_0_rgba(15,23,42,0.04)] border-2 border-slate-200 overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search assets by ID or Recipient..."
              value={state.searchQuery}
              onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-[3rem] py-4 pl-12 pr-6 text-sm font-bold focus:border-amber-600 focus:ring-0 outline-none placeholder:text-slate-400 transition-all"
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            {state.statusFilter && (
              <button
                onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: null })}
                className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 underline decoration-2 underline-offset-4"
              >
                Clear Filter
              </button>
            )}
            <button
              onClick={handleNewAsset}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-[3rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-[6px_6px_0_0_rgba(245,158,11,0.3)] hover:shadow-[8px_8px_0_0_rgba(245,158,11,0.4)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_0_rgba(245,158,11,0.3)]"
            >
              Registry New Asset
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
