# Konnekt architecture

Konnekt is structured as a multi-tenant connection infrastructure workspace. The current application uses the full-stack template's React client, Express server, tRPC contracts, Drizzle schema, and Manus OAuth session flow. Workspace ownership is represented by `workspaces` and `workspaceMembers`, while customer journey primitives are stored in `smartLinks`, `connectionEvents`, `events`, `ticketTiers`, and `contacts`.

## Implemented now

The current milestone includes a responsive Konnekt command center, authenticated workspace initialization, role-bearing membership records, smart link creation, UTM fields, expiry metadata, password hash storage, device routing metadata, a dedicated `/r/:slug` redirect handler, event capture fields, workspace summary queries, campaign slug and UTM assistance, and provider-neutral payment, WhatsApp, notifications, and digest contracts.

The redirect handler performs a direct database lookup, constructs the destination, appends UTM parameters, records a click event asynchronously, and redirects. The handler records a resolution duration in event metadata for later performance monitoring. The hard latency target remains an operational requirement that should be benchmarked against the production database and region before claiming compliance.

## Deferred or provider-dependent

Payments intentionally remain deferred. `server/providers.ts` defines a `PaymentProvider` contract and a safe deferred implementation, but no gateway credentials, checkout flow, webhook verification, or payment tables are active. A future provider must add idempotency keys, verified signatures, durable provider references, and an audit trail without storing raw card data.

WhatsApp is also provider-dependent. The current abstraction refuses to send when no official provider is configured. Official Meta Business API credentials and a CRM-linked conversation table are required before enabling outbound or inbound message persistence. Unofficial automation is out of scope.

The weekly digest helper prepares a seven-day reporting window but is not scheduled yet. A production scheduler must call a handler under `/api/scheduled/`, authenticate cron requests, be idempotent, and only be scheduled after deployment and explicit operational setup.

## Environment variables

The project uses the environment variables supplied by the managed full-stack runtime for database access, Manus OAuth, storage, notifications, and built-in APIs. No `.env` file is committed. Future provider credentials must be added through the project secret manager rather than source code.

## Security notes

Workspace procedures use authenticated sessions and validate membership before link creation. Slug input is constrained to a lowercase URL-safe format. Link passwords are never stored in plaintext and are represented by a SHA-256 digest in this milestone. Production hardening should migrate password verification to a memory-hard password hashing function before enabling password-protected links. Redirect destinations are parsed with the platform URL parser and only stored destinations are used.

## Testing

`pnpm lint` runs Prettier checks, `pnpm check` runs TypeScript validation, `pnpm test` runs Vitest, and `pnpm build` produces the client and server bundles. Current tests cover session logout, deferred providers, and digest window preparation. Additional integration coverage is still required for database-backed routing, permissions, events, QR flows, and CRM timelines.

## Event operations and QR Studio

Event operations now include published event creation, attendee registration with email uniqueness per event, unique ticket codes, attendee listing, and protected check-in. A second check-in returns `already_checked_in` instead of mutating the record again. Registration records are persisted in `eventRegistrations`, and ticket state is represented by `registered`, `cancelled`, or `checked_in`.

QR Studio stores dynamic QR assets in `qrCodes`, each bound to a smart link. The client uses the QR encoding library to render a live PNG preview with configurable foreground color, background color, module shape presentation, and frame label. Downloads preserve the QR as a PNG, while the destination remains the smart link redirect path so it can be edited later without reprinting the physical asset.

## QR logos and exports

QR Studio accepts PNG, JPEG, and WebP logo files up to 1 MB. The client composites the logo into a centered high-error-correction panel, while the server uploads the original file to managed storage and persists the returned storage URL on the QR asset.

The analytics page aggregates QR-origin scan events by day and provides date windows for 7, 30, and 90 days. CSV export downloads a portable file directly. The Google Sheets action copies tab-separated data to the clipboard and opens a new Sheet so the user can paste the dataset into a live spreadsheet without exposing credentials to the application. Event management provides the same direct CSV download pattern for attendee records.

## Analytics and QR Studio usability

The Analytics dashboard now provides a first-use empty state that points new workspaces toward creating a smart link or event. Its export controls, chart card, and empty-state actions use mobile-specific stacking and touch target sizing.

QR Studio keeps the preview visible as a distinct section below the controls on phones. Uploaded logos are composited into the QR canvas before the preview and download data URL are updated. The preview identifies whether a centre logo is active and reports an actionable error if the selected image cannot be decoded.

## Analytics, event filtering, and creative customization

The QR scan analytics view uses a responsive line chart for daily scan totals across the selected date range. QR Studio exposes foreground and background brand colours, font selection for the frame label, and local image or video creative preview. Event management provides live attendee search across name, email, phone, and ticket code, plus registered and checked-in filters, event font selection, and local creative preview. Creative files remain local until an authenticated storage workflow is connected, so they are not silently persisted.

## Cross-product contrast system

Konnekt now applies shared contrast guardrails to primary action buttons, muted labels, disabled controls, badges, tabs, form controls, cards, dialogs, and mobile overlay surfaces. Dark green and orange actions force white labels, muted text uses darker readable values, active tabs receive a white surface and dark label, and form placeholders remain visible on light backgrounds. The guardrails complement page-level styling across workspace overview, Analytics, QR Studio, Events, authentication states, empty states, and shared dialogs.
