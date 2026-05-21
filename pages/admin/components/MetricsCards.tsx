import React, { useMemo } from 'react';
import { useAdmin } from '../AdminContext';
import { ShipmentStatus } from '../../../types';

export const MetricsCards: React.FC = () => {
  const { state, dispatch } = useAdmin();

  const statusMetrics = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ShipmentStatus).forEach(st => counts[st] = 0);
    state.shipments.forEach(s => { counts[s.currentStatus] = (counts[s.currentStatus] || 0) + 1; });
    return counts;
  }, [state.shipments]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
      {Object.entries(statusMetrics).slice(0, 6).map(([status, count]) => (
        <button
          key={status}
          onClick={() => dispatch({
            type: 'SET_STATUS_FILTER',
            payload: state.statusFilter === status ? null : status as ShipmentStatus
          })}
          className={`p-6 rounded-[3rem] border-2 transition-all text-left ${
            state.statusFilter === status
              ? 'bg-slate-950 border-slate-950 shadow-[12px_12px_0_0_rgba(15,23,42,0.15)] scale-105'
              : 'bg-white border-slate-200 hover:border-amber-600 hover:shadow-[8px_8px_0_0_rgba(15,23,42,0.08)]'
          }`}
        >
          <p className={`text-[8px] font-black uppercase tracking-widest mb-3 ${
            state.statusFilter === status ? 'text-amber-500' : 'text-slate-400'
          }`}>
            {status.replace(/_/g, ' ')}
          </p>
          <p className={`text-4xl font-black tracking-tighter ${
            state.statusFilter === status ? 'text-white' : 'text-slate-950'
          }`}>
            {count}
          </p>
        </button>
      ))}
    </div>
  );
};
