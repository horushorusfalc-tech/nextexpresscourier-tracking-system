# Supabase Edge Functions Deployment Guide

This guide covers deploying the Edge Functions for secure server-side email and AI operations.

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Deploy Edge Functions

### 1. Deploy send-email function
```bash
supabase functions deploy send-email
```

### 2. Deploy generate-email-content function
```bash
supabase functions deploy generate-email-content
```

## Set Secrets

Set the API keys as Supabase secrets (these are stored securely and not exposed to the client):

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

To verify secrets are set:
```bash
supabase secrets list
```

## Environment Variables

Update your `.env` file (client-side only needs Supabase credentials):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://nextexpresscourier.com
```

**Note:** `VITE_GEMINI_API_KEY` and `VITE_RESEND_API_KEY` are no longer needed in the frontend. They are stored securely as Supabase secrets and used only by the Edge Functions.

## Testing Edge Functions

### Test send-email function:
```bash
supabase functions invoke send-email --body '{
  "to": "test@example.com",
  "subject": "Test Email",
  "htmlBody": "<p>Test HTML</p>",
  "textBody": "Test Text",
  "shipmentId": "test-shipment-id"
}'
```

### Test generate-email-content function:
```bash
supabase functions invoke generate-email-content --body '{
  "recipientName": "John Doe",
  "trackingNumber": "NEC12345678",
  "status": "In Transit",
  "location": "London Hub",
  "description": "Package is in transit"
}'
```

## Security Benefits

- ✅ API keys are never exposed to the browser
- ✅ API keys are stored securely in Supabase secrets
- ✅ All API calls happen server-side
- ✅ CORS headers properly configured
- ✅ Error handling and fallbacks included

## Troubleshooting

### Function not found
- Ensure functions are deployed: `supabase functions list`
- Check project is linked: `supabase projects list`

### API key errors
- Verify secrets are set: `supabase secrets list`
- Check function logs: `supabase functions logs send-email`

### CORS errors
- Edge Functions include CORS headers automatically
- Ensure you're calling from the correct origin

