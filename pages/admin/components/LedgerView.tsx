import React from 'react';
import { useAdmin } from '../AdminContext';
import { ShipmentRow } from './ShipmentRow';

export const LedgerView: React.FC = () => {
  const { state } = useAdmin();

  const filteredShipments = React.useMemo(() => {
    const q = (state.searchQuery || '').toLowerCase();
    return state.shipments.filter(s => {
      const tracking = (s.trackingNumber || '').toLowerCase();
      const recipient = (s.recipientName || '').toLowerCase();
      const sender = (s.senderName || '').toLowerCase();
      const matchesSearch = tracking.includes(q) || recipient.includes(q) || sender.includes(q);
      const matchesStatus = state.statusFilter ? s.currentStatus === state.statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [state.shipments, state.searchQuery, state.statusFilter]);

  return (
    <div className="overflow-x-auto">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200">Asset Identification</th>
            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200">Route Details</th>
            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200">Service Level</th>
            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200">Current Status</th>
            <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-200 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredShipments.map((s) => (
            <ShipmentRow key={s.id} shipment={s} />
          ))}
          {filteredShipments.length === 0 && (
            <tr>
              <td colSpan={5} className="py-32 text-center">
                <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No matching assets found in the ledger.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
