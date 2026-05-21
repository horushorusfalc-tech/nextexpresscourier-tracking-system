# NextExpress Courier – Project Review & Feedback

**Reviewed:** Structure, security, maintainability, and launch readiness.

---

## 1. What’s Working Well

### 1.1 Stack & structure
- **React 19 + TypeScript + Vite** – Modern, fast dev experience.
- **Supabase** – Auth, Postgres, RLS, and optional Edge Functions in one place.
- **Clear separation** – `pages/` for routes, `components/` for shared UI, `services/storage.ts` for data/auth, `types.ts` for shared types.
- **Zod** in `services/validations.ts` – Validation and error messages for shipments, tracking events, and email templates.

### 1.2 Auth & admin
- **Supabase Auth** – Sign in/out, session persistence, role from `user_metadata.role`.
- **Role handling** – `normalizeRole()` avoids bad or missing metadata; Admin route gets a safe default role.
- **Admin error boundary** – Catches render errors and shows a message instead of a blank screen.
- **Lazy-loaded Admin** – Default export fixed so `React.lazy` resolves correctly.

### 1.3 Data layer
- **Snake → camel mapping** – `mapShipment()` and related mapping keep DB columns (snake_case) separate from app types (camelCase).
- **Defensive defaults** – Empty strings and `ShipmentStatus.PENDING` when DB fields are missing to avoid runtime crashes.
- **RLS enabled** on all four tables; authenticated users have full access where intended; email_templates and email_logs are auth-only.

### 1.4 Docs
- **SETUP_NEW_SUPABASE.md** – Step-by-step new project setup, env, migration, admin user (including SQL for `role`), and security notes.
- **LAUNCH_SUMMARY.md** – QA checklist, env vars, Edge Functions, and feature overview.

---

## 2. Issues & Recommendations

### 2.1 Security

| Item | Severity | Recommendation |
|------|----------|-----------------|
| **RLS: shipments anon policy** | Medium | Migration has `shipments_anon_select` with `USING (true)`, so **anonymous users can SELECT all rows**. The app only calls `getShipmentByTracking(...)` when unauthenticated, so behaviour is correct in the UI, but anyone with the anon key can list all shipments. **Fix:** Restrict anon to a single-row lookup, e.g. via a Postgres function `get_shipment_by_tracking(tracking_number text)` that returns one row and grant anon `EXECUTE` on it; drop anon `SELECT` on `shipments`, or document that listing is “app-level only” and accept the risk. |
| **Gemini API key in frontend** | Medium | `AIChat.tsx` uses `VITE_GEMINI_API_KEY` in the browser. The key is then in the built bundle and visible to users. **Recommendation:** Prefer calling Gemini from a Supabase Edge Function (or your backend) and keep the key in Supabase secrets; frontend calls your function with no key. |
| **.env.local in repo** | Low | Ensure `.env.local` is in `.gitignore` so secrets are never committed. |

### 2.2 Code quality & maintainability

| Item | Recommendation |
|------|-----------------|
| **Tests** | No app-level tests found. Add a few unit tests for `normalizeRole`, `mapShipment`, and Zod schemas; consider one or two integration tests for Track/Ship flows (e.g. with MSW + Supabase mock). |
| **Supabase typings** | `(supabase.auth as any)` is used in `storage.ts`. Prefer generating types from the DB (`supabase gen types typescript`) and using typed `supabase.auth` to avoid `any` and catch breakages. |
| **README vs reality** | README still describes “AI Studio” and “Run and deploy your AI Studio app”. Update it to describe this repo: NextExpress Courier tracking app, local run (`npm run dev`), env vars (`.env.example`), and link to `SETUP_NEW_SUPABASE.md` and `LAUNCH_SUMMARY.md`. |

### 2.3 UX & robustness

| Item | Recommendation |
|------|-----------------|
| **Login redirect** | After successful login the user stays on `/#/admin` and the dashboard loads. Consider explicitly navigating to `#/admin` after `signIn` so the route is clear (e.g. `navigate('/admin')` in Login after success); optional. |
| **Offline / errors** | No generic network/offline handling. Consider a small toast or banner when fetch/Supabase calls fail for non-auth routes (e.g. “Connection issue. Please try again.”). |
| **AIChat model** | `AIChat.tsx` uses `gemini-3-flash-preview`. Confirm this model ID is still valid for your Gemini API version; adjust if the API has changed. |

### 2.4 Configuration & ops

| Item | Recommendation |
|------|-----------------|
| **.env.example** | Already lists `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`, `VITE_RESEND_API_KEY`, `VITE_APP_URL`. Add a one-line comment that Supabase URL + anon key are required; others optional. |
| **Sentry / Plausible** | LAUNCH_SUMMARY mentions Sentry and Plausible; `index.tsx` has no Sentry init and `index.html` was not checked for Plausible. If you use them, ensure init and env (e.g. `VITE_SENTRY_DSN`) are documented and wired. |
| **HashRouter** | Using `HashRouter` is fine for static hosting. If you later use a server with SPA fallback, you can switch to `BrowserRouter`. |

---

## 3. RLS / Doc Mismatch (actionable)

- **SETUP_NEW_SUPABASE.md** says: “anonymous users can only look up shipments by tracking number”.
- **Migration** actually has: `CREATE POLICY "shipments_anon_select" ON public.shipments FOR SELECT TO anon USING (true);`  
  So at the DB level, anon can select all rows.

**Options:**  
1. **Tighten RLS** – e.g. anon can only call a function that returns one shipment by `tracking_number` (no direct `SELECT` on `shipments`), **or**  
2. **Update the doc** – e.g. “Anonymous access: the app only requests one shipment by tracking number when unauthenticated; the anon key can currently select all rows, so restrict via a DB function if you need stricter DB-level enforcement.”

---

## 4. Summary

- **Strengths:** Clear structure, TypeScript + Zod, Supabase auth and RLS, good setup/launch docs, and recent fixes (session persistence, role normalization, Admin default export, error boundary, defensive mapping).
- **Priorities:** (1) Restrict or document anon RLS for `shipments` and align SETUP doc; (2) Move Gemini usage behind an Edge Function and stop exposing the API key in the frontend; (3) Update README and add a few tests.
- **Verdict:** The project is in good shape for a first launch from a structure and feature perspective; addressing the RLS/Gemini/README items will improve security and clarity before or shortly after launch.
