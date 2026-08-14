# Konnekt architecture

Konnekt is structured as a multi-tenant connection infrastructure workspace. The current application uses the full-stack template's React client, Express server, tRPC contracts, Drizzle schema, and Manus OAuth session flow. Workspace ownership is represented by `workspaces` and `workspaceMembers`, while customer journey primitives are stored in `smartLinks`, `connectionEvents`, `events`, `ticketTiers`, and `contacts`.

## Implemented now

The current milestone includes a responsive Konnekt command center, authenticated workspace initialization, role-bearing membership records, centralized workspace authorization checks, smart link creation, UTM fields, expiry metadata, salted scrypt password hash storage, validated device, country, and browser routing metadata, a dedicated `/r/:slug` redirect handler, event capture fields, workspace summary queries, structured LLM-backed campaign slug, UTM, and analytics summary assistance with deterministic fallback, and provider-neutral payment, WhatsApp, notifications, and digest contracts.

The Smart Link creation form accepts any user-entered or pasted URL, including protocol-free values such as `google.com`, and normalizes the protocol server-side. QR Studio separately supports either an existing smart-link binding or a manually entered URL. Its manual destination field validates HTTP and HTTPS URLs in real time, offers a Test link action that opens the normalized destination, and displays success feedback when a valid URL or smart link is selected. QR Studio also supports foreground and background colour controls, high-error-correction central logo compositing, preset colour themes, custom brand colour selection, square, rounded, and dot module patterns, square, rounded, and circular corner-eye styles, a tenant-scoped recent QR history with load, rename, and remove actions, and client-side PNG, SVG, and PDF downloads. Corner-eye style and custom names persist with saved QR assets.

The redirect handler performs a direct database lookup, enforces expiry, password, and device, country, and browser routing rules, constructs the destination, appends UTM parameters, records a click event asynchronously, enriches the event with country, device, browser, and UTM fields, and redirects. The handler records a resolution duration in event metadata for later performance monitoring. The hard latency target remains an operational requirement that should be benchmarked against the production database and region before claiming compliance.

## Deferred or provider-dependent

Payments intentionally remain deferred. `server/providers.ts` defines a `PaymentProvider` contract and a safe deferred implementation. The database now includes `payments` with workspace-scoped idempotency keys, provider references, status, amounts, currency, and metadata, plus `paymentWebhookEvents` with provider event deduplication, payload hashes, and processing timestamps. A future gateway must add verified signatures, checkout orchestration, and an audit trail without storing raw card data.

WhatsApp is provider-dependent. The current `WhatsAppProvider` abstraction refuses delivery when no official provider is configured. CRM-linked `whatsappConversations` and `whatsappMessages` tables now persist tenant-scoped message timelines, provider IDs, direction, and explicit delivery states. Outbound records remain `deferred` until official Meta Business API credentials and delivery handling are configured. Unofficial automation is out of scope.

The weekly digest flow now exposes a cron-authenticated `POST /api/scheduled/weeklyDigest` callback. A workspace stores its Heartbeat task UID in `scheduleCronTaskUid`, and the protected `workspace.scheduleWeeklyDigest` mutation creates the six-field UTC Heartbeat job and persists that UID. The callback looks up the workspace by the authenticated cron task UID, compiles the current seven-day summary, returns an idempotent orphan response when the task has no owner, and reports structured diagnostics on failure. Delivery remains deferred until a notification or email provider is configured. The production job must only be activated after this checkpoint is deployed.

## Current status and roadmap

Implemented capabilities include multi-tenant workspaces, role enforcement, protected smart links, QR Studio, event registration and check-in, analytics breakdowns, CRM contact profiles, payment persistence design, and a cron-authenticated weekly digest callback. Provider-dependent capabilities remain official WhatsApp delivery, payment checkout execution, notification delivery, and authenticated Google Sheets creation. The managed Konnekt deployment is available at `https://konnektafric-t4x6vf5g.manus.space`. The connected Vercel team currently reports no accessible project through the integration, while a direct link attempt reports that a project named `konnekt` already exists, so Vercel permission or team-scope reconciliation remains required. The highest-value roadmap items are verified public redirect attribution for CRM contacts, official WhatsApp webhook ingestion, owner notification triggers, authenticated Sheets export, and production scheduling activation after deployment.

## Environment variables

The project uses the environment variables supplied by the managed full-stack runtime for database access, Manus OAuth, storage, notifications, and built-in APIs. No `.env` file is committed. Future provider credentials must be added through the project secret manager rather than source code.

## Security notes

Workspace procedures use authenticated sessions and a centralized membership guard with owner, admin, and member role checks. Workspace-bound events, registrations, check-ins, analytics, QR assets, links, and summaries validate tenant ownership before reading or mutating records. Slug input is constrained to a lowercase URL-safe format, routing rules are restricted to supported keys, and destination URLs are parsed before storage. Link passwords are never stored in plaintext. They use salted scrypt hashes with constant-time verification support. Campaign assistance calls the server-side built-in LLM through structured JSON output and falls back to deterministic values if the model is unavailable. Redirect destinations are parsed with the platform URL parser and only stored destinations are used.

## Testing

`pnpm lint` runs Prettier checks, `pnpm check` runs TypeScript validation, `pnpm test` runs Vitest, and `pnpm build` produces the client and server bundles. Current tests cover session logout, deferred providers, digest window preparation, salted password hashing, and routing-rule normalization. Additional database-backed integration coverage is still required for permissions, routing, events, QR flows, and CRM timelines.

## Event operations and QR Studio

Event operations now include published event creation, attendee registration with email uniqueness per event, unique ticket codes, attendee listing, and protected check-in. A second check-in returns `already_checked_in` instead of mutating the record again. Registration records are persisted in `eventRegistrations`, and ticket state is represented by `registered`, `cancelled`, or `checked_in`.

QR Studio stores dynamic QR assets in `qrCodes`, each bound to a smart link. The client uses the QR encoding library to render a live PNG preview with configurable foreground color, background color, module shape presentation, and frame label. Downloads preserve the QR as a PNG, while the destination remains the smart link redirect path so it can be edited later without reprinting the physical asset.

## QR logos and exports

QR Studio accepts PNG, JPEG, and WebP logo files up to 1 MB. The client composites the logo into a centered high-error-correction panel, while the server uploads the original file to managed storage and persists the returned storage URL on the QR asset.

The analytics page aggregates QR-origin scan events by day and provides date windows for 7, 30, and 90 days. CSV export downloads a portable file directly. The Google Sheets action copies tab-separated data to the clipboard and opens a new Sheet so the user can paste the dataset into a live spreadsheet without exposing credentials to the application. Event management provides the same direct CSV download pattern for attendee records. CRM contact profiles now have tenant-scoped list and create procedures, and their WhatsApp message timeline is available through the protected conversations procedures.

## Analytics and QR Studio usability

The Analytics dashboard now provides a first-use empty state that points new workspaces toward creating a smart link or event. Its export controls, chart card, and empty-state actions use mobile-specific stacking and touch target sizing. The protected `analytics.summary` procedure supplies a factual, structured LLM summary of current workspace metrics and falls back to a deterministic sentence when the model is unavailable. The protected `analytics.overview` procedure and dashboard cards expose factual geography, device, browser, identifiable smart-link slug, and conversion-funnel breakdowns for the selected date range. Registration and check-in funnel stages are sourced from event registration records, while click and scan stages are sourced from connection events.

QR Studio keeps the preview visible as a distinct section below the controls on phones. Uploaded logos are composited into the QR canvas before the preview and download data URL are updated. The preview identifies whether a centre logo is active and reports an actionable error if the selected image cannot be decoded.

## Analytics, event filtering, and creative customization

The QR scan analytics view uses a responsive line chart for daily scan totals across the selected date range. QR Studio exposes foreground and background brand colours, font selection for the frame label, and local image or video creative preview. Event management provides live attendee search across name, email, phone, and ticket code, plus registered and checked-in filters, event font selection, and local creative preview. Creative files remain local until an authenticated storage workflow is connected, so they are not silently persisted.

## Cross-product contrast system

Konnekt now applies shared contrast guardrails to primary action buttons, muted labels, disabled controls, badges, tabs, form controls, cards, dialogs, and mobile overlay surfaces. Dark green and orange actions force white labels, muted text uses darker readable values, active tabs receive a white surface and dark label, and form placeholders remain visible on light backgrounds. The guardrails complement page-level styling across workspace overview, Analytics, QR Studio, Events, authentication states, empty states, and shared dialogs.

## URL, theme, and preview usability

Smart-link creation accepts destination values such as `google.com` and `www.google.com`; the server adds `https://` before validation and redirect handling. Smart links may include an optional custom short domain such as `elevationng.org`, which is persisted and used in workspace and QR Studio displays. The workspace navigation includes a persisted light or dark theme toggle. Dark theme tokens explicitly set readable foregrounds for controls, cards, tabs, form fields, dialogs, badges, and overlays. Analytics line points expose exact scan totals through interactive tooltips. QR Studio includes mobile and desktop preview frames so users can inspect presentation before saving or downloading.

The dark theme was verified through the preview override at mobile width for workspace overview, Analytics, and QR Studio. Explicit light page backgrounds and brand utility classes are overridden in dark mode so headings, charts, cards, empty states, form fields, buttons, and preview controls remain readable.

## Global theme and custom-domain defaults

Authenticated workspace pages share a visible top-right light or dark mode toggle. The control includes an accessible label, persists the user preference, and remains readable at mobile and desktop widths. Workspace custom-domain input no longer pre-populates a personal example. Existing browser storage containing `elevationng.org` is cleared, and new users see the neutral `yourbrand.com` placeholder instead.
