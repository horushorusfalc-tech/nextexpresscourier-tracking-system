import { z } from 'zod';
import { ShipmentStatus } from '../types';

// Service Type enum - combining all options from Ship.tsx and AssetRegistryModal.tsx
export const ServiceTypeEnum = z.enum([
  'Standard Global',
  'Priority Express',
  'Next Day Air',
  'Freight Logistics',
  'Standard Freight',
  'Ocean Cargo',
  'Secure Couriers'
]);

// Shipment Schema
export const shipmentSchema = z.object({
  id: z.string().optional(),
  trackingNumber: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val.trim().toUpperCase();
    }
    return val;
  },
  z.union([
    z.string().regex(/^NEC\d{8}$/, 'Tracking number must match format: NEC followed by 8 digits'),
    z.undefined()
  ]).optional()),
  senderName: z.string()
    .min(2, 'Sender name must be at least 2 characters')
    .max(100, 'Sender name must not exceed 100 characters'),
  senderAddress: z.string()
    .min(5, 'Sender address must be at least 5 characters')
    .max(500, 'Sender address must not exceed 500 characters'),
  recipientName: z.string()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(100, 'Recipient name must not exceed 100 characters'),
  recipientEmail: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),
  senderEmail: z.union([z.string().email('Invalid sender email').max(255), z.literal('')]).optional(),
  recipientAddress: z.string()
    .min(5, 'Recipient address must be at least 5 characters')
    .max(500, 'Recipient address must not exceed 500 characters'),
  origin: z.string()
    .min(2, 'Origin must be at least 2 characters')
    .max(200, 'Origin must not exceed 200 characters'),
  destination: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(200, 'Destination must not exceed 200 characters'),
  currentStatus: z.nativeEnum(ShipmentStatus).optional(),
  estimatedDelivery: z.string().optional(),
  weight: z.union([
    z.string().regex(/^\d+(\.\d+)?\s*(kg|KG|Kg|g|G|lb|LB|lbs|LBS)?$/, 'Weight must be a valid number (e.g., "5.5 kg", "10", "2.5 lb")'),
    z.number().positive('Weight must be a positive number')
  ]).transform(val => {
    if (typeof val === 'number') return val.toString();
    return val.trim();
  }),
  dimensions: z.string().max(100, 'Dimensions must not exceed 100 characters').optional(),
  serviceType: ServiceTypeEnum,
  contentDescription: z.string().max(500, 'Content description must not exceed 500 characters').optional(),
  declaredValue: z.string().max(50, 'Declared value must not exceed 50 characters').optional(),
  packagingType: z.string().max(50, 'Packaging type must not exceed 50 characters').optional(),
  cancellationReason: z.string().max(500, 'Cancellation reason must not exceed 500 characters').optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

// Tracking Event Schema
export const trackingEventSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  location: z.string()
    .min(2, 'Location must be at least 2 characters')
    .max(200, 'Location must not exceed 200 characters'),
  status: z.nativeEnum(ShipmentStatus, {
    errorMap: () => ({ message: 'Status must be a valid ShipmentStatus enum value' })
  }),
  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  notified: z.boolean().optional(),
  isCustomsEvent: z.boolean().optional(),
});

// Email Template Schema
export const emailTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string()
    .min(2, 'Template name must be at least 2 characters')
    .max(100, 'Template name must not exceed 100 characters'),
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must not exceed 200 characters'),
  body: z.string()
    .min(10, 'Body must be at least 10 characters')
    .max(5000, 'Body must not exceed 5000 characters'),
  type: z.string()
    .min(1, 'Type is required')
    .max(50, 'Type must not exceed 50 characters'),
  createdAt: z.string().optional(),
});

// Sanitize function: strips HTML tags, removes script tags, preserves address-safe characters
export function sanitize(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all HTML tags but preserve text content
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities (only in browser environment)
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = sanitized;
    sanitized = textarea.value;
  } else {
    // Fallback for non-browser environments: basic entity decoding
    sanitized = sanitized
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  
  // Remove potentially dangerous characters but keep address-safe characters
  // Allow: letters, numbers, spaces, common punctuation used in addresses
  sanitized = sanitized.replace(/[<>]/g, ''); // Remove any remaining angle brackets
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Validation error type
export type ValidationError = {
  field: string;
  message: string;
};

// Helper function to format Zod errors into structured format
export function formatZodError(error: z.ZodError | unknown): ValidationError[] {
  if (!error || typeof error !== 'object' || !('errors' in error)) {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as any).message)
      : 'Unknown validation error';
    return [{ field: 'unknown', message }];
  }

  const zodError = error as z.ZodError;
  if (!Array.isArray(zodError.errors)) {
    return [{ field: 'unknown', message: 'Invalid Zod error format' }];
  }

  return zodError.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

