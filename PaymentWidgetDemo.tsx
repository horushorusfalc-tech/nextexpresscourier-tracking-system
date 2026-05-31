import React from 'react';
import { PaymentWidget } from './components/PaymentWidget';
import { Shipment, ShipmentStatus, PaymentStatus } from './types';

/**
 * Demo page to showcase the Payment Widget in action
 * Shows what customers see when a shipment has a customs charge
 */

export const PaymentWidgetDemo: React.FC = () => {
  // Mock shipment with customs charge
  const mockShipment: Shipment = {
    id: 'demo-123',
    trackingNumber: 'NEC12345678',
    senderName: 'John Smith',
    senderAddress: '123 Oxford St, London, UK',
    senderEmail: 'john@example.com',
    recipientName: 'Jane Doe',
    recipientEmail: 'jane@example.com',
    recipientAddress: '456 Broadway, New York, USA',
    origin: 'London, UK',
    destination: 'New York, USA',
    currentStatus: ShipmentStatus.CUSTOMS_HOLD,
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    weight: '2.5 kg',
    dimensions: '30x20x15 cm',
    serviceType: 'Priority Express',
    contentDescription: 'Electronics and accessories',
    declaredValue: 450,
    packagingType: 'Box',
    cancellationReason: null,
    customsCharge: 85.50, // This triggers the payment widget
    paymentStatus: PaymentStatus.PENDING, // Payment not yet verified
    paymentVerifiedAt: null,
    paymentNotes: null,
    createdAt: new Date().toISOString(),
    imageUrl: null,
    events: [
      {
        id: 'event-1',
        timestamp: new Date().toISOString(),
        status: ShipmentStatus.CUSTOMS_HOLD,
        location: 'New York Customs',
        description: 'Package held for customs inspection. A customs charge of $85.50 is required for clearance.'
      },
      {
        id: 'event-2',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: ShipmentStatus.IN_TRANSIT,
        location: 'London Hub',
        description: 'Package departed from origin'
      }
    ],
    emailLogs: [],
    paymentLogs: []
  };

  return (
    <div className="min-h-screen bg-slate-50 py-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-2">Payment Widget Demo</h1>
          <p className="text-slate-600">
            This demonstrates the payment widget customers see when a shipment has a customs charge due.
          </p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8">
          <div className="mb-8 pb-6 border-b-2 border-slate-200">
            <h2 className="text-lg font-black text-slate-950 mb-2">Shipment Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Tracking</p>
                <p className="text-slate-950 font-bold">{mockShipment.trackingNumber}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Status</p>
                <p className="text-amber-700 font-bold">{mockShipment.currentStatus}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Route</p>
                <p className="text-slate-950 font-bold">{mockShipment.origin} → {mockShipment.destination}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase">Payment Status</p>
                <p className="text-amber-700 font-bold">{mockShipment.paymentStatus}</p>
              </div>
            </div>
          </div>

          {/* Payment Widget */}
          <PaymentWidget shipment={mockShipment} />
        </div>

        {/* Widget Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-950 mb-3">🎯 QR Code Payment</h3>
            <p className="text-sm text-slate-600">
              Customers scan a QR code with wallet address pre-filled, making payment instant and secure.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-950 mb-3">📋 Payment Instructions</h3>
            <p className="text-sm text-slate-600">
              Custom payment instructions loaded from admin settings guide customers through the process.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-950 mb-3">🔐 Wallet Address Management</h3>
            <p className="text-sm text-slate-600">
              Admins configure wallet address in settings. Widget displays and allows copying for payment.
            </p>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-950 mb-3">✓ Payment Verification</h3>
            <p className="text-sm text-slate-600">
              Admin verifies payments through the admin panel. Shipment auto-advances when payment is confirmed.
            </p>
          </div>
        </div>

        {/* API Integration */}
        <div className="mt-12 bg-slate-900 text-white rounded-2xl p-8">
          <h3 className="font-black text-lg mb-4">Backend Integration</h3>
          <div className="space-y-3 text-sm font-mono">
            <div>
              <p className="text-amber-400 mb-2">// Payment Methods in storageService:</p>
              <ul className="space-y-2 text-slate-300 ml-4">
                <li>→ getSettings() - Load wallet address & payment instructions</li>
                <li>→ claimPayment(shipmentId, amount) - Log payment claim</li>
                <li>→ verifyPayment(shipmentId, notes) - Verify & advance shipment</li>
                <li>→ getPaymentLogs(shipmentId) - Get payment history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Admin Workflow */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
          <h3 className="font-black text-slate-950 mb-4">Admin Payment Workflow</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">1.</span>
              <p className="text-slate-700">Mark shipment as "In Customs" from Protocol Command modal</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">2.</span>
              <p className="text-slate-700">Enter customs charge amount (e.g., $85.50)</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">3.</span>
              <p className="text-slate-700">Customer sees PaymentWidget with QR code on tracking page</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">4.</span>
              <p className="text-slate-700">Customer sends payment, clicks "I've Sent Payment"</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">5.</span>
              <p className="text-slate-700">Admin sees payment pending in ShipmentRow (payment badge)</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">6.</span>
              <p className="text-slate-700">Admin clicks verify button, confirms payment with optional notes</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">7.</span>
              <p className="text-slate-700">Shipment status auto-advances to "Customs Cleared"</p>
            </div>
            <div className="flex gap-3">
              <span className="font-black text-blue-600 flex-shrink-0">8.</span>
              <p className="text-slate-700">Customer sees green "Payment Verified" badge on tracking page</p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
          <p className="text-sm text-green-800">
            ✓ The payment widget is fully integrated and ready for production use. 
            Simply configure your wallet address in the admin panel settings (💰 icon in toolbar).
          </p>
        </div>
      </div>
    </div>
  );
};
