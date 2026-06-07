# Netlify Deployment & Email Setup Guide

## Part 1: Deploy to Netlify (Free)

### Step 1: Push Your Code to GitHub
```bash
git add .
git commit -m "Add Netlify config and email on package registration"
git push origin main
```

### Step 2: Connect to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click **Sign up** (or log in if you have an account)
3. Choose **GitHub** to connect your account
4. Select your repository: `nextexpresscourier-tracking-system`
5. Netlify will auto-detect your build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - These are already set in `netlify.toml`
6. Click **Deploy site**

### Step 3: Set Environment Variables in Netlify

After deployment starts:

1. Go to your Netlify site dashboard
2. Click **Site settings** → **Build & deploy** → **Environment**
3. Click **Edit variables** and add:
   ```
   VITE_SUPABASE_URL = https://lmmxwprjoljqsfxzsgfn.supabase.co
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key_here
   ```
4. Click **Save** and the site will redeploy

### Step 4: Access Your Live Site

Your site will be available at: `https://[your-random-name].netlify.app`

You can also set a custom domain in **Site settings** → **Domain management**.

---

## Part 2: Email Setup (Receiver Notifications)

### What's New

When a customer registers a package (submits the Ship form), they'll automatically receive a **confirmation email** with:
- Tracking number
- Service type
- Origin & destination
- Estimated delivery date
- Weight

### Step 1: Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier available)
3. Go to **API Keys** and create a new key
4. Copy the API key

### Step 2: Add Key to Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Edge Functions** (left sidebar)
3. Click **Create function** or select the existing `send-email` function
4. Go to the **Secrets** tab
5. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Paste your Resend API key
6. Save

### Step 3: Deploy the send-email Edge Function

#### Option A: Via Supabase Dashboard
1. Go to **Edge Functions** → **send-email**
2. Paste the code from `supabase/functions/send-email/index.ts`
3. Click **Deploy**

#### Option B: Via Supabase CLI (Recommended)
```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref lmmxwprjoljqsfxzsgfn

# Deploy the function
supabase functions deploy send-email --no-verify-jwt

# Set the secret
supabase secrets set RESEND_API_KEY=your_key_here
```

### Step 4: Test Email Sending

1. Go to your live Netlify site
2. Click **Send Item** (or **Ship** in the nav)
3. Fill out the form with:
   - Sender details
   - **Recipient email**: Your email (for testing)
   - Package details
4. Submit the form
5. Check your inbox for the confirmation email

### Step 5: Deploy generate-email-content Function (Optional)

If you want AI-powered email subjects/bodies, deploy this function:

```bash
supabase functions deploy generate-email-content --no-verify-jwt

# Add the Gemini API key (if you have one)
supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

---

## Part 3: Email Sending Workflow

### When Package is Registered (New)
✅ **Automatic** — Receiver gets confirmation email
- Triggered by: Submit form in **Ship** page
- Contains: Tracking number, service type, route, ETA
- Sent to: `recipient_email` field

### When Tracking Status Updates (Admin)
✅ **Manual** — Admin can send update emails
- Triggered by: Admin adds tracking event in dashboard
- Contains: Current status, location, custom description
- Sent to: Receiver's email
- **Uses**: Selected email template (AI-generated or custom)

---

## Troubleshooting

### Email Not Sending?

**Check 1**: Is the Resend API key set in Supabase secrets?
```bash
supabase secrets list
```

**Check 2**: Is the send-email Edge Function deployed?
- Supabase Dashboard → Edge Functions → should see `send-email` listed

**Check 3**: Check browser console for errors
- Open DevTools (F12) → Console tab
- Look for "Email sending failed" or similar errors

**Check 4**: Check Supabase function logs
- Supabase Dashboard → Edge Functions → send-email → Logs tab

### Site Not Deploying?

**Check 1**: Build command succeeds locally
```bash
npm run build
```
If it fails, fix the error and push again.

**Check 2**: Environment variables are set in Netlify
- If you added them after deploying, trigger a manual redeploy:
  - Netlify → Deploys → Trigger deploy

**Check 3**: Check deploy logs in Netlify
- Netlify → Deploys → Click the failed deploy → View logs

---

## Summary

| Feature | Status | Action |
|---------|--------|--------|
| **Netlify Hosting** | ✅ | Deployed and live |
| **Receiver Email on Register** | ✅ | Auto-sent after form submission |
| **Email on Status Update** | ✅ | Manual (admin sends) |
| **AI Email Generation** | ⚙️ | Optional (requires Gemini key) |

Your project is **production-ready**! 🚀
