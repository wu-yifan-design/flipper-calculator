# Offer Floor — design spec

Style target: Shopify Polaris-like commerce UI (calm neutral surfaces, bevelled white cards, dark primary buttons, semantic green/red only for money outcomes). Token **values** follow the public `@shopify/polaris-tokens` package (checked 2026-10-09). No Shopify logos, icons, fonts files, wordmarks or other proprietary assets — names, mark and icons are our own.

## Principles
1. **One answer first.** Each tab leads with a single hero number (Max buy / Lowest offer), then the reasoning.
2. **Money color = meaning.** Green only for "this works", red only for "this loses / below floor". Everything else is neutral grey.
3. **Show the math.** Every fee is a line item with its rate and base, like a commerce order summary.
4. **Trust is explicit.** Rates status + update date sit directly under the title.
5. **Thumb-first.** 44px targets, 16px inputs (no iOS zoom), one column on phones; two columns ≥ 960px.
6. **Quiet chrome.** Subdued borders (#e3e3e3), 1px shadows, 12px card radius; no gradients except the button bevel.

## Tokens
Single source: `assets/tokens.css` (`--t-*` CSS variables). Components in `assets/styles.css` use tokens only.

| Group | Tokens |
|---|---|
| Type | `--t-font` Inter → system stack (Inter used only if installed; no web-font request). Sizes 11/12/13/14/16/20/24/30/36/44 (`--t-fs-275…1000`). Weights 450/550/650/700. |
| Space | 4px scale: `--t-space-050`(2) `100`(4) `150` `200`(8) `300`(12) `400`(16) `500` `600`(24) `800`(32) `1000` `1200` |
| Radius | 4 / 6 / **8 (inputs, buttons, badges)** / **12 (cards, banners)** / 16 / full |
| Color | bg `#f1f1f1`, surface `#fff`, surface-secondary `#f7f7f7`, text `#303030`, text-secondary `#616161`, border `#e3e3e3`, input border `#8a8a8a`, focus/link `#005bd3`, brand `#303030` |
| Semantic | success `#047b5d` / surface `#cdfed4` / text `#014b40`; critical `#c70a24` / `#fee8eb` / `#8e0b21`; warning `#fff1e3` / `#5e4200`; info `#eaf4ff` / `#003a5a` |
| Elevation | `--t-shadow-card` (bevel + 1px drop), `--t-shadow-button`, `--t-shadow-button-primary`, `--t-shadow-button-inset` (pressed), `--t-focus-ring` (2px white + 2px #005bd3) |
| Layout | `--t-page-max` 1040px, `--t-col-max` 560px (phone/tablet column), `--t-touch` 44px |

## Components
- **App bar**: white, 56px, bottom border. Own mark (rounded dark square "OF") + app name + neutral "Free tool" badge.
- **Page header**: H1 24px/650, secondary subtitle 14px, then the **rates trust line**.
- **Rates trust line / banner**: verified → success badge-style pill "✓ Rates verified · updated 2026-10-09" + source text on hover. Placeholder → warning banner (warning surface, 12px radius) "Placeholder rates — pending verification".
- **Segmented control (tabs)**: white bevelled container, 3 equal buttons, 8px radius; selected = `--t-surface-selected` fill + `--t-shadow-button-inset`, 650 weight; unselected = secondary text. Sticky at top on mobile.
- **Card**: surface, 12px radius, `--t-shadow-card`, 16px padding (20px ≥ 960px). Optional header row: 14px/650 title + secondary caption. Sections split by 1px `--t-border-secondary`.
- **Text field**: label 13px/550 above; 40px+ high field (44px on touch), 8px radius, 1px `--t-border-input`, 16px text. Prefix `$` / suffix `%` rendered inside the field in secondary text. Focus: 2px `--t-border-focus` outline. Help text 12px secondary.
- **Select**: same box as text field + custom chevron; full width.
- **Disclosure** ("Shipping charged, supplies & sales tax"): plain link-style button with chevron.
- **Result hero**: caption (12px uppercase-free, secondary) → number 36px (44px desktop)/700 tabular-nums → status badge (Success "Profitable" / Critical "Below target" / "Pass") → one-line plain-English verdict. Background tint: success-surface or critical-surface at the hero block only.
- **Fee breakdown table** (order-summary style): rows 13–14px, label left, amount right with tabular numbers; rate/base as 12px secondary sub-line; deductions in text color with "−"; subtotal row 650; total row 700 with top border 1px `--t-border` and success/critical color for the net.
- **Comparison table**: header row secondary 12px; Δ column colored only when negative (critical) / positive profit (success).
- **Badges**: 12px/550, 2px 8px, 8px radius. Neutral `#e3e3e3`/text, success `#affebf`/`#014b40`, critical `#fee8eb`/`#8e0b21`, info `#d5ebff`/`#003a5a`, attention `#ffd6a4`/`#5e4200`.
- **Buttons**: Primary = `--t-brand` fill, white 650 text, `--t-shadow-button-primary`, hover `--t-brand-hover`, pressed inset. Secondary = white, `--t-shadow-button`, text color. Tertiary/plain = link color, no chrome. Min height 44px on mobile, 8px radius.
- **Waitlist block**: card with info badge ("Early access"), title 20px/650, pitch, inline email field + primary "Join waitlist" (stacks ≤ 360px), divider, secondary full-width "Pre-order" (or one per price option), caption "Test pricing — not final", privacy caption. Status messages use success/critical text.
- **Footer**: secondary 12px, centered on mobile, max-width column.

## Layout
- **Mobile (default)**: single column, `--t-col-max` 560px centered, 12px side padding, 12px gap between cards. Tabs sticky.
- **Desktop (≥ 960px) — one shared 2-column grid**: container `--t-page-max` 1040px with 24px side padding → content 992px = two equal columns of 484px + 24px gutter (`--t-gutter`). Every block snaps to these two column edges:
  - **Header**: H1 spans both columns; subtitle in col 1; rates trust line in col 2, right-aligned and bottom-aligned with the subtitle.
  - **Tabs**: exactly col-1 width (`calc((100% - gutter)/2)`), left edge = inputs card.
  - **Main row**: inputs card in col 1, result card in col 2, **tops aligned** (`align-items:start`); the result column is sticky. Both cards share a 32px-min card header (title left, action/caption right) so the first text baselines line up. Result card width is identical on Buy / Offer / Promote (only the content changes).
  - **Waitlist**: one full-width card; copy (badge, title, pitch) in col 1, form + pre-order in col 2.
  - **Footer**: top border, two columns on the same grid, left-aligned.
  - **Split pages (cleaner, waitlist template)**: same container; hero copy in col 1, waitlist card in col 2, tops aligned.
- **Vertical rhythm (desktop)**: `--t-rhythm` 24px between sections (header → tabs block, main row → waitlist, waitlist → footer); 16px tabs → cards; 24px card padding; 40px top of page.
- **Card padding**: 16px mobile, 24px desktop; card headers 12px (mobile) / 16px (desktop) below.

## Add to Home Screen banner
- Polaris-style **info banner**: info surface, 12px radius, own app icon (40px), title 14/650, body 13px info text, actions (primary small "Install" + plain "Not now"), close ×. Fixed to the bottom on mobile (safe-area aware); never shown ≥ 960px.
- Shown only on mobile, not in standalone mode, not after dismissal (`localStorage.flip_a2hs_dismissed`). Android/Chromium: only after `beforeinstallprompt`. iOS: Share → Add to Home Screen instructions.
- Manifest theme/background = `--t-bg` `#f1f1f1`; icons are our own "OF" mark (192, 512, maskable 512, apple-touch 180).

## Accessibility
- Contrast (WCAG AA, computed): text `#303030` on `#fff` 13.2:1; secondary `#616161` on `#fff` 6.2:1 / on `#f1f1f1` 5.5:1; link/focus `#005bd3` on `#fff` 6.1:1; success `#047b5d` on `#fff` 5.3:1 and on the green hero tint 4.7:1 (hero number is large text, needs 3:1); critical `#c70a24` on `#fff` 6.0:1 / on red tint 5.1:1; badge texts on their fills 6.8–9.8:1; white on `#303030` 13.2:1.
- Color is never the only signal: badges + "−" signs + verdict text accompany green/red.
- Visible focus ring on every control; tabs use `role=tab` + `aria-selected`; results `aria-live` via status messages; labels wrap inputs.
- Respects `prefers-reduced-motion` (no transitions).
