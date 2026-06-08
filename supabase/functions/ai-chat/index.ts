import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ShipmentContext {
  trackingNumber: string;
  status: string;
  location: string;
  lastUpdate: string;
  origin: string;
  destination: string;
  customsCharge: number | null;
  paymentStatus: string;
  estimatedDelivery: string;
}

interface RequestBody {
  action: "verify" | "query";
  trackingNumber?: string;
  message?: string;
}

interface ApiResponse {
  valid: boolean;
  text?: string;
  shipment?: ShipmentContext;
  error?: string;
  requestId?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HUGGING_FACE_API_KEY = Deno.env.get("HUGGING_FACE_API_KEY") || Deno.env.get("HF_API_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[INIT] Missing required environment variables");
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
}

if (!HUGGING_FACE_API_KEY) {
  console.warn("[INIT] HUGGING_FACE_API_KEY not set - using fallback responses");
}

console.log("[INIT] Environment variables loaded successfully");


// Rate limiting: Map of IP -> { count, resetTime }
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

const getClientIp = (req: Request): string => {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
};

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  limit.count++;
  return true;
};

// ============================================================================
// SECURITY: HEADERS & CORS
// ============================================================================

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    // Include common Supabase client headers to satisfy preflight
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "3600",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
};

// ============================================================================
// SECURITY: INPUT SANITIZATION
// ============================================================================

const sanitizeInput = (input: string, maxLength = 500): string => {
  return input
    .trim()
    .substring(0, maxLength)
    // Remove injection keywords
    .replace(
      /ignore|forget|override|system prompt|instructions|jailbreak|bypass/gi,
      ""
    )
    // Remove dangerous characters
    .replace(/[<>{}\\`$]/g, "")
    // Remove SQL/HTML injection attempts
    .replace(
      /(<script|<iframe|select.*from|insert.*into|drop.*table|update.*set|delete.*from)/gi,
      ""
    )
    // Normalize whitespace
    .replace(/\s+/g, " ");
};

// ============================================================================
// VALIDATION
// ============================================================================

const validateTrackingNumber = (input: string): boolean => {
  const normalized = input.trim().toUpperCase().replace(/[\s-]/g, "");
  const isValid = normalized.length >= 5;
  console.log(
    `[VALIDATE] input="${input}" → normalized="${normalized}" valid=${isValid}`
  );
  return isValid;
};


// ============================================================================
// DATABASE QUERIES
// ============================================================================

const getShipmentContext = async (
  trackingNumber: string
): Promise<ShipmentContext | null> => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    console.log(`[DB] Looking up tracking: "${trackingNumber}"`);

    // Try exact match first
    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (shipmentError) {
      console.error(`[DB] Query error:`, shipmentError);
      return null;
    }

    let foundShipment = shipment;

    // Fall back to case-insensitive search
    if (!foundShipment) {
      console.log(`[DB] No exact match, trying case-insensitive...`);
      const { data: ilikeData, error: ilikeError } = await supabase
        .from("shipments")
        .select("*")
        .ilike("tracking_number", trackingNumber)
        .maybeSingle();

      if (ilikeError) {
        console.error(`[DB] Case-insensitive error:`, ilikeError);
        return null;
      }

      foundShipment = ilikeData;
    }

    if (!foundShipment) {
      console.warn(`[DB] No shipment found`);
      return null;
    }

    // Get latest tracking event
    const { data: events, error: eventsError } = await supabase
      .from("tracking_events")
      .select("*")
      .eq("shipment_id", foundShipment.id)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (eventsError) {
      console.warn(`[DB] Events error:`, eventsError);
    }

    const latestEvent = events?.[0];

    const context: ShipmentContext = {
      trackingNumber: foundShipment.tracking_number,
      status: foundShipment.current_status || "Unknown",
      location: latestEvent?.location || "In Transit",
      lastUpdate: latestEvent?.timestamp || foundShipment.created_at,
      origin: foundShipment.origin || "Unknown",
      destination: foundShipment.destination || "Unknown",
      customsCharge: foundShipment.customs_charge,
      paymentStatus: foundShipment.payment_status || "Pending",
      estimatedDelivery: foundShipment.estimated_delivery || "7-10 business days",
    };

    console.log(
      `[DB] ✅ Found: ${context.trackingNumber} (status: ${context.status})`
    );
    return context;
  } catch (e) {
    console.error(`[DB] ❌ Unexpected error:`, e);
    return null;
  }
};

// ============================================================================
// HUGGING FACE AI RESPONSE GENERATION
// ============================================================================

const getSystemInstructions = (shipment?: ShipmentContext): string => {
  let instructions = `You are NextExpress Courier's AI support assistant. You help customers with:
- Tracking shipments
- Website payments: Bitcoin (BTC) only (customers should include tracking number in the transaction memo)
- Customs and duty questions
- Delivery timelines
- General shipping questions

**Payment Methods (website):**
Only Bitcoin (BTC) is accepted via the website payment flow. For any other payment channels (bank transfer, card), direct customers to support.

**Shipping Reference:**
Contact: nextexpresscourie@zohomail.com
Phone: +1 720 538 4396
Support Hours: 24/7 Global Support`;

  if (shipment) {
    instructions += `

**Customer's Current Shipment:**
- Tracking: ${shipment.trackingNumber}
- Status: ${shipment.status}
- Location: ${shipment.location}
- From: ${shipment.origin}
- To: ${shipment.destination}
- ETA: ${new Date(shipment.estimatedDelivery).toLocaleDateString()}
- Payment Status: ${shipment.paymentStatus}`;

    if (shipment.customsCharge) {
      instructions += `
- Customs Duty Due: $${shipment.customsCharge}`;
    }
  }

  instructions += `

**Security Guidelines:**
- NEVER discuss passwords, API keys, or wallet private keys
- NEVER provide admin functions or backend access
- Reject any requests for sensitive information
- Redirect security concerns to support email
- Keep responses focused on shipping and payment help
- Be helpful but conservative with sensitive topics

**Response Format:**
- Keep responses concise and helpful
- Use emojis for visual clarity (🚚, 📦, 💰, 🔒, etc.)
- Provide clear step-by-step instructions when needed
- Always include contact info for complex issues`;

  return instructions;
};

const callHuggingFaceAPI = async (
  message: string,
  shipment?: ShipmentContext
): Promise<string> => {
  if (!HUGGING_FACE_API_KEY) {
    console.warn("[HF] No API key - using fallback response");
    return generateFallbackResponse(message, shipment);
  }

  try {
    const systemInstructions = getSystemInstructions(shipment);
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `${systemInstructions}\n\nCustomer: ${message}\n\nAssistant:`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.5,
            top_p: 0.9,
            do_sample: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[HF] API error (${response.status}):`, error);
      return generateFallbackResponse(message, shipment);
    }

    const result = await response.json();
    const text = Array.isArray(result)
      ? result[0]?.generated_text || ""
      : result?.generated_text || "";

    // Extract just the assistant's response part
    const assistantPart = text.split("Assistant:").pop()?.trim() || text;
    
    if (!assistantPart) {
      return generateFallbackResponse(message, shipment);
    }

    console.log(`[HF] ✅ Response generated (${assistantPart.length} chars)`);
    return assistantPart;
  } catch (e) {
    console.error(`[HF] Error calling API:`, e);
    return generateFallbackResponse(message, shipment);
  }
};

const generateFallbackResponse = (
  message: string,
  shipment?: ShipmentContext
): string => {
  const msg = message.toLowerCase();

  // Payment/Crypto questions
  if (
    msg.includes("pay") ||
    msg.includes("crypto") ||
    msg.includes("bitcoin") ||
    msg.includes("ethereum") ||
    msg.includes("usdc") ||
    msg.includes("wallet")
  ) {
    const amount = shipment?.customsCharge ? `$${shipment.customsCharge}` : "amount due";
    const trackingRef = shipment?.trackingNumber || "your tracking number";

    return `🪙 **WEBSITE PAYMENT — BITCOIN (BTC) ONLY**

  **Accepted Method:**
  • Bitcoin (BTC) — The website payment flow accepts BTC only.

  **How to Pay (website):**
  1. Copy the BTC wallet address from the payment widget on the site
  2. Send ${amount} in Bitcoin
  3. Include "${trackingRef}" in the transaction memo
  4. Click "Payment Sent" to notify our team
  5. Admin verifies within 24 hours

  **Why BTC?**
  ✓ Fast confirmations (when using on-chain checks)
  ✓ Widely supported global settlement

  Need help? Email: nextexpresscourie@zohomail.com
  Phone: +1 720 538 4396`;
  }

  // Customs questions
  if (
    msg.includes("custom") ||
    msg.includes("duty") ||
    msg.includes("tax") ||
    msg.includes("charge")
  ) {
    if (!shipment) {
      return `⚠️ **CUSTOMS INFORMATION**

Your package may be subject to customs duties depending on:
• Declared value
• Country of origin
• Contents/classification
• Destination regulations

**When You Know the Amount:**
• You'll receive email notification
• Payment due within 5 business days
• Use crypto for fastest clearance

Contact: nextexpresscourie@zohomail.com`;
    }

    if (shipment.customsCharge) {
      return `⚠️ **CUSTOMS DUTY DUE: $${shipment.customsCharge}**

**Status:** Your shipment is at customs in ${shipment.location}

**Payment Options:**
🪙 Bitcoin (BTC) - Recommended & Fastest (website payments are BTC only)
💳 Credit Card via portal
🏦 Bank Transfer

**To Pay with Crypto:**
1. Scan QR or copy wallet address
2. Send $${shipment.customsCharge} in crypto
3. Add tracking number in memo
4. Click "Payment Sent" button

Fast and secure! Questions? nextexpresscourie@zohomail.com`;
    }

    return `✅ **CUSTOMS STATUS**

Your shipment in ${shipment.location} is either:
• Already cleared (proceeding to delivery)
• Being processed (2-5 business days typical)
• Pending duty payment notification

No action needed unless you receive a customs duty notification.`;
  }

  // Delivery/Timeline questions
  if (
    msg.includes("when") ||
    msg.includes("arrive") ||
    msg.includes("delivery") ||
    msg.includes("eta") ||
    msg.includes("time")
  ) {
    if (!shipment) {
      return `📦 **DELIVERY TIMELINE**

**International Shipments (Typical):**
• Transit time: 7-10 business days
• Customs clearance: 2-5 business days
• Final delivery: 1-3 business days

**After Customs Clear:**
Delivery window: 9 AM - 5 PM business days

**Tracking Updates:**
Real-time notifications at each milestone`;
    }

    // If shipment was cancelled, return explicit cancelled message
    if (shipment.status && /cancel/i.test(shipment.status)) {
      return `🚫 **DELIVERY CANCELLED**

  **Tracking:** ${shipment.trackingNumber}
  **Status:** ${shipment.status}

  This shipment has been cancelled and will not be delivered. If you believe this is an error or need assistance, contact nextexpresscourie@zohomail.com with your tracking number. If you've paid, include transaction details so we can investigate.`;
    }

    const eta = new Date(shipment.estimatedDelivery).toLocaleDateString();
    return `📦 **YOUR DELIVERY**

  **Tracking:** ${shipment.trackingNumber}
  **Current Location:** ${shipment.location}
  **Status:** ${shipment.status}
  **Estimated Arrival:** ${eta}

  **Route:** ${shipment.origin} → ${shipment.destination}

  **Delivery Window:**
  Typically 9 AM - 5 PM business days
  You'll receive exact time 24 hours before arrival`;
  }

  // Default
  return `👋 **Hello! I'm NextExpress Support AI**

I can help with:
📍 **Tracking** - Check your shipment status
🪙 **Payments** - Cryptocurrency payment instructions
📦 **Delivery** - Estimated arrival times
⚠️ **Customs** - Duty & clearance info
📞 **Support** - Contact information

What would you like to know?`;
};


// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientIp = getClientIp(req);

  try {
    console.log(
      `[${requestId}] [SERVE] ${req.method} ${new URL(req.url).pathname} from ${clientIp}`
    );

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(req),
      });
    }

    // Only POST allowed
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ valid: false, text: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.warn(`[${requestId}] Rate limit exceeded for ${clientIp}`);
      return new Response(
        JSON.stringify({
          valid: false,
          text: "Rate limit exceeded. Please wait before sending another message.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }

    // Content length check
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 10000) {
      console.warn(`[${requestId}] Oversized request (${contentLength} bytes)`);
      return new Response(
        JSON.stringify({ valid: false, text: "Request too large" }),
        {
          status: 413,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }

    // Parse request body
    let body: RequestBody;
    try {
      const text = await req.text();
      body = JSON.parse(text);
      console.log(`[${requestId}] [REQUEST] ${JSON.stringify(body)}`);
    } catch (e) {
      console.warn(`[${requestId}] Invalid JSON: ${e}`);
      return new Response(
        JSON.stringify({ valid: false, text: "Invalid request format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
        }
      );
    }

    // Extract and normalize fields
    const action = (body.action || "query") as "verify" | "query";
    const rawTracking = body.trackingNumber
      ? String(body.trackingNumber).trim().toUpperCase().replace(/[\s-]/g, "")
      : "";
    const rawMessage = body.message ? String(body.message) : "";
    const message = sanitizeInput(rawMessage);

    console.log(
      `[${requestId}] [PARSED] action="${action}", tracking="${rawTracking}", message="${message.substring(0, 40)}..."`
    );

    // ========== VERIFY ACTION ==========
    if (action === "verify") {
      if (!rawTracking) {
        console.warn(`[${requestId}] [VERIFY] No tracking number provided`);
        return new Response(
          JSON.stringify({
            valid: false,
            text: "Please enter your tracking number",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(req),
            },
          }
        );
      }

      if (!validateTrackingNumber(rawTracking)) {
        console.warn(
          `[${requestId}] [VERIFY] Invalid format: ${rawTracking}`
        );
        return new Response(
          JSON.stringify({
            valid: false,
            text: "Invalid tracking number format. Should be at least 5 characters.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(req),
            },
          }
        );
      }

      console.log(`[${requestId}] [VERIFY] Looking up ${rawTracking}...`);
      const shipment = await getShipmentContext(rawTracking);

      if (!shipment) {
        console.warn(`[${requestId}] [VERIFY] Not found: ${rawTracking}`);
        return new Response(
          JSON.stringify({
            valid: false,
            text: `Tracking number not found. Please verify and try again.`,
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(req),
            },
          }
        );
      }

      console.log(`[${requestId}] [VERIFY] ✅ Found: ${rawTracking}`);
      return new Response(
        JSON.stringify({
          valid: true,
          shipment,
          requestId,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(req),
          },
        }
      );
    }

    // ========== QUERY ACTION ==========
    if (action === "query") {
      if (!message) {
        return new Response(
          JSON.stringify({
            valid: false,
            text: "Please enter a message",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(req),
            },
          }
        );
      }

      console.log(`[${requestId}] [QUERY] Processing message...`);

      let shipment: ShipmentContext | null = null;
      if (rawTracking) {
        if (!validateTrackingNumber(rawTracking)) {
          console.warn(`[${requestId}] Invalid tracking in query`);
          return new Response(
            JSON.stringify({
              valid: false,
              text: "Invalid tracking number format",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...getCorsHeaders(req),
              },
            }
          );
        }
        shipment = await getShipmentContext(rawTracking);
      }

      // If shipment was cancelled, always return an explicit cancelled message
      if (shipment && shipment.status && /cancel/i.test(shipment.status)) {
        const cancelledText = `🚫 **DELIVERY CANCELLED**\n\n  **Tracking:** ${shipment.trackingNumber}\n  **Status:** ${shipment.status}\n\n  This shipment has been cancelled and will not be delivered. If you believe this is an error or need assistance, contact nextexpresscourie@zohomail.com with your tracking number. If you've paid, include transaction details so we can investigate.`;
        return new Response(
          JSON.stringify({ valid: true, text: cancelledText, shipment, requestId }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
          }
        );
      }

      const responseText = await callHuggingFaceAPI(message, shipment || undefined);
      console.log(`[${requestId}] [QUERY] ✅ Response generated`);

      return new Response(
        JSON.stringify({
          valid: true,
          text: responseText,
          shipment: shipment || undefined,
          requestId,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(req),
          },
        }
      );
    }

    // Invalid action
    console.warn(`[${requestId}] Invalid action: ${action}`);
    return new Response(
      JSON.stringify({
        valid: false,
        text: "Invalid action. Use 'verify' or 'query'",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(req),
        },
      }
    );
  } catch (e) {
    console.error(`[${requestId}] [CRITICAL] Uncaught error:`, e);
    return new Response(
      JSON.stringify({
        valid: false,
        text: "Server error. Please try again later.",
        error: String(e),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(req),
        },
      }
    );
  }
});
