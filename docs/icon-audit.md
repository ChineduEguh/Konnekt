# Icon consistency audit

The mobile screenshots show the same functional icon families rendered with different visual treatment between light and dark modes. The main causes are hard-coded light-only backgrounds and colours in `.metric-icon.green`, `.metric-icon.orange`, `.metric-icon.blue`, `.metric-icon.purple`, `.chart-orb`, `.empty-icon`, `.activity-icon`, `.link-symbol`, and `.card-icon`, plus inconsistent icon dimensions across navigation, metric cards, chart states, and action controls.

The current shared CSS uses 34px metric icon boxes, 31px activity icon boxes, and 40px chart empty-state boxes, while JSX commonly supplies arbitrary Lucide sizes such as 13px, 14px, 15px, 16px, 17px, 18px, and 20px. The dark-mode guardrails adjust text and surfaces but do not normalize icon stroke weight or provide theme-specific icon tokens. The fix should preserve semantic accent families while standardizing icon containers, icon dimensions, stroke width, border contrast, and dark-mode background and foreground pairs.

## Verification

Mobile screenshots were captured for the workspace overview and Analytics routes with `?theme=light` and `?theme=dark`. Metric icons now retain consistent 34px containers, aligned borders, and 18px Lucide strokes in both themes. Chart and navigation icons maintain readable semantic foregrounds against their corresponding light and dark surfaces. Desktop screenshots also confirmed the same alignment and spacing across the four metric cards and Analytics summary cards.
