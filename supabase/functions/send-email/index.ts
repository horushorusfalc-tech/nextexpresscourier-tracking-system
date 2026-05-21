import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  shipmentId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Parse request body
    const body: RequestBody = await req.json();
    const { to, subject, htmlBody, textBody, shipmentId } = body;

    // Validate required fields
    if (!to || !subject || !htmlBody || !textBody || !shipmentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Resend API key from secrets
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set in Supabase secrets");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NextExpress <updates@nextexpresscourier.com>",
        to: [to],
        subject: subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.json();

    // Log to email_logs table
    const logStatus = resendResponse.ok ? "SENT" : "FAILED";
    const logData = {
      shipment_id: shipmentId,
      subject: subject,
      body: textBody,
      recipient: to,
      status: logStatus,
    };

    const { error: logError } = await supabaseClient
      .from("email_logs")
      .insert(logData);

    if (logError) {
      console.error("Failed to log email to database:", logError);
    }

    if (resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: resendResult.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: resendResult.message || "Failed to send email",
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

