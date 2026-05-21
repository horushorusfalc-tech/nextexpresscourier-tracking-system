import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  shipmentId: string;
  trackingNumber: string;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail?: string;
  origin: string;
  destination: string;
  trackUrl: string;
}

function buildEmailHtml(toName: string, trackingNumber: string, origin: string, destination: string, trackUrl: string): string {
  return `
    <p>Hello ${toName},</p>
    <p>Your shipment has been registered with NextExpress Courier.</p>
    <p><strong>Tracking number:</strong> ${trackingNumber}</p>
    <p><strong>Route:</strong> ${origin} → ${destination}</p>
    <p>Track your shipment here: <a href="${trackUrl}">${trackUrl}</a></p>
    <p>— NextExpress Courier</p>
  `;
}

function buildEmailText(toName: string, trackingNumber: string, origin: string, destination: string, trackUrl: string): string {
  return `Hello ${toName},\n\nYour shipment has been registered with NextExpress Courier.\n\nTracking number: ${trackingNumber}\nRoute: ${origin} → ${destination}\n\nTrack your shipment: ${trackUrl}\n\n— NextExpress Courier`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      shipmentId,
      trackingNumber,
      recipientName,
      recipientEmail,
      senderName,
      senderEmail,
      origin,
      destination,
      trackUrl,
    } = body;

    if (!shipmentId || !trackingNumber || !recipientEmail || !recipientName || !origin || !destination || !trackUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const subject = `Shipment registered: ${trackingNumber}`;
    const from = "NextExpress <updates@nextexpresscourier.com>";

    const sendOne = async (to: string, toName: string) => {
      const html = buildEmailHtml(toName, trackingNumber, origin, destination, trackUrl);
      const text = buildEmailText(toName, trackingNumber, origin, destination, trackUrl);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      const status = res.ok ? "SENT" : "FAILED";
      await supabase.from("email_logs").insert({
        shipment_id: shipmentId,
        subject,
        body: text,
        recipient: to,
        status,
      });
      return res.ok;
    };

    await sendOne(recipientEmail, recipientName);
    if (senderEmail && senderEmail.trim() && senderEmail !== recipientEmail) {
      await sendOne(senderEmail.trim(), senderName);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-shipment-registered error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
