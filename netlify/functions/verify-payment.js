const fetch = require('node-fetch');
require('dotenv').config();

// Netlify Function: verify-payment
// Expects POST { trackingNumber, transactionHash }
// Calls Supabase service API to verify payment (this function should call a secure server-side endpoint or use service role key stored in Netlify env)

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { trackingNumber, transactionHash } = body;
    if (!trackingNumber || !transactionHash) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    // Example: call a Supabase Edge Function to perform blockchain verification and mark payment.
    // The actual endpoint and authentication should be configured as an environment variable.
    const VERIFY_ENDPOINT = process.env.VERIFY_ENDPOINT;
    const VERIFY_KEY = process.env.VERIFY_KEY;

    if (!VERIFY_ENDPOINT || !VERIFY_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Verification endpoint not configured' }) };
    }

    const res = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VERIFY_KEY}` },
      body: JSON.stringify({ trackingNumber, transactionHash })
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, result: data }) };
  } catch (err) {
    console.error('verify-payment error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
