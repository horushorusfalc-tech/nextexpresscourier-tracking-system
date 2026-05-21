# Using a New Supabase Account for NextExpress Courier

Use this guide when you want to run the app against a **new Supabase project** (new account or new project in the same account) with fresh tables.

## 1. Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**, choose your org, name the project (e.g. `nextexpress-courier`), set a database password, and pick a region.
3. Wait for the project to finish provisioning.

## 2. Run the schema migration

1. In the Supabase Dashboard, open **SQL Editor**.
2. Open the file **`supabase/migrations/001_initial_schema.sql`** in this repo.
3. Copy its full contents and paste into the SQL Editor.
4. Click **Run**. This creates tables, indexes, and RLS. Authenticated users have full access; anon can select from shipments (the app only requests by tracking number).

5. **(Recommended)** Run the second migration for stricter security: open **`supabase/migrations/002_anon_tracking_rls.sql`**, copy all, paste in SQL Editor, **Run**. After this, anonymous users can only fetch one shipment by tracking number via the function `get_shipment_by_tracking_public`; they can no longer list all rows.

## 3. Point the app to the new project

1. In Supabase Dashboard go to **Project Settings → API**.
2. Copy:
   - **Project URL**
   - **anon public** key (under "Project API keys").
3. In this repo, create or edit **`.env.local`** in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

4. If you use Edge Functions (email/AI), also set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:
   - `RESEND_API_KEY`
   - `GEMINI_API_KEY` (or the name your Edge Functions expect)

Restart the dev server after changing `.env.local` (`npm run dev`).

## 4. Create an admin user (FLP / Admin portal login)

1. In Supabase Dashboard go to **Authentication → Users**.
2. Click **Add user** → **Create new user**.
3. Enter the **email** and **password** you want to use for the admin portal. (Use a strong, unique password.)
4. After the user is created, **set the admin role**. The Overview tab does not show or edit metadata; use one of these:

   **Option A – SQL (recommended, always works)**  
   - Go to **SQL Editor** in the left sidebar.  
   - Run this (replace the UUID with your user’s UID from Authentication → Users):

   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"ADMIN"}'::jsonb
   WHERE id = 'YOUR_USER_UID_HERE';
   ```

   Example: if the user’s UID is `34ef7326-aca6-47c2-8783-d76f84218fdd`, use that in place of `YOUR_USER_UID_HERE`.  
   - Click **Run**. Done.

   **Option B – See metadata / roles in the Dashboard**  
   - In **Authentication → Users**, click the user.  
   - Open the **Raw JSON** tab (next to Overview and Logs).  
   - You’ll see the full user object; `user_metadata` (and `role` if set) appears there.  
   - If your Supabase project has an “Edit user” or editable metadata section, you can add `"role": "ADMIN"` there; otherwise use Option A.

5. That user can now go to your app’s **Login** page (or **FLP** → login), sign in with that email and password, and get full admin access.

Without `role: "ADMIN"` in user metadata, a logged-in user is treated as STAFF and does not get admin dashboard access.

### Is it secure that Login/FLP is visible to everyone?

Yes. This is normal and secure:

- **Login link visible** – Having a “FLP” or “Login” link is standard. It does not reveal who is admin; it only shows a login form. Attackers still need a valid email + password.
- **No user enumeration** – Supabase Auth does not reveal whether an email exists; failed login shows a generic error.
- **Auth is server-side** – Sessions and passwords are handled by Supabase (secure cookies, no passwords in your front-end code).
- **RLS enforces access** – Even if someone tried to call your API directly, Supabase Row Level Security (RLS) only allows admin-level reads/writes when the request is authenticated with a valid session. Anonymous users cannot list shipments or change data.
- **Recommendations** – Use a strong password for admin accounts, enable 2FA in Supabase for your project (Dashboard → Authentication → Settings), and avoid reusing the same password elsewhere. You can also restrict the admin route by IP or move it behind a VPN if you need extra hardening.

## 5. (Optional) Shipment photo and registration emails

### Shipment image upload

1. **Run migration 003**  
   In **SQL Editor**, run the contents of **`supabase/migrations/003_shipment_image_and_sender_email.sql`**. This adds `image_url` and `sender_email` to `shipments` and updates the public tracking function.

2. **Create Storage bucket**  
   In Supabase Dashboard go to **Storage** → **New bucket**.  
   - Name: `shipment-images`  
   - **Public bucket**: ON (so the Track page can show images via public URL).  
   Create the bucket. Then open **Policies** for `shipment-images` and add:  
   - **INSERT**: allowed for `authenticated`.  
   - **SELECT** (read): allowed for `anon` and `authenticated` (or rely on public bucket).

After this, admins can attach a photo when registering or editing an asset; it appears on the Track page for that shipment.

### Registration emails (recipient + sender)

When a new asset is registered, the app can send an email to the recipient and optionally to the sender (if **Sender email** is set in the form).

1. **Deploy the Edge Function**  
   Deploy **send-shipment-registered** (e.g. `supabase functions deploy send-shipment-registered`).
2. **Secrets**  
   Ensure **RESEND_API_KEY** is set in **Project Settings → Edge Functions → Secrets** (same as for **send-email**).

No front-end config needed; the app calls the function after a successful create.

## 6. (Optional) Other Edge Functions

If you use **send-email** and **generate-email-content**:

1. Deploy them to this new project (e.g. `supabase functions deploy send-email` and `generate-email-content` from the repo that contains your functions).
2. Set the secrets (e.g. `RESEND_API_KEY`, `GEMINI_API_KEY`) in **Project Settings → Edge Functions → Secrets**.

After this, the app uses the **new Supabase account and new tables**; no code changes are required beyond configuring `.env.local`.
