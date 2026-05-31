
export enum ShipmentStatus {
  PENDING = 'Pending',
  PRE_TRANSIT = 'Pre-Transit',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  CUSTOMS_HOLD = 'Held in Customs',
  CUSTOMS_CLEARED = 'Customs Cleared',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  DELIVERY_FAILED = 'Delivery Failed',
  ON_HOLD = 'On Hold',
  CANCELLED = 'Cancelled'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

export interface TrackingEvent {
  id: string;
  timestamp: string;
  location: string;
  status: ShipmentStatus;
  description: string;
  notified?: boolean; 
  isCustomsEvent?: boolean;
}

export interface EmailLog {
  id: string;
  sentAt: string;
  subject: string;
  body: string;
  recipient: string;
  status: 'SENT' | 'FAILED';
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt: string;
}

export interface PaymentLog {
  id: string;
  shipmentId: string;
  amount: number;
  status: 'claimed' | 'verified' | 'failed';
  claimedAt: string;
  verifiedAt?: string;
  verifiedByUserId?: string;
  notes?: string;
  transactionHash?: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderAddress: string;
  customsCharge?: number;
  paymentStatus?: PaymentStatus;
  paymentVerifiedAt?: string;
  paymentNotes?: string;
  paymentLogs?: PaymentLog[];
  senderEmail?: string;
  recipientName: string;
  recipientEmail: string;
  recipientAddress: string;
  origin: string;
  destination: string;
  currentStatus: ShipmentStatus;
  estimatedDelivery: string;
  weight: string;
  dimensions: string;
  serviceType: string;
  contentDescription?: string;
  declaredValue?: string;
  packagingType?: string;
  imageUrl?: string;
  events: TrackingEvent[];
  emailLogs?: EmailLog[];
  cancellationReason?: string;
  createdAt: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
}
