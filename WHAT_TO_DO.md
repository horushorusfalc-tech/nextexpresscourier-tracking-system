# What to do – step-by-step

Use this as a checklist. Code changes are already in the repo; you only need to run migrations, deploy the function, and set secrets.

---

## 1. Restrict anonymous access (RLS)

So that anonymous users can only look up **one** shipment by tracking number (not list all).

1. Open your [Supabase](https://app.supabase.com) project.
2. Go to **SQL Editor**.
3. Open **`supabase/migrations/002_anon_tracking_rls.sql`** in this repo, copy all of it, paste into the editor, then click **Run**.

Done. The Track page still works for everyone; only the “list all shipments” query is blocked for anonymous users.

---

## 2. Move Gemini API key off the frontend (AI chat)

The AI chat now calls a Supabase Edge Function; the Gemini key stays in Supabase, not in the browser.

1. **Deploy the Edge Function**
   - Install [Supabase CLI](https://supabase.com/docs/guides/cli) if you haven’t.
   - In a terminal, from the **project root**:
     ```bash
     supabase login
     supabase link --project-ref YOUR_PROJECT_REF
     supabase functions deploy ai-chat
     ```
   - Replace `YOUR_PROJECT_REF` with your project ref (from the Supabase dashboard URL or Project Settings).

2. **Set the secret**
   - In Supabase Dashboard: **Project Settings → Edge Functions → Secrets** (or run):
     ```bash
     supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Remove the key from the frontend**
   - You can delete `VITE_GEMINI_API_KEY` from `.env.local`; the app no longer uses it for the chat.

---

## 3. README and .env.example

- **README** – Already updated for NextExpress Courier (run, env, docs links).
- **.env.example** – Already updated with a short comment: only Supabase URL and anon key are required; the rest are optional.

Nothing else to do for this step.

---

## 4. Confirm .env.local is not committed

- `.gitignore` already includes `.env.local` and `.env.*.local`.
- Before pushing, run: `git status` and make sure `.env.local` does **not** appear. If it does, do **not** commit it.

---

## 5. Create an admin user (if you haven’t)

1. Supabase Dashboard → **Authentication → Users** → **Add user** → create with email + password.
2. Copy the user’s **UID** from the list.
3. **SQL Editor** → run (replace the UUID):

   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"ADMIN"}'::jsonb
   WHERE id = 'PASTE_USER_UID_HERE';
   ```

4. Log in on your app’s **Login** (or FLP) page with that email and password.

---

## Quick reference

| Task                    | Where / How |
|-------------------------|-------------|
| Run RLS migration       | Supabase → SQL Editor → paste `002_anon_tracking_rls.sql` → Run |
| Deploy AI chat function | `supabase functions deploy ai-chat` |
| Set Gemini secret       | Dashboard → Edge Functions → Secrets, or `supabase secrets set GEMINI_API_KEY=...` |
| Admin user              | Auth → Users → Add user, then SQL above with that user’s UID |
