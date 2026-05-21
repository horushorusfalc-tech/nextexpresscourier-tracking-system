# NextExpress Courier Tracking System – Launch Summary

## 1. What’s Left Before Launch

### 1.1 Local / Dev Setup

- **Install runtime**
  - Node.js v18+ (v20+ recommended)
  - npm v9+
- **Install dependencies**
  - From project root:
    ```bash
    rm -rf node_modules package-lock.json
    npm install
    npm run dev
    ```
- **Environment files**
  - Copy example:
    ```bash
    cp .env.example .env.local
    ```
  - Set values in `.env.local`:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_APP_URL`
    - `VITE_SENTRY_DSN` (optional; Sentry only)

### 1.2 Supabase Backend

- **Using a new Supabase project**
  - Use a new account or a new project in the same account with **new tables** by running the migration and env steps in **`SETUP_NEW_SUPABASE.md`**.
  - Schema and RLS are in **`supabase/migrations/001_initial_schema.sql`**. Run that file once in the new project’s SQL Editor.
- **Tables**
  - `shipments`
    - Core entity: sender/recipient, origin/destination, status, service, weight/dimensions, `tracking_number` (unique).
  - `tracking_events`
    - One row per status update with `shipment_id`, `timestamp`, `location`, `status`, `description`, `is_customs_event`.
  - `email_templates`
    - Named templates: `name`, `subject`, `body`, `type`, `created_at`.
  - `email_logs`
    - Email audit: `shipment_id`, `sent_at`, `subject`, `body`, `recipient`, `status` (`SENT`/`FAILED`).
- **Indexes**
  - `shipments.tracking_number` (unique index).
  - `tracking_events.shipment_id`.
  - `shipments.current_status`.
  - Date/time columns used for filtering.
- **Row-Level Security**
  - `shipments`:
    - Anonymous: can select a row only by `tracking_number`.
    - Authenticated (admin): full read/write.
  - `tracking_events`:
    - Anonymous: select events where `shipment_id` relates to a shipment they are allowed to see.
    - Authenticated: full read/write.
  - `email_templates`, `email_logs`:
    - Authenticated admins only.
- **Edge Functions**
  - `send-email`
    - Reads `RESEND_API_KEY` from Supabase secrets.
    - Calls Resend API.
    - Logs result in `email_logs`.
    - CORS + OPTIONS support.
  - `generate-email-content`
    - Reads `GEMINI_API_KEY` from Supabase secrets.
    - Calls Gemini REST API for structured `{ subject, body }`.
    - Returns robust fallback template if anything fails.
- **Secrets**
  - Configure via Supabase CLI or dashboard:
    ```bash
    supabase secrets set RESEND_API_KEY=xxx GEMINI_API_KEY=yyy
    ```
- **Realtime**
  - Confirm `postgres_changes` enabled and channels allowed for:
    - `shipments` (for admin ledger).
    - `tracking_events` (for individual shipment timelines).

### 1.3 Frontend Configuration

- **Env variables (build-time)**
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, optional `VITE_SENTRY_DSN`.
- **Sentry**
  - `index.tsx` initializes Sentry when `VITE_SENTRY_DSN` is present.
  - `storage.ts` catches and calls `Sentry.captureException` on key operations.
- **Plausible**
  - `index.html` includes Plausible script with `data-domain="nextexpresscourier.com"` (adjust as needed).

### 1.4 Functional QA

- **Public**
  - Home:
    - Tracking search navigates to Track page.
    - Links to Ship and Track pages work.
  - Track:
    - URL param (`/#/track/NECxxxxxx`) loads the correct shipment.
    - Status badge, routing info, and timeline render correctly.
    - Timeline updates in real time when admin logs new events.
  - Ship:
    - Three steps validate inputs (sender, recipient, package).
    - Errors are visible, with red borders and messages.
    - Successful submission generates tracking number and shows confirmation view.
- **Admin**
  - Login:
    - Valid credentials log in; invalid show error.
    - Logout clears session and redirects home.
  - Ledger:
    - Shipments show in table.
    - Filter panel:
      - Date range, multi-select service types, origins/destinations, weight range, status multi-select work together.
      - Presets: Active / Needs Attention / Delivered Today.
      - Debounced search filters all textual fields and highlights matches.
      - Filter chips can clear individual filters.
      - URL query params reflect filters and restore state on reload.
    - Realtime: new/updated shipments appear without manual refresh.
  - Pulse View:
    - Map renders; markers for active/cancelled shipments appear with correct popups.
    - Live count matches ledger.
  - Modals:
    - Asset Registry: create/edit shipments, auto/given tracking numbers.
    - Protocol Command: log tracking events, optional email notify (template or AI).
    - Audit Trail: registry + timeline + email log display.
    - Cancel: marks shipment canceled and logs event.
    - Template Manager: create/edit/delete templates.
    - All modals:
      - Have correct keyboard focus trap.
      - Are accessible (`role="dialog"`, `aria-modal`, labels).
- **Email**
  - When `send-email` Edge Function is enabled:
    - Protocol updates with “send email” create entries in `email_logs` and send emails via Resend.
    - AI template path uses Gemini when available, otherwise falls back cleanly.

### 1.5 UX / Accessibility Checklist

- **Structure**
  - Each page has a single `<h1>` (Home, Track, Ship, Login, Admin).
  - Section headings use `<h2>`/`<h3>` as appropriate.
- **Navigation**
  - `lang="en"` on `<html>`.
  - Skip-to-content link targeting `#main-content`.
  - ARIA labels on icon buttons (theme toggle, chat open/close, settings gear, row actions).
  - Focus-visible rings on all interactive elements.
- **Forms**
  - Every input/textarea/select has a visible `<label>`.
  - Placeholders are hints, not the only label.
- **Feedback**
  - Toasts in admin have `role="status"` and `aria-live="polite"`.
  - Tracking timeline uses `role="log"` + `aria-live` so new events are announced.
- **Contrast**
  - Body text on white/light backgrounds uses `text-slate-600` or stronger, not `text-slate-500`.
  - Buttons and links maintain WCAG AA contrast in both light/dark themes.

### 1.6 Performance

- **Bundle**
  - React Router routes are lazy-loaded via `React.lazy` + `Suspense`.
  - Vite Rollup `manualChunks` groups `vendor`, `@supabase/supabase-js`, `leaflet`.
- **Styles**
  - Tailwind compiled via Vite; CDN removed.
  - Global/custom CSS in `index.css` with CSS variables for theme.
- **Checks**
  - Run `npm run build` and inspect `dist/` bundle sizes.
  - Confirm no large unexpected chunks beyond vendor/supabase/leaflet.

### 1.7 Testing

- **Unit / integration tests (Vitest + Testing Library)**
  - `storageService`:
    - `getShipments` → correct query and mapping to `Shipment`.
    - `getShipmentByTracking` → correct filter and mapping.
    - `saveShipment` → sanitization + validation + upsert payload shape.
    - `generateTrackingNumber` → `NEC` + 8 digits.
  - Components:
    - Home search: entering a tracking number and submitting navigates to Track route.
    - Login: validates required inputs, handles error state.
    - Layout: nav links render and route correctly.
- **E2E (Playwright)**
  - Config with `webServer` running `npm run dev` or a `npm run preview` server.
  - Page objects for:
    - Home/Track flow.
    - Ship form flow.
    - Admin login + CRUD (requires configured test user).
    - Responsive behavior at 375px viewport (header, drawer menu, modals).

### 1.8 Deployment

- **Build and upload**
  - `npm run build`
  - Upload `dist/` contents + `.htaccess` to Hostinger `public_html/`.
- **Verification**
  - `https://your-domain/` serves the SPA.
  - All hash-based routes work (Home, Ship, Track, Admin).
  - Sentry and Plausible show events from production.
  - Supabase settings point to production project (not staging).

---

## 2. What This Project Provides

### 2.1 High-Level Description

NextExpress is a **full courier tracking and logistics control system** with:

- A **public-facing portal** for:
  - Branded landing and service marketing.
  - Real-time shipment tracking by tracking number.
  - Submitting shipment requests via a multi-step wizard.
- A **secure admin command terminal** for:
  - Creating and editing shipments.
  - Logging status changes and transit events.
  - Visualizing active shipments on a dark, global map.
  - Managing email templates and reviewing full communication history.
- A **backend built on Supabase** providing:
  - Authentication and roles.
  - Postgres storage with RLS.
  - Realtime data updates.
  - Edge Functions for email dispatch and AI-generated email content.
- **Operational tooling**:
  - Realtime filters and search on the ledger.
  - Dark mode theming.
  - Error tracking (Sentry).
  - Privacy-friendly analytics (Plausible).

### 2.2 Frontend Architecture Overview

- **App shell**
  - `index.tsx` mounts `<App />`, initializes Sentry (if DSN set), wraps in `ThemeProvider`.
  - `App.tsx`:
    - Uses `HashRouter` and `Routes` for all paths.
    - Lazy-loads pages with `React.lazy` + `Suspense`.
    - Manages auth state via `storageService` and guards `/admin`.

- **Layout**
  - `Layout.tsx`:
    - Header:
      - Logo and navigation links.
      - Theme toggle (light/dark) using CSS custom properties.
      - Responsive mobile menu.
      - Skip-to-content link, accessible focus styles.
    - Footer:
      - Company description, service links, contact phones/emails.
      - Global operations info.
    - Floating `AIChat` widget integrated at the layout level.

- **Pages**
  - `Home.tsx`:
    - Hero heading, big tracking input.
    - “Choose your speed” service rows.
    - “How it works” (Ship / Track / Deliver).
    - Trust grid and CTA section with second tracking input.
  - `Track.tsx`:
    - Loads shipment by tracking number (URL param or search).
    - Shows high-level status, route, consignee details.
    - Renders sorted tracking events as a timeline.
    - Subscribes to realtime updates for that shipment.
  - `Ship.tsx`:
    - 3 steps: Sender, Recipient, Package.
    - Field-level validation (Zod) and inline errors.
    - On success: generates tracking number, stores shipment, shows confirmation.
  - `Login.tsx`:
    - Email/password login via Supabase auth.
    - Accessible labels and error messaging.

- **Admin module**
  - `Admin.tsx`:
    - Fetches initial shipments and templates.
    - Subscribes to realtime shipments.
    - Provides handlers to:
      - Save shipments.
      - Log tracking events and emails.
      - Cancel shipments.
      - Manage templates.
    - Shows “Live” indicator for realtime connection.
  - `AdminContext.tsx`:
    - Central state for:
      - Shipments, templates, active shipment, modals.
      - Forms (registry, protocol, cancel, template).
      - Filters and search (including presets, URL sync).
      - View mode (Ledger vs Pulse).
      - Notifications and loading state.
  - Components:
    - `AdminToolbar`: search, filters toggle, view toggle, settings gear.
    - `MetricsCards`: clickable status cards that filter the ledger.
    - `LedgerView` / `ShipmentRow`: main table, with search highlighting and actions.
    - `PulseView`: Leaflet map, pulsing markers, dark theme.
    - Modals:
      - `AssetRegistryModal`: full shipment form for create/edit.
      - `ProtocolCommandModal`: status update + send email.
      - `AuditTrailModal`: registry + timeline + email log display.
      - `CancelModal`: authorize cancellation.
      - `TemplateManager`: CRUD templates with placeholders.

### 2.3 Data / Service Layer

- **Types**
  - Clearly defined TypeScript interfaces for:
    - `Shipment`, `TrackingEvent`, `EmailTemplate`, `EmailLog`.
    - `AuthState`, `UserRole`, `ShipmentStatus`.
- **Validation**
  - `services/validations.ts`:
    - Zod schemas ensure all customer/admin inputs are sanitized and structurally valid before hitting Supabase.
    - `sanitize` protects against HTML/script injection.
- **Storage service**
  - Encapsulates all Supabase access:
    - Auth flows.
    - CRUD on shipments, events, templates, logs.
    - Realtime subscriptions.
    - Email + AI via Edge Functions.
  - Handles mapping between DB snake_case and TS camelCase shapes.

### 2.4 Observability and Analytics

- **Sentry**
  - Captures:
    - Frontend React errors.
    - API/storage errors in `storageService`.
  - Allows post-deployment debugging with stack traces and context.
- **Plausible**
  - Tracks SPA pageviews and can be extended for custom events.
  - No cookies, privacy-friendly.

### 2.5 Theming and Accessibility

- **Dark mode**
  - Implemented via CSS custom properties (`--bg`, `--bg-card`, `--text`, `--border`) switched by `data-theme` on `<html>`.
  - Theme preference stored in `localStorage` and respects system dark mode.
- **Accessibility**
  - Headings follow proper hierarchy.
  - Inputs have labels, icon buttons have ARIA labels.
  - Focus states are visible, skip link is present.
  - Live regions used for notifications and tracking updates.

---

## 3. In Summary

- You have a **complete, production-caliber courier tracking system** with:
  - Polished UI/UX.
  - Secure and observable backend.
  - Realtime features and AI-powered communication.
- To launch, you mainly need to:
  - Finalize Supabase schema/RLS and Edge Functions.
  - Wire environment variables and secrets.
  - Run tests and manual QA.
  - Build and upload the `dist/` bundle plus `.htaccess` to Hostinger.

Once those steps are done, NextExpress is ready to run as a live logistics portal and admin command terminal.

