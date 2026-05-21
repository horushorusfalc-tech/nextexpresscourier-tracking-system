import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const getFallbackContent = (body?: Partial<RequestBody>): GeminiResponse => {
  return {
    subject: `Shipment Update: ${body?.trackingNumber || "N/A"} - ${body?.status || "Update"}`,
    body: `Dear ${body?.recipientName || "Customer"},\n\nThis is an automated update regarding your shipment ${body?.trackingNumber || ""}.\n\nCurrent Status: ${body?.status || "Update"}\nLocation: ${body?.location || "N/A"}\n${body?.description ? `Details: ${body.description}\n\n` : ""}Thank you for choosing NextExpress.`,
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return new Response(
      JSON.stringify(getFallbackContent()),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { recipientName, trackingNumber, status, location, description = "" } = body;

    // Validate required fields
    if (!recipientName || !trackingNumber || !status || !location) {
      return new Response(
        JSON.stringify(getFallbackContent(body)),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Gemini API key from secrets
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set, using fallback template");
      return new Response(
        JSON.stringify(getFallbackContent(body)),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Google Gemini API
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
      
      // Extract content from Gemini response
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No content in Gemini response");
      }

      // Parse JSON response
      const emailContent: GeminiResponse = JSON.parse(content);

      return new Response(
        JSON.stringify(emailContent),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (aiError) {
      console.warn("AI Generation failed, using fallback template:", aiError);
      return new Response(
        JSON.stringify(getFallbackContent(body)),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in generate-email-content function:", error);
    return new Response(
      JSON.stringify(getFallbackContent(body)),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
