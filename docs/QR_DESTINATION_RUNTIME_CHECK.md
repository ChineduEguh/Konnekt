# QR destination runtime verification

At 390px mobile width, QR Studio rendered without a crash and showed both destination paths: a free-form URL input with the placeholder `google.com or https://your-site.com`, and an existing smart-link selector. The save action remained disabled until one destination source is provided. The QR preview rendered a default placeholder target and the Smart Link form on the workspace rendered only its original free-form destination input, without the misplaced shortened-link selector.

Automated formatting, lint, typecheck, tests, and production build passed after the schema and router updates.
