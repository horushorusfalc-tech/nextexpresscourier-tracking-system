# Launch tonight (Nigeria time) – checklist

Do these in order. Total ~30–45 minutes if Supabase is already set up.

---

## Must-do (core launch)

### 1. Supabase backend ready (~5 min)
- [ ] You have a Supabase project and have run **001_initial_schema.sql** in SQL Editor (tables + RLS).
- [ ] **002_anon_tracking_rls.sql** run in SQL Editor (stricter anon access).  
  → Supabase → **SQL Editor** → paste full `002_anon_tracking_rls.sql` → **Run**.

### 2. Admin user (~2 min)
- [ ] Supabase → **Authentication → Users** → **Add user** (email + password).
- [ ] Copy that user’s **UID**.
- [ ] **SQL Editor** → run (replace the UUID):
  ```sql
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"ADMIN"}'::jsonb
  WHERE id = 'PASTE_UID_HERE';
  ```
- [ ] Test: open your app → **FLP** / **Login** → sign in with that email/password → you see the Admin dashboard.

### 3. Env and build (~3 min)
- [ ] `.env.local` has **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** (from Supabase → Project Settings → API).
- [ ] Run `npm run build`. Fix any errors.
- [ ] Run `npm run preview` and click through: Home, Track, Ship, Login → Admin. All work.

### 4. Deploy frontend (~10–20 min)
- [ ] Deploy the **built app** (`dist/` after `npm run build`) to your host:
  - **Vercel:** connect repo, root dir = project root, build = `npm run build`, output = `dist`, or use their Vite preset.
  - **Netlify:** build = `npm run build`, publish = `dist`.
  - **Other:** serve the `dist` folder as a static site; ensure routes like `/track`, `/ship`, `/admin` fall back to `index.html` (SPA).
- [ ] Set **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** in the host’s environment (same as `.env.local`).
- [ ] Open the live URL: Home, Track, Ship, Login → Admin. All work.

### 5. Don’t leak secrets
- [ ] Run `git status` – **.env.local** must not be staged. If it appears, do **not** commit it.

---

## Optional for tonight (can do after launch)

### AI chat (NEC assistant)
- App already calls the **ai-chat** Edge Function. If you haven’t deployed it:
  - **Option A:** Supabase Dashboard → **Edge Functions** → **Create function** → name `ai-chat` → paste code from `supabase/functions/ai-chat/index.ts` → add secret **GEMINI_API_KEY**.
  - **Option B:** With Supabase CLI: `supabase functions deploy ai-chat` and `supabase secrets set GEMINI_API_KEY=...`
- If you skip this, the chat will show “Assistant offline” until you deploy and set the secret.

### Email (notifications)
- If you use **send-email** / **generate-email-content**, deploy those Edge Functions and set **RESEND_API_KEY** in Supabase secrets. You can add this after launch.

---

## Quick test before you call it “launched”

| Check | How |
|-------|-----|
| Home loads | Open `/` |
| Track by number | Open `/track`, enter a valid tracking number (create one in Admin if needed) |
| Create shipment | Open `/ship`, fill form, submit → get tracking number |
| Admin login | Open `/admin` (or FLP) → log in → see ledger, create/edit shipment, log status |
| No blank screen | After login, dashboard and tables load |

---

## If something breaks

- **Blank after login:** Ensure Admin user has `role: "ADMIN"` in metadata (SQL above). Hard refresh (Ctrl+Shift+R / Cmd+Shift+R).
- **Track page “not found”:** Ensure 002 migration ran (RPC `get_shipment_by_tracking_public` exists). Check browser console for errors.
- **Build fails:** Run `npm run build` locally and fix TypeScript/import errors.
- **404 on live site:** Configure SPA fallback so all routes serve `index.html`.

You’re done when: **frontend is live, Supabase env is set, you can log in as admin and use Track + Ship + Admin.** AI chat and email can follow tomorrow.
