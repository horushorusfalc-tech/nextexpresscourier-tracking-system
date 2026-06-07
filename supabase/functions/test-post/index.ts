import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req: Request) => {
  console.log(`[TEST] Method: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (req.method === "POST") {
    console.log("[TEST] POST received!");
    try {
      const body = await req.json();
      console.log("[TEST] Body:", body);
      return new Response(JSON.stringify({ success: true, received: body }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("[TEST] Error parsing JSON:", e);
      return new Response(JSON.stringify({ error: String(e) }), { status: 400 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
