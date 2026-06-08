/* Simple local WhatsApp bot (read-only prototype)
 * - Scans incoming messages for NEC tracking numbers
 * - Calls Supabase public RPC `get_shipment_by_tracking_public` (requires SUPABASE_URL and SUPABASE_ANON_KEY in .env)
 * - Replies with shipment summary and customs amount (if any)
 * - Optionally sends a QR image for `WALLET_ADDRESS` if set in .env
 *
 * Usage:
 * 1. Create tools/whatsapp-bot/.env with SUPABASE_URL, SUPABASE_ANON_KEY, and optional WALLET_ADDRESS
 * 2. npm install
 * 3. npm start
 * 4. Scan the QR printed in terminal with your WhatsApp mobile app
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const QR = require('qrcode');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '';
const VERIFICATION_WEBHOOK = process.env.VERIFICATION_WEBHOOK || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY missing. Add them to .env to enable shipment lookups.');
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'nextexpress-bot' }),
  puppeteer: { headless: true }
});

client.on('qr', qr => {
  console.log('Scan this QR with WhatsApp mobile to login:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('Authenticated');
});

client.on('ready', () => {
  console.log('WhatsApp bot ready');
});

const matchTracking = (text) => {
  const m = text.match(/\bNEC[-\s]?(\d{5,9})\b/i);
  if (m) return `NEC${m[1]}`.toUpperCase();
  return null;
};

// Map chatId -> last tracking looked up in this chat (simple in-memory cache)
const lastTrackingByChat = new Map();

const getShipment = async (tracking) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase credentials missing');
  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rpc/get_shipment_by_tracking_public`;
    const res = await axios.post(url, { p_tracking_number: tracking }, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    // Supabase function may return an object or array
    const data = res.data;
    if (!data) return null;
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error('Supabase lookup failed:', err?.response?.data || err.message || err);
    return null;
  }
};

const sendWalletQr = async (chat, wallet) => {
  try {
    const dataUrl = await QR.toDataURL(wallet, { margin: 2, width: 400 });
    const media = MessageMedia.fromDataURL(dataUrl);
    await chat.sendMessage(media, { caption: `Wallet address: ${wallet}` });
  } catch (e) {
    console.warn('Failed to send QR image:', e.message || e);
  }
};

client.on('message', async msg => {
  try {
    const text = (msg.body || '').trim();
    const chat = await msg.getChat();

    // Check for PAID <txhash> pattern
    const paidMatch = text.match(/^paid\s+([0-9a-fx]+)(?:\s+(NEC[-\s]?\d{5,9}))?$/i);
    if (paidMatch) {
      const tx = paidMatch[1];
      const explicitTracking = paidMatch[2] ? matchTracking(paidMatch[2]) : null;
      const chatId = chat.id._serialized || (chat.id && chat.id.user) || null;
      const inferredTracking = explicitTracking || (chatId ? lastTrackingByChat.get(chatId) : null);

      if (VERIFICATION_WEBHOOK && inferredTracking) {
        // Notify webhook to perform verification
        try {
          await axios.post(VERIFICATION_WEBHOOK, { trackingNumber: inferredTracking, transactionHash: tx }, { headers: { 'Content-Type': 'application/json' } });
          await chat.sendMessage('Thanks — payment notice sent. Verification is in progress; you will receive a confirmation when verified.');
        } catch (err) {
          console.error('Webhook notify failed:', err?.response?.data || err.message || err);
          await chat.sendMessage('Failed to notify verification service. Please try again later.');
        }
      } else {
        await chat.sendMessage('Thanks — we received your notice. This prototype is read-only; an admin will verify your payment and follow up.');
      }

      return;
    }

    const tracking = matchTracking(text);
    if (!tracking) {
      // Offer quick instructions
      await chat.sendMessage('Please send your tracking number (e.g. NEC83655218).');
      return;
    }

    await chat.sendMessage(`Looking up ${tracking}...`);
    const shipment = await getShipment(tracking).catch(() => null);
    if (!shipment) {
      await chat.sendMessage(`No shipment found for ${tracking}. Please confirm the tracking number.`);
      return;
    }

    // store last lookup for this chat so PAID messages can be linked
    try {
      const chatId = chat.id._serialized || (chat.id && chat.id.user) || null;
      if (chatId) lastTrackingByChat.set(chatId, tracking);
    } catch (e) {}

    const latestEvent = (shipment.tracking_events && shipment.tracking_events[0]) || {};
    const customs = shipment.customs_charge ? `$${Number(shipment.customs_charge).toFixed(2)}` : 'Not specified';

    let reply = `📦 Tracking: ${shipment.tracking_number}\n` +
                `📍 Status: ${shipment.current_status}\n` +
                `📍 Location: ${latestEvent.location || 'N/A'}\n` +
                `⏳ ETA: ${shipment.estimated_delivery || 'N/A'}\n` +
                `💰 Customs charge: ${customs}\n`;

    if (shipment.current_status && /customs/i.test(shipment.current_status)) {
      if (WALLET_ADDRESS) {
        reply += `\nTo pay via crypto: send the amount to the wallet below. Then reply: PAID <txhash>\n` + `Wallet: ${WALLET_ADDRESS}`;
      } else {
        reply += `\nIf a customs charge is required, an admin will provide payment instructions. Reply 'PAID <txhash>' once you've sent payment.`;
      }
    } else {
      reply += `\nIf you need payment or customs help, reply and we will assist.`;
    }

    await chat.sendMessage(reply);

    if (WALLET_ADDRESS && shipment.current_status && /customs/i.test(shipment.current_status)) {
      await sendWalletQr(chat, WALLET_ADDRESS);
    }
  } catch (err) {
    console.error('Message handler error:', err?.message || err);
  }
});

client.initialize();
