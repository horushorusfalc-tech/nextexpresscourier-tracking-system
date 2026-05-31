
import { createClient } from '@supabase/supabase-js';
import { Shipment, ShipmentStatus, TrackingEvent, UserRole, EmailLog, EmailTemplate, PaymentStatus, PaymentLog, AppSettings } from '../types';
import { shipmentSchema, trackingEventSchema, emailTemplateSchema, formatZodError, sanitize, ValidationError } from './validations';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

function normalizeRole(raw: unknown): UserRole {
  if (raw === 'ADMIN' || (typeof raw === 'string' && raw.toUpperCase() === 'ADMIN')) return UserRole.ADMIN;
  return UserRole.STAFF;
}

const mapShipment = (dbData: any): Shipment => {
  const rawEvents = dbData.tracking_events || [];
  const rawLogs = dbData.email_logs || [];
  const rawPaymentLogs = dbData.payment_logs || [];
  
  return {
    id: dbData.id,
    trackingNumber: dbData.tracking_number ?? '',
    senderName: dbData.sender_name ?? '',
    senderAddress: dbData.sender_address ?? '',
    recipientName: dbData.recipient_name ?? '',
    recipientEmail: dbData.recipient_email ?? '',
    senderEmail: dbData.sender_email ?? undefined,
    recipientAddress: dbData.recipient_address ?? '',
    origin: dbData.origin ?? '',
    destination: dbData.destination ?? '',
    currentStatus: (dbData.current_status as ShipmentStatus) || ShipmentStatus.PENDING,
    estimatedDelivery: dbData.estimated_delivery,
    weight: dbData.weight,
    dimensions: dbData.dimensions,
    serviceType: dbData.service_type,
    contentDescription: dbData.content_description,
    declaredValue: dbData.declared_value,
    packagingType: dbData.packaging_type,
    cancellationReason: dbData.cancellation_reason,
    createdAt: dbData.created_at,
    customsCharge: dbData.customs_charge ?? undefined,
    paymentStatus: (dbData.payment_status as PaymentStatus) ?? PaymentStatus.NONE,
    paymentVerifiedAt: dbData.payment_verified_at ?? undefined,
    paymentNotes: dbData.payment_notes ?? undefined,
    events: rawEvents.map((e: any) => ({
      id: e.id,
      timestamp: e.timestamp,
      location: e.location,
      status: e.status as ShipmentStatus,
      description: e.description,
      isCustomsEvent: e.is_customs_event
    })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    imageUrl: dbData.image_url ?? undefined,
    emailLogs: rawLogs.map((l: any) => ({
      id: l.id,
      sentAt: l.sent_at,
      subject: l.subject,
      body: l.body,
      recipient: l.recipient,
      status: l.status
    })).sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    paymentLogs: rawPaymentLogs.map((p: any) => ({
      id: p.id,
      shipmentId: p.shipment_id,
      amount: p.amount,
      status: p.status,
      claimedAt: p.claimed_at,
      verifiedAt: p.verified_at,
      verifiedByUserId: p.verified_by_user_id,
      notes: p.notes,
      transactionHash: p.transaction_hash
    })).sort((a: any, b: any) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
  };
};

export const storageService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await (supabase.auth as any).signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      if (!session?.user) return null;
      const role = normalizeRole(session.user.user_metadata?.role);
      return { user: session.user, role };
    } catch (e) { return null; }
  },

  onAuthStateChange: (callback: (user: any, role: UserRole | null) => void) => {
    return (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        const role = normalizeRole(session.user.user_metadata?.role);
        callback(session.user, role);
      } else {
        callback(null, null);
      }
    });
  },

  invokeEdgeFunction: async (name: string, options: any = {}) => {
    const { data } = await (supabase.auth as any).getSession();
    const accessToken = data?.session?.access_token;
    const headers = {
      ...(options.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };

    return supabase.functions.invoke(name, { ...options, headers });
  },

  getShipments: async (): Promise<Shipment[]> => {
    // This function requires authentication (used by admin dashboard)
    // RLS will block anonymous users from listing all shipments
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`*, tracking_events(*)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      let finalData = data || [];
      // Email logs: Only accessible to authenticated users
      try {
        const { data: logs } = await supabase.from('email_logs').select('*');
        if (logs) {
          finalData = finalData.map(ship => ({
            ...ship,
            email_logs: logs.filter(l => l.shipment_id === ship.id)
          }));
        }
      } catch (e) {
        // Silently fail if email_logs table doesn't exist or access is denied
      }

      return finalData.map(mapShipment);
    } catch (err: any) {
      console.error("Ledger Sync Failure:", err);
      throw err;
    }
  },

  getShipmentByTracking: async (trackingNumber: string): Promise<Shipment | null> => {
    // Use RPC so anon can only fetch one shipment by tracking number (RLS restricts direct SELECT).
    const { data, error } = await supabase.rpc('get_shipment_by_tracking_public', {
      p_tracking_number: trackingNumber.trim().toUpperCase()
    });
    if (error) throw error;
    if (!data) return null;

    const shipmentData = Array.isArray(data) ? data[0] : data;
    if (!shipmentData) return null;

    // Email logs: only accessible when authenticated; anon gets empty array
    let logs: any[] = [];
    try {
      const { data: l } = await supabase.from('email_logs').select('*').eq('shipment_id', shipmentData.id);
      logs = l || [];
    } catch {
      // Expected for anonymous users (RLS blocks access)
    }

    let trackingEvents = shipmentData.tracking_events;
    if ((!trackingEvents || !Array.isArray(trackingEvents)) && shipmentData.id) {
      try {
        const { data: eventsData, error: eventsError } = await supabase
          .from('tracking_events')
          .select('*')
          .eq('shipment_id', shipmentData.id)
          .order('timestamp', { ascending: false });

        if (!eventsError && Array.isArray(eventsData)) {
          trackingEvents = eventsData;
        } else if (eventsError) {
          console.warn('Tracking event fallback query error:', eventsError.message);
        }
      } catch (err) {
        console.warn('Fallback tracking event fetch failed:', err);
      }
    }

    if (!trackingEvents || (Array.isArray(trackingEvents) && trackingEvents.length === 0)) {
      console.warn(`Shipment ${shipmentData.tracking_number || shipmentData.id} loaded, but no tracking events were returned by the public lookup.`);
    }

    return mapShipment({ ...shipmentData, tracking_events: trackingEvents, email_logs: logs });
  },

  saveShipment: async (shipment: Partial<Shipment>): Promise<Shipment> => {
    // Sanitize input data
    const sanitizedShipment = {
      ...shipment,
      trackingNumber: shipment.trackingNumber !== undefined && shipment.trackingNumber !== null
        ? sanitize(String(shipment.trackingNumber)).trim().toUpperCase()
        : shipment.trackingNumber,
      senderName: shipment.senderName ? sanitize(String(shipment.senderName)) : shipment.senderName,
      senderAddress: shipment.senderAddress ? sanitize(String(shipment.senderAddress)) : shipment.senderAddress,
      senderEmail: shipment.senderEmail ? sanitize(String(shipment.senderEmail)) : shipment.senderEmail,
      recipientName: shipment.recipientName ? sanitize(String(shipment.recipientName)) : shipment.recipientName,
      recipientEmail: shipment.recipientEmail ? sanitize(String(shipment.recipientEmail)) : shipment.recipientEmail,
      recipientAddress: shipment.recipientAddress ? sanitize(String(shipment.recipientAddress)) : shipment.recipientAddress,
      origin: shipment.origin ? sanitize(String(shipment.origin)) : shipment.origin,
      destination: shipment.destination ? sanitize(String(shipment.destination)) : shipment.destination,
      dimensions: shipment.dimensions ? sanitize(String(shipment.dimensions)) : shipment.dimensions,
      contentDescription: shipment.contentDescription ? sanitize(String(shipment.contentDescription)) : shipment.contentDescription,
    };

    // Validate with Zod
    const validationResult = shipmentSchema.safeParse(sanitizedShipment);
    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error);
      const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const validatedData = validationResult.data;
    const payload: any = {
      tracking_number: validatedData.trackingNumber,
      sender_name: validatedData.senderName,
      sender_address: validatedData.senderAddress,
      sender_email: validatedData.senderEmail || null,
      recipient_name: validatedData.recipientName,
      recipient_email: validatedData.recipientEmail,
      recipient_address: validatedData.recipientAddress,
      origin: validatedData.origin,
      destination: validatedData.destination,
      current_status: validatedData.currentStatus,
      estimated_delivery: validatedData.estimatedDelivery,
      weight: validatedData.weight,
      dimensions: validatedData.dimensions,
      service_type: validatedData.serviceType,
      image_url: validatedData.imageUrl || null
    };

    // Note: 'content_description', 'declared_value', 'packaging_type', and 'cancellation_reason' 
    // were removed as they appear to be missing from the current Supabase schema.

    const upsertData = validatedData.id ? { ...payload, id: validatedData.id } : payload;

    const { data, error } = await supabase
      .from('shipments')
      .upsert(upsertData, { onConflict: 'tracking_number' })
      .select()
      .single();

    if (error) {
      console.error("Supabase Upsert Error:", error);
      throw error;
    }

    // Send confirmation email to recipient after successful shipment creation
    try {
      const shipmentData = mapShipment(data);
      const isNewShipment = !validatedData.id; // Only send for new shipments, not updates
      
      if (isNewShipment && shipmentData.recipientEmail) {
        // Generate a friendly confirmation email
        const emailSubject = `Shipment Confirmation: ${shipmentData.trackingNumber} - NextExpress`;
        const emailBody = `Dear ${shipmentData.recipientName},

Your shipment has been registered and is being prepared for dispatch.

Shipment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking Number: ${shipmentData.trackingNumber}
Service Type: ${shipmentData.serviceType}
Origin: ${shipmentData.origin}
Destination: ${shipmentData.destination}
Estimated Delivery: ${shipmentData.estimatedDelivery}
Weight: ${shipmentData.weight}

You can track your package anytime at: NextExpress Courier Tracking

This is an automated confirmation. Please keep your tracking number safe for future reference.

Best regards,
NextExpress Courier Services
support@nextexpresscourier.com
+61 488 293 104 (Australia)
+971 50 492 8173 (Dubai)
+44 7700 900 482 (UK)`;

        // Call the send-email Edge Function
        try {
          const { error: emailError } = await storageService.invokeEdgeFunction('send-email', {
            body: {
              to: shipmentData.recipientEmail,
              subject: emailSubject,
              htmlBody: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word;">${emailBody}</pre>`,
              textBody: emailBody,
              shipmentId: shipmentData.id
            }
          });

          if (emailError) {
            console.warn("Email notification failed (non-blocking):", emailError);
            // Don't throw - allow shipment creation to succeed even if email fails
          } else {
            console.log(`Confirmation email sent to ${shipmentData.recipientEmail}`);
          }
        } catch (emailSendErr) {
          console.warn("Email sending exception (non-blocking):", emailSendErr);
          // Non-blocking - shipment was already created successfully
        }
      }
    } catch (notificationErr) {
      console.warn("Post-save notification failed (non-blocking):", notificationErr);
      // Non-blocking - shipment was already created successfully
    }

    return mapShipment(data);
  },

  /** Upload a shipment photo to Storage and set shipment.image_url. Bucket must exist (e.g. "shipment-images", public read). */
  uploadShipmentImage: async (shipmentId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
    const path = `${shipmentId}/image.${safeExt}`;
    const { error: uploadError } = await supabase.storage
      .from('shipment-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('shipment-images').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    const { error: updateError } = await supabase
      .from('shipments')
      .update({ image_url: publicUrl })
      .eq('id', shipmentId);
    if (updateError) throw updateError;
    return publicUrl;
  },

  addTrackingEvent: async (shipmentId: string, event: Partial<TrackingEvent>, template?: EmailTemplate): Promise<void> => {
    // Sanitize input data
    const sanitizedEvent = {
      ...event,
      location: event.location ? sanitize(String(event.location)) : event.location,
      description: event.description ? sanitize(String(event.description)) : event.description,
    };

    // Validate with Zod
    const validationResult = trackingEventSchema.safeParse(sanitizedEvent);
    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error);
      const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const validatedData = validationResult.data;
    const { error: eventError } = await supabase
      .from('tracking_events')
      .insert({
        shipment_id: shipmentId,
        location: validatedData.location,
        status: validatedData.status,
        description: validatedData.description,
        is_customs_event: validatedData.isCustomsEvent || false
      });

    if (eventError) throw eventError;

    const updatePayload: any = { current_status: event.status };
    // 'cancellation_reason' removed to match current schema

    const { data: shipmentData, error: shipError } = await supabase
      .from('shipments')
      .update(updatePayload)
      .eq('id', shipmentId)
      .select()
      .single();

    if (shipError) throw shipError;

    // Dispatch Notification
    try {
      let emailContent: { subject: string; body: string };

      if (template) {
        emailContent = {
          subject: template.subject.replace('{{tracking}}', shipmentData.tracking_number),
          body: template.body
            .replace('{{name}}', shipmentData.recipient_name)
            .replace('{{status}}', event.status!)
            .replace('{{location}}', event.location!)
            .replace('{{tracking}}', shipmentData.tracking_number)
        };
      } else {
        // Generate email content using Edge Function
        try {
          const { data: aiContent, error: aiError } = await storageService.invokeEdgeFunction('generate-email-content', {
            body: {
              recipientName: shipmentData.recipient_name,
              trackingNumber: shipmentData.tracking_number,
              status: event.status!,
              location: event.location!,
              description: event.description || ''
            }
          });

          if (aiError) {
            throw aiError;
          }

          if (aiError || !aiContent) {
            throw new Error(aiError?.message || 'Failed to generate email content');
          }

          emailContent = aiContent as { subject: string; body: string };
        } catch (aiErr) {
          console.warn("AI Generation failed, using standard protocol template:", aiErr);
          // Standard Fallback Template
          emailContent = {
            subject: `Shipment Update: ${shipmentData.tracking_number} - ${event.status}`,
            body: `Dear ${shipmentData.recipient_name},\n\nThis is an automated update regarding your shipment ${shipmentData.tracking_number}.\n\nCurrent Status: ${event.status}\nLocation: ${event.location}\nDetails: ${event.description}\n\nThank you for choosing NextExpress.`
          };
        }
      }

      // Generate HTML body
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f172a; margin-bottom: 20px;">Shipment Update</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Tracking ID</p>
            <p style="margin: 5px 0 0; font-size: 24px; color: #0f172a; font-weight: 900;">${shipmentData.tracking_number}</p>
          </div>
          <p style="color: #334155; line-height: 1.6; font-size: 16px;">${emailContent.body.replace(/\n/g, '<br>')}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} NextExpress Courier. All rights reserved.</p>
        </div>
      `;

      // Send email using Edge Function
      try {
        const { data: emailResult, error: emailError } = await storageService.invokeEdgeFunction('send-email', {
          body: {
            to: shipmentData.recipient_email,
            subject: emailContent.subject,
            htmlBody: htmlBody,
            textBody: emailContent.body,
            shipmentId: shipmentId
          }
        });

        if (emailError) {
          console.error("Email dispatch error:", emailError);
        }
      } catch (dispatchErr) {
        console.error("Critical Network Error during dispatch:", dispatchErr);
      }
    } catch (err) { 
      console.error("Notification process failed:", err);
      console.warn("Notification dispatch skipped."); 
    }
  },

  getEmailTemplates: async (): Promise<EmailTemplate[]> => {
    try {
      const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(d => ({
        id: d.id, name: d.name, subject: d.subject, body: d.body, type: d.type, createdAt: d.created_at
      }));
    } catch (e) {
      return [];
    }
  },

  saveEmailTemplate: async (template: Partial<EmailTemplate>) => {
    // Sanitize input data
    const sanitizedTemplate = {
      ...template,
      name: template.name ? sanitize(String(template.name)) : template.name,
      subject: template.subject ? sanitize(String(template.subject)) : template.subject,
      body: template.body ? sanitize(String(template.body)) : template.body,
      type: template.type ? sanitize(String(template.type)) : template.type,
    };

    // Validate with Zod
    const validationResult = emailTemplateSchema.safeParse(sanitizedTemplate);
    if (!validationResult.success) {
      const errors = formatZodError(validationResult.error);
      const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const validatedData = validationResult.data;
    const payload: Record<string, unknown> = {
      name: validatedData.name,
      subject: validatedData.subject,
      body: validatedData.body,
      type: validatedData.type,
      created_at: validatedData.createdAt ?? new Date().toISOString(),
    };
    if (validatedData.id) payload.id = validatedData.id;
    const { error } = await supabase.from('email_templates').upsert(payload);
    if (error) throw error;
  },

  deleteEmailTemplate: async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) throw error;
  },

  generateTrackingNumber: (): string => {
    const prefix = 'NEC';
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}${random}`;
  },

  // ============================================
  // PAYMENT SYSTEM METHODS
  // ============================================

  getSettings: async (): Promise<Record<string, string>> => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settings: Record<string, string> = {};
      (data || []).forEach(item => {
        settings[item.key] = item.value;
      });
      return settings;
    } catch (err) {
      console.warn("Failed to fetch settings:", err);
      return {};
    }
  },

  getSetting: async (key: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Row not found
        throw error;
      }
      
      return data?.value ?? null;
    } catch (err) {
      console.warn(`Failed to fetch setting ${key}:`, err);
      return null;
    }
  },

  updateSetting: async (key: string, value: string, description?: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key,
          value,
          description,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
      throw err;
    }
  },

  claimPayment: async (shipmentId: string, amount: number): Promise<PaymentLog> => {
    try {
      // Create payment log entry
      const { data, error } = await supabase
        .from('payment_logs')
        .insert({
          shipment_id: shipmentId,
          amount,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update shipment payment status
      await supabase
        .from('shipments')
        .update({ payment_status: PaymentStatus.PENDING })
        .eq('id', shipmentId);

      return {
        id: data.id,
        shipmentId: data.shipment_id,
        amount: data.amount,
        status: data.status,
        claimedAt: data.claimed_at,
        verifiedAt: data.verified_at,
        verifiedByUserId: data.verified_by_user_id,
        notes: data.notes,
        transactionHash: data.transaction_hash
      };
    } catch (err) {
      console.error("Failed to claim payment:", err);
      throw err;
    }
  },

  verifyPayment: async (shipmentId: string, notes?: string, autoAdvanceStatus?: boolean): Promise<void> => {
    try {
      const { data: session } = await (supabase.auth as any).getSession();
      const userId = session?.user?.id;

      // Update shipment payment status
      const updatePayload: any = {
        payment_status: PaymentStatus.VERIFIED,
        payment_verified_at: new Date().toISOString(),
        payment_notes: notes || null
      };

      const { error: shipError } = await supabase
        .from('shipments')
        .update(updatePayload)
        .eq('id', shipmentId);

      if (shipError) throw shipError;

      // Update payment log entry
      const { error: logError } = await supabase
        .from('payment_logs')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by_user_id: userId,
          notes: notes || null
        })
        .eq('shipment_id', shipmentId)
        .eq('status', 'claimed')
        .order('claimed_at', { ascending: false })
        .limit(1);

      if (logError) throw logError;

      // Optionally auto-advance shipment status
      if (autoAdvanceStatus) {
        const { data: shipmentData } = await supabase
          .from('shipments')
          .select('current_status')
          .eq('id', shipmentId)
          .single();

        if (shipmentData && shipmentData.current_status === ShipmentStatus.CUSTOMS_HOLD) {
          await supabase
            .from('shipments')
            .update({ current_status: ShipmentStatus.CUSTOMS_CLEARED })
            .eq('id', shipmentId);
        }
      }
    } catch (err) {
      console.error("Failed to verify payment:", err);
      throw err;
    }
  },

  getPaymentLogs: async (shipmentId?: string): Promise<PaymentLog[]> => {
    try {
      let query = supabase.from('payment_logs').select('*');
      
      if (shipmentId) {
        query = query.eq('shipment_id', shipmentId);
      }

      const { data, error } = await query.order('claimed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        shipmentId: p.shipment_id,
        amount: p.amount,
        status: p.status,
        claimedAt: p.claimed_at,
        verifiedAt: p.verified_at,
        verifiedByUserId: p.verified_by_user_id,
        notes: p.notes,
        transactionHash: p.transaction_hash
      }));
    } catch (err) {
      console.error("Failed to fetch payment logs:", err);
      throw err;
    }
  },

  verifyPaymentWithBlockchain: async (
    shipmentId: string,
    transactionHash: string,
    autoVerify: boolean = true
  ): Promise<PaymentLog | null> => {
    try {
      // Update payment log with transaction hash
      const { data, error } = await supabase
        .from('payment_logs')
        .update({
          transaction_hash: transactionHash,
          blockchain_verified_at: new Date().toISOString(),
          ...(autoVerify && {
            status: 'verified',
            verified_at: new Date().toISOString()
          })
        })
        .eq('shipment_id', shipmentId)
        .eq('status', 'claimed')
        .order('claimed_at', { ascending: false })
        .limit(1)
        .select()
        .single();

      if (error) throw error;

      // If auto-verify enabled, also update shipment status
      if (autoVerify && data) {
        await supabase
          .from('shipments')
          .update({
            payment_status: PaymentStatus.VERIFIED,
            payment_verified_at: new Date().toISOString(),
            payment_notes: `Auto-verified via blockchain. TX: ${transactionHash}`
          })
          .eq('id', shipmentId);
      }

      return data
        ? {
            id: data.id,
            shipmentId: data.shipment_id,
            amount: data.amount,
            status: data.status,
            claimedAt: data.claimed_at,
            verifiedAt: data.verified_at,
            verifiedByUserId: data.verified_by_user_id,
            notes: data.notes,
            transactionHash: data.transaction_hash
          }
        : null;
    } catch (err) {
      console.error('Failed to verify payment with blockchain:', err);
      throw err;
    }
  }
};
