# Konnekt

Konnekt is a multi-tenant connection infrastructure platform for smart links, QR journeys, events, customer profiles, conversations, and analytics. It is built with React 19, Tailwind CSS 4, Express, tRPC, Drizzle ORM, MySQL or TiDB, Vitest, and Manus OAuth.

## Implemented capabilities

Konnekt currently provides authenticated workspaces with owner, admin, and member access controls. Smart Links accept ordinary destinations such as `google.com` or `www.google.com`, normalize the protocol server-side, support custom slugs and domains, and capture click activity with routing metadata.

QR Studio supports manual destinations or existing Smart Links, real-time URL validation, test-link actions, preset themes, custom foreground and background colours, gradient foregrounds, module patterns, corner-eye styles, central logos, custom CTA frames, mobile and desktop preview modes, editable QR history, and PNG, SVG, and PDF downloads. The frame border and CTA label are included in exported files and native-share images.

Events support published public event URLs, attendee registration without workspace authentication, ticket codes, capacity controls, duplicate email protection, attendee search, status filters, CSV export, and protected QR check-in. Customers support tenant-scoped profiles and unified activity timelines combining event registrations and WhatsApp messages. Analytics provides combined smart-link click and QR scan line trends, exact chart tooltips, selectable date ranges, preceding-period comparison filters, trend indicators, geography, devices, browsers, top links, conversion funnel views, CSV export, and a Google Sheets-compatible clipboard export.

## Google Sheets export scope

The current Google Sheets action copies tab-separated scan data to the clipboard, shows a copied-data preview modal, reports a success toast, and opens a new Google Sheet. Users paste the copied data into the sheet. This approach requires no application-held Google credential and remains the supported export path for the current release. Analytics also displays current smart-link count, all-time link clicks, and all-time QR scan activity.

An authenticated one-click Google Sheets API integration is intentionally deferred. Workspace Settings now includes a persistent preparation toggle and clearly indicates that credentials are not connected. The toggle does not change the current clipboard workflow. The future integration will require secure Google OAuth or service-account access, explicit spreadsheet creation and write permissions, secret management, and production verification. It remains a future provider-dependent roadmap item rather than an active feature.

## Local development

Install dependencies and run the development server with:

```bash
pnpm install
pnpm dev
```

The standard validation commands are:

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
```

Database schema changes must be generated through Drizzle, reviewed, and applied through the managed database migration workflow. Secrets must be configured through the project secret manager and must not be committed to source control.

## Deployment

The managed Konnekt deployment is live at [konnektafric-t4x6vf5g.manus.space](https://konnektafric-t4x6vf5g.manus.space). Checkpoints are published automatically for this project. The GitHub repository is synchronized through the project checkpoint workflow. The linked Vercel team remains permission-limited, so Vercel updates are documented as attempted but dependent on access to the existing `konnekt` project and team scope.

## Current roadmap

The highest-value next steps are authenticated Google Sheets API export, verified CRM attribution for Smart Link and QR scan activity, official WhatsApp webhook ingestion, provider-backed payment checkout, and production activation of scheduled digest delivery after the deployed callback and owner notification channel are verified.

Konnekt text and interface copy follow the project requirement to avoid em dashes.
