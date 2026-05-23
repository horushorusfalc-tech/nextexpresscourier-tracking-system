import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getCorsHeaders = (request: Request) => {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigin = !allowedOrigins.length
    ? "*"
    : requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
  };
};

const buildResponse = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const unauthorizedResponse = (req: Request, status: number, message: string) =>
  buildResponse(req, { success: false, error: message }, status);

const verifyAdmin = async (authorization: string | null) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 500, message: "Server is not configured for secure auth." };
  }

  if (!authorization?.startsWith("Bearer ")) {
    return { status: 401, message: "Authorization header missing or malformed." };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: authorization },
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return { status: 401, message: "Unauthorized access." };
  }

  const role = (data.user.user_metadata?.role || "").toString().toUpperCase();
  if (role !== "ADMIN") {
    return { status: 403, message: "Administrator access required." };
  }

  return { status: 200 };
};

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
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (allowedOrigins.length && !req.headers.get("origin")) {
    return buildResponse(req, { success: false, error: "Origin missing." }, 403);
  }

  if (allowedOrigins.length && req.headers.get("origin") && !allowedOrigins.includes(req.headers.get("origin")!)) {
    return buildResponse(req, { success: false, error: "Origin not allowed." }, 403);
  }

  try {
    const authResult = await verifyAdmin(req.headers.get("Authorization"));
    if (authResult.status !== 200) {
      return unauthorizedResponse(req, authResult.status, authResult.message);
    }

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
      return buildResponse(req, { success: false, error: "Missing required fields" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return buildResponse(req, { success: false, error: "RESEND_API_KEY not set" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const subject = `Shipment registered: ${trackingNumber}`;
    const from = Deno.env.get("RESEND_FROM") ?? "NextExpress <updates@nextexpresscourier.com>";

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
      const resendResult = await res.json();
      if (!res.ok) {
        console.error("Resend API error (send-shipment-registered):", res.status, resendResult);
      }
      const status = res.ok ? "SENT" : "FAILED";
      const logRow: any = {
        shipment_id: shipmentId,
        subject,
        body: text,
        recipient: to,
        status,
      };
      if (!res.ok) logRow.error = JSON.stringify(resendResult || {});
      await supabase.from("email_logs").insert(logRow);
      return res.ok;
    };

    await sendOne(recipientEmail, recipientName);
    if (senderEmail && senderEmail.trim() && senderEmail !== recipientEmail) {
      await sendOne(senderEmail.trim(), senderName);
    }

    return buildResponse(req, { success: true }, 200);
  } catch (err) {
    console.error("send-shipment-registered error:", err);
    return buildResponse(req, { success: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
