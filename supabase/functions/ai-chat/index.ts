import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const SYSTEM_INSTRUCTION =
  "You are the NextExpressCourier (NEC) Support Assistant. You are professional, efficient, and expert in global logistics. Answer questions about shipping terms (Incoterms), common customs restrictions, and tracking help. Keep responses concise and formatted with bullet points if needed.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (allowedOrigins.length && !req.headers.get("origin")) {
    return buildResponse(req, { text: "Origin missing." }, 403);
  }

  if (allowedOrigins.length && req.headers.get("origin") && !allowedOrigins.includes(req.headers.get("origin")!)) {
    return buildResponse(req, { text: "Origin not allowed." }, 403);
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return buildResponse(req, { text: "Invalid request. Please send a message." }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return buildResponse(req, { text: "Please enter a message." }, 400);
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return buildResponse(req, { text: "Assistant offline. Please try again later." }, 503);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", res.status, err);
      return buildResponse(req, { text: "I'm having trouble connecting. Please try again." }, 200);
    }

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm having trouble connecting to the dispatch network. Please try again.";

    return buildResponse(req, { text }, 200);
  } catch (e) {
    console.error("ai-chat error:", e);
    return buildResponse(req, { text: "Protocol Error: Assistant offline. Please contact IT Support." }, 200);
  }
});
