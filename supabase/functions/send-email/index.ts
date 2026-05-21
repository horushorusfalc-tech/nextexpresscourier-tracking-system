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
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  shipmentId: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const requestOrigin = req.headers.get("origin");
  if (allowedOrigins.length && !requestOrigin) {
    return buildResponse(req, { success: false, error: "Origin missing." }, 403);
  }

  if (allowedOrigins.length && requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return buildResponse(req, { success: false, error: "Origin not allowed." }, 403);
  }

  try {
    const body: RequestBody = await req.json();
    const { to, subject, htmlBody, textBody, shipmentId } = body;

    if (!to || !subject || !htmlBody || !textBody || !shipmentId) {
      return buildResponse(req, { success: false, error: "Missing required fields" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set in Supabase secrets");
      return buildResponse(req, { success: false, error: "Email service not configured" }, 500);
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NextExpress <updates@nextexpresscourier.com>",
        to: [to],
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.json();
    const logStatus = resendResponse.ok ? "SENT" : "FAILED";
    const logData = {
      shipment_id: shipmentId,
      subject,
      body: textBody,
      recipient: to,
      status: logStatus,
    };

    const { error: logError } = await supabaseClient.from("email_logs").insert(logData);
    if (logError) {
      console.error("Failed to log email to database:", logError);
    }

    if (resendResponse.ok) {
      return buildResponse(req, { success: true, messageId: resendResult.id }, 200);
    }

    return buildResponse(req, { success: false, error: resendResult.message || "Failed to send email" }, resendResponse.status);
  } catch (error) {
    console.error("Error in send-email function:", error);
    return buildResponse(req, { success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

