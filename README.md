# NextExpress Courier – Tracking System

Web app for shipment tracking, creating shipments, and an admin (FLP) dashboard. Built with React, TypeScript, Vite, and Supabase.

## Run locally

**Prerequisites:** Node.js 18+ (20+ recommended)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`.
   - **Required:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from your [Supabase](https://supabase.com) project).
   - Optional: `VITE_APP_URL`, `VITE_RESEND_API_KEY` (see [SETUP_NEW_SUPABASE.md](./SETUP_NEW_SUPABASE.md)).

3. **Run the app**
   ```bash
   npm run dev
   ```
   Open the URL shown (e.g. http://localhost:3000).

## Backend (Supabase)

- **New project:** Follow **[SETUP_NEW_SUPABASE.md](./SETUP_NEW_SUPABASE.md)** to create a project, run the schema migration, create an admin user, and configure secrets.
- **Schema:** `supabase/migrations/001_initial_schema.sql` (tables + RLS).  
  For stricter anonymous access (tracking lookup only), also run **`supabase/migrations/002_anon_tracking_rls.sql`** in the SQL Editor.
- **Edge Functions:** Deploy `send-email`, `generate-email-content`, and **`ai-chat`** (for the in-app AI assistant). Set `GEMINI_API_KEY` and `RESEND_API_KEY` in Supabase → Project Settings → Edge Functions → Secrets.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |

## Docs

- **[SETUP_NEW_SUPABASE.md](./SETUP_NEW_SUPABASE.md)** – New Supabase project setup, admin user, security notes.
- **[LAUNCH_SUMMARY.md](./LAUNCH_SUMMARY.md)** – Launch checklist, QA, and feature overview.
- **[PROJECT_REVIEW.md](./PROJECT_REVIEW.md)** – Code review and recommendations.
