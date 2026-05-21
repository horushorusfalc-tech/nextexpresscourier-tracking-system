import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { ShipmentStatus } from '../types';
import { z } from 'zod';

export const Ship: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    senderName: '',
    senderAddress: '',
    senderCity: '',
    senderCountry: '',
    recipientName: '',
    recipientEmail: '',
    recipientAddress: '',
    recipientCity: '',
    recipientCountry: '',
    weight: '',
    dimensions: '',
    serviceType: 'Standard Global'
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const senderNameSchema = z.string().min(2, 'Sender name must be at least 2 characters').max(100);
      const senderAddressSchema = z.string().min(5, 'Sender address must be at least 5 characters').max(500);
      const originSchema = z.string().min(2, 'Origin must be at least 2 characters').max(200);

      if (!formData.senderName.trim()) newErrors.senderName = 'Sender name is required';
      else if (!senderNameSchema.safeParse(formData.senderName).success) newErrors.senderName = 'Invalid sender name';

      if (!formData.senderAddress.trim()) newErrors.senderAddress = 'Sender address is required';
      else if (!senderAddressSchema.safeParse(formData.senderAddress).success) newErrors.senderAddress = 'Invalid address';

      const origin = `${formData.senderCity}, ${formData.senderCountry}`;
      if (!originSchema.safeParse(origin).success || !formData.senderCity.trim()) newErrors.senderCity = 'City is required';
      if (!formData.senderCountry.trim()) newErrors.senderCountry = 'Country is required';
    } else if (step === 2) {
      const recipientNameSchema = z.string().min(2, 'Recipient name must be at least 2 characters').max(100);
      const recipientEmailSchema = z.string().email('Invalid email format').max(255);
      const recipientAddressSchema = z.string().min(5, 'Recipient address must be at least 5 characters').max(500);

      if (!formData.recipientName.trim()) newErrors.recipientName = 'Recipient name is required';
      else if (!recipientNameSchema.safeParse(formData.recipientName).success) newErrors.recipientName = 'Invalid recipient name';

      if (!formData.recipientEmail.trim()) newErrors.recipientEmail = 'Email is required';
      else if (!recipientEmailSchema.safeParse(formData.recipientEmail).success) newErrors.recipientEmail = 'Invalid email format';

      if (!formData.recipientAddress.trim()) newErrors.recipientAddress = 'Recipient address is required';
      else if (!recipientAddressSchema.safeParse(formData.recipientAddress).success) newErrors.recipientAddress = 'Invalid address';

      if (!formData.recipientCity.trim()) newErrors.recipientCity = 'City is required';
      if (!formData.recipientCountry.trim()) newErrors.recipientCountry = 'Country is required';
    } else if (step === 3) {
      const weightSchema = z.union([
        z.string().regex(/^\d+(\.\d+)?\s*(kg|KG|Kg|g|G|lb|LB|lbs|LBS)?$/, 'Weight must be a valid number'),
        z.number().positive('Weight must be positive')
      ]);

      if (!formData.weight.trim()) newErrors.weight = 'Weight is required';
      else if (!weightSchema.safeParse(formData.weight).success) newErrors.weight = 'Invalid weight format';

      if (!formData.serviceType) newErrors.serviceType = 'Service type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const generatedTracking = storageService.generateTrackingNumber();
      setTrackingNumber(generatedTracking);

      const origin = `${formData.senderCity}, ${formData.senderCountry}`;
      const destination = `${formData.recipientCity}, ${formData.recipientCountry}`;

      await storageService.saveShipment({
        trackingNumber: generatedTracking,
        senderName: formData.senderName,
        senderAddress: formData.senderAddress,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        recipientAddress: formData.recipientAddress,
        origin,
        destination,
        serviceType: formData.serviceType,
        weight: formData.weight,
        dimensions: formData.dimensions || '',
        currentStatus: ShipmentStatus.PENDING,
        estimatedDelivery: 'Awaiting Review'
      });

      setSubmitted(true);
    } catch {
      alert("Submission error. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        <div className="max-w-2xl mx-auto text-center fade-in-up">
          <div className="w-24 h-24 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-[8px_8px_0_0_rgba(15,23,42,0.2)]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-950 mb-6 uppercase tracking-tighter">Request Lodged Successfully</h1>
          <p className="text-slate-600 mb-12 leading-relaxed font-medium text-lg">
            Your dispatch request has been submitted to our logistics center. A representative will contact you via email with a formal quote and tracking ID.
          </p>
          <div className="bg-slate-950 text-white p-10 rounded-[3rem] inline-block border-4 border-amber-600 shadow-[12px_12px_0_0_rgba(15,23,42,0.1)]">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3">Tracking Number</p>
            <p className="text-3xl font-mono font-black tracking-tighter">{trackingNumber}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="block mx-auto mt-12 text-[11px] font-black text-slate-400 hover:text-slate-950 uppercase tracking-widest transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-20 md:py-28">
      <style>{`
        :root {
          --font-display: 'Syne', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .step-enter {
          animation: slide-in 0.4s ease-out forwards;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16 md:mb-20">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] mb-4">Dispatch Protocol</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-950 tracking-tighter mb-6 uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            Initiate Shipment
          </h1>
          <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium max-w-2xl">
            Provide the necessary details for your international dispatch. Our team will verify the routing and issue a tracking reference within 24 hours.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-16 md:mb-20">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0">
              <div className="h-full bg-amber-600 transition-all duration-500" style={{ width: `${((currentStep - 1) / 2) * 100}%` }}></div>
            </div>

            {[
              { num: 1, label: 'Sender' },
              { num: 2, label: 'Recipient' },
              { num: 3, label: 'Package' }
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;

              return (
                <div
                  key={step.num}
                  className={`relative z-10 flex flex-col items-center ${step.num < currentStep ? 'cursor-pointer' : ''}`}
                  onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                >
                  <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${
                    isCompleted ? 'bg-amber-600 border-amber-600 text-white' :
                    isActive ? 'bg-white border-slate-950 text-slate-950' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-lg font-black">{step.num}</span>
                    )}
                  </div>
                  <span className={`mt-3 text-[10px] font-black uppercase tracking-widest ${isActive || isCompleted ? 'text-slate-950' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Steps */}
        <div className="relative min-h-[500px]">
          {/* Step 1: Sender */}
          {currentStep === 1 && (
            <div className="step-enter">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                <div className="col-span-1">
                  <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-widest mb-2">Step 01 — Sender Details</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">The primary contact and origin address for this consignment.</p>
                </div>
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <input
                      className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                        errors.senderName ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                      }`}
                      placeholder="Full Legal Name"
                      value={formData.senderName}
                      onChange={e => {
                        setFormData({...formData, senderName: e.target.value});
                        if (errors.senderName) setErrors({...errors, senderName: ''});
                      }}
                    />
                    {errors.senderName && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.senderName}</p>}
                  </div>
                  <div>
                    <textarea
                      className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 resize-none ${
                        errors.senderAddress ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                      }`}
                      placeholder="Complete Pickup Address"
                      rows={3}
                      value={formData.senderAddress}
                      onChange={e => {
                        setFormData({...formData, senderAddress: e.target.value});
                        if (errors.senderAddress) setErrors({...errors, senderAddress: ''});
                      }}
                    />
                    {errors.senderAddress && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.senderAddress}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.senderCity ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        placeholder="Origin City"
                        value={formData.senderCity}
                        onChange={e => {
                          setFormData({...formData, senderCity: e.target.value});
                          if (errors.senderCity) setErrors({...errors, senderCity: ''});
                        }}
                      />
                      {errors.senderCity && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.senderCity}</p>}
                    </div>
                    <div>
                      <input
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.senderCountry ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        placeholder="Origin Country"
                        value={formData.senderCountry}
                        onChange={e => {
                          setFormData({...formData, senderCountry: e.target.value});
                          if (errors.senderCountry) setErrors({...errors, senderCountry: ''});
                        }}
                      />
                      {errors.senderCountry && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.senderCountry}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Recipient */}
          {currentStep === 2 && (
            <div className="step-enter">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                <div className="col-span-1">
                  <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-widest mb-2">Step 02 — Recipient Details</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Final destination information and recipient contact.</p>
                </div>
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <input
                      className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                        errors.recipientName ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                      }`}
                      placeholder="Recipient Full Name"
                      value={formData.recipientName}
                      onChange={e => {
                        setFormData({...formData, recipientName: e.target.value});
                        if (errors.recipientName) setErrors({...errors, recipientName: ''});
                      }}
                    />
                    {errors.recipientName && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.recipientName}</p>}
                  </div>
                  <div>
                    <input
                      type="email"
                      className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                        errors.recipientEmail ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                      }`}
                      placeholder="Recipient Email Address"
                      value={formData.recipientEmail}
                      onChange={e => {
                        setFormData({...formData, recipientEmail: e.target.value});
                        if (errors.recipientEmail) setErrors({...errors, recipientEmail: ''});
                      }}
                    />
                    {errors.recipientEmail && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.recipientEmail}</p>}
                  </div>
                  <div>
                    <textarea
                      className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 resize-none ${
                        errors.recipientAddress ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                      }`}
                      placeholder="Delivery Address"
                      rows={3}
                      value={formData.recipientAddress}
                      onChange={e => {
                        setFormData({...formData, recipientAddress: e.target.value});
                        if (errors.recipientAddress) setErrors({...errors, recipientAddress: ''});
                      }}
                    />
                    {errors.recipientAddress && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.recipientAddress}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.recipientCity ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        placeholder="Destination City"
                        value={formData.recipientCity}
                        onChange={e => {
                          setFormData({...formData, recipientCity: e.target.value});
                          if (errors.recipientCity) setErrors({...errors, recipientCity: ''});
                        }}
                      />
                      {errors.recipientCity && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.recipientCity}</p>}
                    </div>
                    <div>
                      <input
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.recipientCountry ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        placeholder="Destination Country"
                        value={formData.recipientCountry}
                        onChange={e => {
                          setFormData({...formData, recipientCountry: e.target.value});
                          if (errors.recipientCountry) setErrors({...errors, recipientCountry: ''});
                        }}
                      />
                      {errors.recipientCountry && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.recipientCountry}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Package + Review */}
          {currentStep === 3 && (
            <div className="step-enter">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
                <div className="col-span-1">
                  <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-widest mb-2">Step 03 — Package Details</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Approximate weight and service level required.</p>
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.weight ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        placeholder="Weight (e.g. 5.5 kg)"
                        value={formData.weight}
                        onChange={e => {
                          setFormData({...formData, weight: e.target.value});
                          if (errors.weight) setErrors({...errors, weight: ''});
                        }}
                      />
                      {errors.weight && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.weight}</p>}
                    </div>
                    <div>
                      <select
                        className={`w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider transition-all border-2 ${
                          errors.serviceType ? 'border-rose-500' : 'border-slate-200 focus:border-slate-950'
                        }`}
                        value={formData.serviceType}
                        onChange={e => {
                          setFormData({...formData, serviceType: e.target.value});
                          if (errors.serviceType) setErrors({...errors, serviceType: ''});
                        }}
                      >
                        <option>Standard Global</option>
                        <option>Priority Express</option>
                        <option>Next Day Air</option>
                        <option>Freight Logistics</option>
                      </select>
                      {errors.serviceType && <p className="text-xs text-rose-600 font-bold mt-2 ml-2">{errors.serviceType}</p>}
                    </div>
                  </div>
                  <div>
                    <input
                      className="w-full px-8 py-5 rounded-[3rem] text-sm font-black uppercase tracking-wider border-2 border-slate-200 transition-all"
                      placeholder="Dimensions (e.g. 20x20x20 cm) - Optional"
                      value={formData.dimensions}
                      onChange={e => setFormData({...formData, dimensions: e.target.value})}
                    />
                  </div>

                  {/* Review Summary */}
                  <div className="mt-10 pt-10 border-t-2 border-slate-200">
                    <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-widest mb-6">Review Summary</h4>
                    <div className="bg-slate-50 p-8 rounded-[3rem] space-y-6 border-2 border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">From</p>
                          <p className="text-base font-black text-slate-950 uppercase">{formData.senderName}</p>
                          <p className="text-xs text-slate-600 font-medium">{formData.senderAddress}</p>
                          <p className="text-xs text-slate-600 font-medium">{formData.senderCity}, {formData.senderCountry}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">To</p>
                          <p className="text-base font-black text-slate-950 uppercase">{formData.recipientName}</p>
                          <p className="text-xs text-slate-600 font-medium">{formData.recipientEmail}</p>
                          <p className="text-xs text-slate-600 font-medium">{formData.recipientAddress}</p>
                          <p className="text-xs text-slate-600 font-medium">{formData.recipientCity}, {formData.recipientCountry}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t-2 border-slate-200">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Service</p>
                          <p className="text-base font-black text-slate-950 uppercase">{formData.serviceType}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Weight</p>
                          <p className="text-base font-black text-slate-950 uppercase">{formData.weight || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="pt-10 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed uppercase tracking-wider">
            By submitting, you agree to our transit protocols and global shipping terms.
          </p>
          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="bg-white border-2 border-slate-950 text-slate-950 px-10 py-5 rounded-[3rem] text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95"
              >
                Back
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-slate-950 hover:bg-black text-white px-10 py-5 rounded-[3rem] text-[11px] font-black uppercase tracking-widest shadow-[8px_8px_0_0_rgba(15,23,42,0.2)] transition-all active:scale-95"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-5 rounded-[3rem] text-[11px] font-black uppercase tracking-widest shadow-[8px_8px_0_0_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Submit Dispatch Request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
