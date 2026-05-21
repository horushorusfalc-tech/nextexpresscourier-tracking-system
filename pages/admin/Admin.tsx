import React, { useEffect } from 'react';
import { storageService, supabase } from '../../services/storage';
import { UserRole, ShipmentStatus, Shipment } from '../../types';
import { AdminProvider, useAdmin } from './AdminContext';
import { AdminToolbar } from './components/AdminToolbar';
import { MetricsCards } from './components/MetricsCards';
import { LedgerView } from './components/LedgerView';
import { PulseView } from './components/PulseView';
import { AssetRegistryModal } from './components/modals/AssetRegistryModal';
import { ProtocolCommandModal } from './components/modals/ProtocolCommandModal';
import { AuditTrailModal } from './components/modals/AuditTrailModal';
import { CancelModal } from './components/modals/CancelModal';
import { TemplateManager } from './components/modals/TemplateManager';

const AdminContent: React.FC<{ role: UserRole }> = ({ role }) => {
  const { state, dispatch } = useAdmin();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [shipData, templateData] = await Promise.all([
        storageService.getShipments(),
        storageService.getEmailTemplates()
      ]);
      dispatch({ type: 'SET_SHIPMENTS', payload: shipData });
      dispatch({ type: 'SET_TEMPLATES', payload: templateData });
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error') => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });
    setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4000);
  };

  const handleSaveAsset = async (e: React.FormEvent, imageFile?: File) => {
    e.preventDefault();
    dispatch({ type: 'SET_IS_SUBMITTING', payload: true });
    const isNew = !state.selectedShipment;
    try {
      const payload: Partial<Shipment> = {
        ...state.formData,
        trackingNumber: state.formData.trackingNumber?.trim().toUpperCase() || storageService.generateTrackingNumber(),
        id: state.selectedShipment?.id
      };
      const saved = await storageService.saveShipment(payload);
      if (imageFile && saved.id) {
        await storageService.uploadShipmentImage(saved.id, imageFile);
      }
      if (isNew) {
        try {
          const trackUrl = `${window.location.origin}${window.location.pathname || ''}#/track/${saved.trackingNumber}`;
          await storageService.invokeEdgeFunction('send-shipment-registered', {
            body: {
              shipmentId: saved.id,
              trackingNumber: saved.trackingNumber,
              recipientName: saved.recipientName,
              recipientEmail: saved.recipientEmail,
              senderName: saved.senderName,
              senderEmail: saved.senderEmail || undefined,
              origin: saved.origin,
              destination: saved.destination,
              trackUrl
            }
          });
        } catch (emailErr) {
          console.warn('Registration emails could not be sent:', emailErr);
        }
      }
      showNotification('Ledger Updated.', 'success');
      dispatch({ type: 'SET_ACTIVE_MODAL', payload: null });
      dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: null });
      dispatch({ type: 'RESET_FORMS' });
      refreshData();
    } catch (err: any) {
      const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown Error';
      showNotification(`Sync Failed: ${message}`, 'error');
      console.error('Save asset error:', err);
    } finally {
      dispatch({ type: 'SET_IS_SUBMITTING', payload: false });
    }
  };

  const handleUpdateStatus = async (form: {
    status: ShipmentStatus;
    location: string;
    description: string;
    sendEmail: boolean;
    selectedTemplateId: string;
  }, e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedShipment) return;
    dispatch({ type: 'SET_IS_SUBMITTING', payload: true });
    try {
      const selectedTemplate = state.templates.find(t => t.id === form.selectedTemplateId);
      await storageService.addTrackingEvent(state.selectedShipment.id, {
        status: form.status,
        location: form.location,
        description: form.description
      }, form.sendEmail ? selectedTemplate : undefined);
      showNotification('Protocol Logged.', 'success');
      dispatch({ type: 'SET_ACTIVE_MODAL', payload: null });
      dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: null });
      dispatch({ type: 'RESET_FORMS' });
      refreshData();
    } catch (err) {
      showNotification('Operational Error.', 'error');
    } finally {
      dispatch({ type: 'SET_IS_SUBMITTING', payload: false });
    }
  };

  const handleCancelShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedShipment) return;
    dispatch({ type: 'SET_IS_SUBMITTING', payload: true });
    try {
      await storageService.addTrackingEvent(state.selectedShipment.id, {
        status: ShipmentStatus.CANCELLED,
        location: 'SYSTEM COMMAND',
        description: `AUTHORIZED CANCELLATION: ${state.cancelReason}`
      });
      showNotification('Asset Voided.', 'success');
      dispatch({ type: 'SET_ACTIVE_MODAL', payload: null });
      dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: null });
      dispatch({ type: 'RESET_FORMS' });
      refreshData();
    } catch (err) {
      showNotification('Cancellation Failed.', 'error');
    } finally {
      dispatch({ type: 'SET_IS_SUBMITTING', payload: false });
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storageService.saveEmailTemplate(state.templateForm);
      showNotification('Template Updated.', 'success');
      dispatch({ type: 'SET_TEMPLATE_FORM', payload: { name: '', subject: '', body: '', type: 'General' } });
      refreshData();
    } catch (err) {
      showNotification('Template Error.', 'error');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await storageService.deleteEmailTemplate(id);
      showNotification('Template removed.', 'success');
      refreshData();
    } catch (err) {
      showNotification('Failed to delete.', 'error');
    }
  };

  const closeModal = () => {
    dispatch({ type: 'SET_ACTIVE_MODAL', payload: null });
    dispatch({ type: 'SET_SELECTED_SHIPMENT', payload: null });
    dispatch({ type: 'RESET_FORMS' });
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <style>{`
          @keyframes pulse-ring {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          .pulse-ring {
            animation: pulse-ring 2s ease-in-out infinite;
          }
        `}</style>
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-slate-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-10"></div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Synchronizing Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6">
        <AdminToolbar />
        <MetricsCards />

        <div className="bg-white rounded-[3rem] shadow-[16px_16px_0_0_rgba(15,23,42,0.04)] border-2 border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
          <div className="flex-1 relative">
            {state.viewMode === 'PULSE' ? (
              <PulseView />
            ) : (
              <LedgerView />
            )}
          </div>
        </div>

        {state.activeModal === 'registry' && (
          <AssetRegistryModal onSave={handleSaveAsset} onClose={closeModal} />
        )}
        {state.activeModal === 'protocol' && (
          <ProtocolCommandModal onSave={handleUpdateStatus} onClose={closeModal} />
        )}
        {state.activeModal === 'audit' && (
          <AuditTrailModal onClose={closeModal} />
        )}
        {state.activeModal === 'cancel' && (
          <CancelModal onSave={handleCancelShipment} onClose={closeModal} />
        )}
        {state.activeModal === 'templates' && (
          <TemplateManager onSave={handleSaveTemplate} onDelete={deleteTemplate} onClose={closeModal} />
        )}

        {state.notification && (
          <div className="fixed bottom-10 right-10 z-[3000] animate-in slide-in-from-right-10 duration-500">
            <div className={`px-10 py-5 rounded-[3rem] shadow-[8px_8px_0_0_rgba(15,23,42,0.15)] flex items-center gap-4 border-2 ${
              state.notification.type === 'success' ? 'bg-slate-950 text-white border-slate-950' :
              state.notification.type === 'error' ? 'bg-rose-600 text-white border-rose-600' : 'bg-blue-600 text-white border-blue-600'
            }`}>
              <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">{state.notification.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Admin: React.FC<{ role: UserRole }> = ({ role }) => {
  return (
    <AdminProvider>
      <AdminContent role={role} />
    </AdminProvider>
  );
};

export default Admin;
