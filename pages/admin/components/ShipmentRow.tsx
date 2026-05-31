import React from 'react';
import { useAdmin } from '../AdminContext';
import { Shipment, ShipmentStatus, PaymentStatus } from '../../../types';

interface ShipmentRowProps {
  shipment: Shipment;
}

export const ShipmentRow: React.FC<ShipmentRowProps> = ({ shipment }) => {
  const { dispatch } = useAdmin();

  const handleStatusUpdate = () => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipment });
    dispatch({ type: 'SET_STATUS_FORM', payload: { status: shipment.currentStatus, location: shipment.origin } });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'protocol' });
  };

  const handleEdit = () => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipment });
    dispatch({ type: 'SET_FORM_DATA', payload: shipment });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'registry' });
  };

  const handleViewDetails = () => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipment });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'audit' });
  };

  const handleCancel = () => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipment });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'cancel' });
  };

  const handleVerifyPayment = () => {
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: shipment });
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: 'payment' });
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.DELIVERED: return 'bg-green-500';
      case ShipmentStatus.CANCELLED: return 'bg-rose-500';
      case ShipmentStatus.ON_HOLD:
      case ShipmentStatus.DELIVERY_FAILED: return 'bg-amber-500';
      default: return 'bg-slate-950';
    }
  };

  const getPaymentStatusBadge = () => {
    if (!shipment.customsCharge) return null;
    
    switch (shipment.paymentStatus) {
      case PaymentStatus.VERIFIED:
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-200">✓ Paid</span>;
      case PaymentStatus.PENDING:
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-200">⏳ Awaiting</span>;
      case PaymentStatus.FAILED:
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-[8px] font-black uppercase tracking-widest border border-rose-200">✗ Failed</span>;
      default:
        return null;
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-8 py-6">
        <p className="text-base font-black text-slate-950 uppercase tracking-tight">{shipment.trackingNumber}</p>
        <p className="text-[11px] font-bold text-slate-400 mt-1">{shipment.recipientName}</p>
      </td>
      <td className="px-8 py-6">
        {shipment.customsCharge && (
          <div className="mt-2 text-[10px] font-bold text-amber-700">💰 ${shipment.customsCharge.toFixed(2)}</div>
        )}
      </td>
      <td className="px-8 py-6">
        {getPaymentStatusBadge() || (
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(shipment.currentStatus)}`}></div>
            <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{shipment.currentStatus}</span>
          </div>
        )}
        {shipment.paymentStatus !== PaymentStatus.NONE && !getPaymentStatusBadge() && (
          <div className="flex items-center gap-3 mt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(shipment.currentStatus)}`}></div>
            <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{shipment.currentStatus}</span>
          </div>
        )}
      </td>
      <td className="px-8 py-6">
        <span className="text-slate-950 uppercase">{shipment.destination}</span>
        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">
          Est: {shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'TBD'}
        </p>
      </td>
      <td className="px-8 py-6">
        <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
          {shipment.serviceType}
        </span>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(shipment.currentStatus)}`}></div>
          <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{shipment.currentStatus}</span>
        </div>
      </td>
      <td className="px-8 py-6 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {shipment.paymentStatus === PaymentStatus.PENDING && (
            <button
              onClick={handleVerifyPayment}
              className="p-2.5 hover:bg-green-50 rounded-full text-green-600 transition-colors"
              title="Verify Payment"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleStatusUpdate}
            className="p-2.5 hover:bg-amber-50 rounded-full text-amber-600 transition-colors"
            title="Log Protocol"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={handleEdit}
            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            title="Modify Registry"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleViewDetails}
            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            title="Black Box Data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="p-2.5 hover:bg-rose-50 rounded-full text-rose-500 transition-colors"
            title="Void Asset"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};
