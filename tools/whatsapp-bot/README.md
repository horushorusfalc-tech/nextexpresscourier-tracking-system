5. Optional: If you deploy a verification endpoint (Netlify function), add `VERIFICATION_WEBHOOK` to `.env` with the URL of the Netlify function. The bot will POST `{ trackingNumber, transactionHash }` to the webhook when a user sends `PAID <txhash>`.

Netlify webhook (recommended setup)
- Create a Netlify Function (example `netlify/functions/verify-payment.js`) that accepts POST `{ trackingNumber, transactionHash }`.
- Configure a secure internal verification endpoint (Supabase Edge Function or your own) and set `VERIFY_ENDPOINT` and `VERIFY_KEY` as environment variables in Netlify. The Netlify function forwards the request to that secure endpoint.

Flow when user chats on WhatsApp
1. User sends message with tracking number (e.g. `NEC83655218`).
2. Bot looks up shipment via Supabase public RPC and replies with status, ETA, and customs info.
3. If shipment is `Held in Customs`, bot includes `WALLET_ADDRESS` and sends a QR image (if configured).
4. User pays and replies in WhatsApp: `PAID <txhash>` (optionally including the tracking number).
5. If `VERIFICATION_WEBHOOK` is configured, the bot POSTs `{ trackingNumber, transactionHash }` to that webhook.
6. The webhook forwards the request to your secure verification endpoint (configured via `VERIFY_ENDPOINT`/`VERIFY_KEY` in Netlify). That endpoint runs your blockchain verification and updates Supabase (marks payment verified).
7. The webhook returns success; you can configure the verification endpoint to notify the user by WhatsApp or email upon completion.
WhatsApp Bot Prototype (Read‑Only)
=================================

This is a local, read‑only WhatsApp bot prototype meant for quick testing. It is free to run locally (no VPS required) but requires your machine to be online while you expect messages.

Features
- Listens for incoming messages containing a tracking number (`NEC12345678`).
- Calls your Supabase public RPC `get_shipment_by_tracking_public` to fetch shipment data.
- Replies with shipment status, ETA, and customs charge (if present).
- Optionally sends a wallet QR image if you set `WALLET_ADDRESS` in `.env`.

Limitations
- This prototype does not write to the database. If a user replies `PAID <txhash>`, the bot will only acknowledge — an admin must verify.
- WhatsApp Web automation is unofficial and may be rate‑limited or blocked by WhatsApp for suspicious activity. Use for low volume and testing only.

Setup
1. Create `.env` in this folder with:

```
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
WALLET_ADDRESS=bc1qxy...       # optional
```

2. Install dependencies and start:

```
cd tools/whatsapp-bot
npm install
npm start
```

3. On first run you'll see a QR printed in the terminal — scan it with WhatsApp (Menu → Linked Devices → Link a Device).

4. Send a message from the target phone containing the NEC tracking number (e.g. `NEC83655218`). The bot will reply with shipment details.

Security
- Do NOT commit `.env` or session files (the bot stores session data under `~/.wwebjs_auth` by default).
- Keep any Supabase service role keys off this device unless you explicitly need DB writes.

Next steps
- If this works reliably for your use case, we can add an optional verified flow that accepts `PAID <txhash>` and calls a secure endpoint to mark payments (requires Supabase service role key and extra safeguards).
