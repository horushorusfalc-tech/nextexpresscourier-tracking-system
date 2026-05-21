# Resend Domain Verification (Required for Production Emails)

## ⚠️ Important: Resend Free Tier Limitation

By default, Resend only allows sending from `noreply@resend.dev` or `onboarding@resend.dev` during free trial. To send from your own domain (`updates@nextexpresscourier.com`), you need to verify your domain.

---

## Quick Setup (Without Domain Verification)

If you **don't have a domain** yet, you can still test emails:

1. In `supabase/functions/send-email/index.ts`, line 61, change:
   ```typescript
   from: "NextExpress <updates@nextexpresscourier.com>",
   ```
   To:
   ```typescript
   from: "NextExpress <onboarding@resend.dev>",
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy send-email --no-verify-jwt
   ```

3. Emails will now work in production (from `onboarding@resend.dev`)

---

## Full Setup (With Custom Domain)

If you want emails from `updates@nextexpresscourier.com`:

### Step 1: Add Domain to Resend

1. Go to [resend.com](https://resend.com) → **Domains**
2. Click **Add Domain**
3. Enter: `nextexpresscourier.com` (or your actual domain)
4. Resend will give you DNS records to add

### Step 2: Add DNS Records

This depends on your domain provider (GoDaddy, Namecheap, etc.):

1. Go to your domain provider's DNS settings
2. Add these DNS records (provided by Resend):
   - **CNAME record** for authentication
   - **MX record** (if needed)
3. Wait 5-15 minutes for DNS to propagate

### Step 3: Verify in Resend

Once DNS is updated:
1. Go back to Resend → **Domains**
2. Click **Verify** on your domain
3. Once verified, you can use: `updates@nextexpresscourier.com`

### Step 4: Update send-email Function

The code already sends from `updates@nextexpresscourier.com`, so no changes needed.

---

## For Testing: Use onboarding@resend.dev

**Recommended approach for now:**

Use `onboarding@resend.dev` while you're testing:
- ✅ No domain setup needed
- ✅ Works immediately
- ✅ Perfect for development & testing

Once you're ready for production and have a real domain, upgrade to a paid Resend plan and verify your domain.

---

## How to Know if Email is Working

After submitting a package on your Netlify site:
1. Check recipient's **Inbox** (check spam folder too)
2. Look for email from:
   - Subject: `Shipment Confirmation: NEC... - NextExpress`
   - With tracking number and shipment details

If you see it → **Email is working!** ✅

---

## Resend Plan Options

| Feature | Free | Pro |
|---------|------|-----|
| **Monthly Emails** | 100 | Unlimited |
| **Cost** | Free | $20/month |
| **Custom Domain** | ❌ | ✅ |
| **Webhooks** | ✅ | ✅ |

For production, consider upgrading to Pro if you'll send more than 100 emails/month.
