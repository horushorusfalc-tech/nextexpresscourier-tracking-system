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
  recipientName: string;
  trackingNumber: string;
  status: string;
  location: string;
  description?: string;
}

interface GeminiResponse {
  subject: string;
  body: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const unauthorizedResponse = (req: Request, status: number, message: string) =>
  buildResponse(req, { subject: `Shipment Update`, body: message }, status);

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

const getFallbackContent = (body?: Partial<RequestBody>): GeminiResponse => {
  return {
    subject: `Shipment Update: ${body?.trackingNumber || "N/A"} - ${body?.status || "Update"}`,
    body: `Dear ${body?.recipientName || "Customer"},\n\nThis is an automated update regarding your shipment ${body?.trackingNumber || ""}.\n\nCurrent Status: ${body?.status || "Update"}\nLocation: ${body?.location || "N/A"}\n${body?.description ? `Details: ${body.description}\n\n` : ""}Thank you for choosing NextExpress.`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (allowedOrigins.length && !req.headers.get("origin")) {
    return buildResponse(req, { subject: `Shipment Update`, body: "Origin missing." }, 403);
  }

  if (allowedOrigins.length && req.headers.get("origin") && !allowedOrigins.includes(req.headers.get("origin")!)) {
    return buildResponse(req, { subject: `Shipment Update`, body: "Origin not allowed." }, 403);
  }

  try {
    const authResult = await verifyAdmin(req.headers.get("Authorization"));
    if (authResult.status !== 200) {
      return unauthorizedResponse(req, authResult.status, authResult.message);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return buildResponse(req, getFallbackContent(), 200);
    }

    const { recipientName, trackingNumber, status, location, description = "" } = body;

    if (!recipientName || !trackingNumber || !status || !location) {
      return buildResponse(req, getFallbackContent(body), 200);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set, using fallback template");
      return buildResponse(req, getFallbackContent(body), 200);
    }

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Draft professional logistics email for ${recipientName}. Tracking: ${trackingNumber}. Status: ${status}. Location: ${location}. Detail: ${description}. Return ONLY valid JSON with this exact structure: {"subject": "...", "body": "..."}`
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  body: { type: "string" }
                },
                required: ["subject", "body"]
              }
            }
          }),
        }
      );

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No content in Gemini response");
      }

      const emailContent: GeminiResponse = JSON.parse(content);

      return buildResponse(req, emailContent, 200);
    } catch (aiError) {
      console.warn("AI Generation failed, using fallback template:", aiError);
      return buildResponse(req, getFallbackContent(body), 200);
    }
  } catch (error) {
    console.error("Error in generate-email-content function:", error);
    return buildResponse(req, getFallbackContent(), 200);
  }
});
