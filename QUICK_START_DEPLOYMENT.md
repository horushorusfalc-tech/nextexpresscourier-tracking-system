# Netlify + Email Setup: Quick Checklist

## ✅ What's Ready

Your project now has:
- ✅ **netlify.toml** configured for Netlify deployment
- ✅ **Automatic email** sent to recipients when they register a package
- ✅ **Email includes**: Tracking number, service type, origin, destination, ETA
- ✅ **Code is production-ready** and tested

---

## 🚀 Next Steps (In Order)

### 1. Deploy to Netlify (5 minutes)

**Go to [netlify.com](https://netlify.com)**

1. Sign up or log in
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub**
4. Select your repo: `nextexpresscourier-tracking-system`
5. Click **Deploy**

✅ Your site will be live at: `https://[random-name].netlify.app`

---

### 2. Add Environment Variables to Netlify (3 minutes)

Once deployed:

1. Go to your Netlify dashboard
2. **Site settings** → **Build & deploy** → **Environment**
3. Add these variables:
   ```
   VITE_SUPABASE_URL = https://lmmxwprjoljqsfxzsgfn.supabase.co
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key_here
   ```
4. **Deploy site** (Netlify will redeploy automatically)

---

### 3. Setup Email Sending (5-10 minutes)

#### 3a. Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up (free)
3. **API Keys** → Create one
4. Copy the key

#### 3b. Add Key to Supabase
1. Supabase Dashboard → **Edge Functions**
2. Go to **Secrets** tab
3. Create new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Paste your Resend key
4. Save

#### 3c. Deploy send-email Edge Function
```bash
# Option A: Via Supabase CLI (Recommended)
supabase link --project-ref lmmxwprjoljqsfxzsgfn
supabase functions deploy send-email --no-verify-jwt
supabase secrets set RESEND_API_KEY=your_key_here
```

OR

**Option B: Via Supabase Dashboard**
1. Go to **Edge Functions** → **Create function** → **send-email**
2. Copy code from `supabase/functions/send-email/index.ts`
3. Deploy & add secret

---

### 4. Test Email Sending (2 minutes)

1. Go to your live Netlify site
2. **Send Item** (Ship form)
3. Fill in details with **your email** as recipient
4. Submit
5. Check your inbox (check spam!)

**You should receive an email with:**
- Tracking number
- Service type
- Origin → Destination
- Estimated delivery
- Weight

If you see it → **Everything works!** ✅

---

## 📋 Checklist

```
DEPLOYMENT
☐ Deploy to Netlify (Site is live)
☐ Add env variables to Netlify
☐ Verify site loads at netlify.app URL

EMAIL SETUP
☐ Get Resend API key
☐ Add RESEND_API_KEY to Supabase secrets
☐ Deploy send-email Edge Function
☐ Test by submitting a package form
☐ Verify email received
```

---

## 🎯 What Happens Now

### When User Submits "Ship" Form:
1. ✅ Package is saved to Supabase
2. ✅ Confirmation email sent to recipient
3. ✅ User sees tracking number on success page
4. ✅ Admin can now manage package in dashboard

### When Admin Updates Shipment Status:
1. ✅ Status updated in database
2. ✅ Tracking event added
3. ✅ **Admin chooses**: Send email or not
4. ✅ **Template options**: AI-generated or custom templates
5. ✅ Email sent to recipient with update

---

## 🔗 Reference Links

- [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) - Full Netlify guide
- [RESEND_SETUP.md](./RESEND_SETUP.md) - Email domain setup
- [services/storage.ts](./services/storage.ts) - Email sending code (~line 215-270)

---

## ❓ FAQ

**Q: Do I need a credit card for Netlify?**
A: No, Netlify free tier is truly free. Only add card for premium features.

**Q: Do I need a credit card for Resend?**
A: No, free tier works fine for testing. Upgrade to Pro ($20/month) if sending 100+ emails/month.

**Q: What if email doesn't send?**
A: Check [RESEND_SETUP.md](./RESEND_SETUP.md) troubleshooting section or verify:
- RESEND_API_KEY is set in Supabase secrets
- send-email function is deployed
- Check browser console for errors

**Q: Can I use a custom domain for my website?**
A: Yes! In Netlify dashboard: **Domain management** → **Add custom domain**

**Q: Can I use a custom email domain?**
A: Yes, but requires domain verification on Resend (see [RESEND_SETUP.md](./RESEND_SETUP.md))

---

**You're all set!** 🎉 Follow the checklist and your site will be live with emails working.
