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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const unauthorizedResponse = (status: number, message: string) =>
  new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAdmin(req.headers.get("Authorization"));
    if (authResult.status !== 200) {
      return unauthorizedResponse(authResult.status, authResult.message);
    }

    const body: RequestBody = await req.json();
    const { to, subject, htmlBody, textBody, shipmentId } = body;

    if (!to || !subject || !htmlBody || !textBody || !shipmentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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
      return new Response(
        JSON.stringify({ success: true, messageId: resendResult.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: resendResult.message || "Failed to send email" }),
      {
        status: resendResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

