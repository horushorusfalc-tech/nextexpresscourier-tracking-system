
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Shipment, ShipmentStatus, EmailTemplate } from '../../types';

type NotificationType = 'success' | 'info' | 'error';
type ViewMode = 'LEDGER' | 'PULSE';
type ModalType = 'registry' | 'protocol' | 'audit' | 'cancel' | 'templates' | null;

interface AdminState {
  shipments: Shipment[];
  templates: EmailTemplate[];
  loading: boolean;
  error: string | null;
  selectedShipment: Shipment | null;
  activeModal: ModalType;
  searchQuery: string;
  statusFilter: ShipmentStatus | null;
  viewMode: ViewMode;
  notification: { message: string; type: NotificationType } | null;
  isSubmitting: boolean;
  // Form states
  formData: Partial<Shipment>;
  statusForm: {
    status: ShipmentStatus;
    location: string;
    description: string;
    sendEmail: boolean;
    selectedTemplateId: string;
  };
  cancelReason: string;
  templateForm: Partial<EmailTemplate>;
}

type AdminAction =
  | { type: 'SET_SHIPMENTS'; payload: Shipment[] }
  | { type: 'SET_TEMPLATES'; payload: EmailTemplate[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_SHIPMENT'; payload: Shipment | null }
  | { type: 'SET_ACTIVE_MODAL'; payload: ModalType }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: ShipmentStatus | null }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_NOTIFICATION'; payload: { message: string; type: NotificationType } | null }
  | { type: 'SET_IS_SUBMITTING'; payload: boolean }
  | { type: 'SET_FORM_DATA'; payload: Partial<Shipment> }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<Shipment> }
  | { type: 'SET_STATUS_FORM'; payload: Partial<AdminState['statusForm']> }
  | { type: 'SET_CANCEL_REASON'; payload: string }
  | { type: 'SET_TEMPLATE_FORM'; payload: Partial<EmailTemplate> }
  | { type: 'RESET_FORMS' };

const initialState: AdminState = {
  shipments: [],
  templates: [],
  loading: true,
  error: null,
  selectedShipment: null,
  activeModal: null,
  searchQuery: '',
  statusFilter: null,
  viewMode: 'LEDGER',
  notification: null,
  isSubmitting: false,
  formData: {
    serviceType: 'Priority Express',
    currentStatus: ShipmentStatus.PENDING,
    packagingType: 'Box',
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  statusForm: {
    status: ShipmentStatus.IN_TRANSIT,
    location: '',
    description: '',
    sendEmail: true,
    selectedTemplateId: 'ai'
  },
  cancelReason: '',
  templateForm: { name: '', subject: '', body: '', type: 'General' }
};

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'SET_SHIPMENTS':
      return { ...state, shipments: action.payload };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SELECTED_SHIPMENT':
      return { ...state, selectedShipment: action.payload };
    case 'SET_ACTIVE_MODAL':
      return { ...state, activeModal: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'SET_IS_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };
    case 'UPDATE_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case 'SET_STATUS_FORM':
      return { ...state, statusForm: { ...state.statusForm, ...action.payload } };
    case 'SET_CANCEL_REASON':
      return { ...state, cancelReason: action.payload };
    case 'SET_TEMPLATE_FORM':
      return { ...state, templateForm: action.payload };
    case 'RESET_FORMS':
      return {
        ...state,
        formData: {
          serviceType: 'Priority Express',
          currentStatus: ShipmentStatus.PENDING,
          packagingType: 'Box',
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        statusForm: {
          status: ShipmentStatus.IN_TRANSIT,
          location: '',
          description: '',
          sendEmail: true,
          selectedTemplateId: 'ai'
        },
        cancelReason: '',
        templateForm: { name: '', subject: '', body: '', type: 'General' }
      };
    default:
      return state;
  }
}

interface AdminContextType {
  state: AdminState;
  dispatch: React.Dispatch<AdminAction>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState);

  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

