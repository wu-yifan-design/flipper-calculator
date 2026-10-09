# Offer Floor — design spec

Style target: Shopify Polaris-like commerce structure (type scale, spacing, radius, component anatomy from the public `@shopify/polaris-tokens`, checked 2026-10-09) rendered in our own **Dark theme**: black→charcoal gradient with film grain, translucent dark cards, and **green as the only accent hue**. No Shopify logos, icons, fonts files, wordmarks or other proprietary assets — names, mark and icons are our own.

## Principles
1. **One answer first.** Each tab leads with a single hero number (Max buy / Lowest offer), then the reasoning.
2. **One hue.** Green (`#3ddc84`) is the only color: primary actions, focus, active tab, links, verified line, positive money. Loss/below-floor is **neutral** (white/gray) and is told apart by shape and words — outlined/hatched box, minus icon, "Below target" / "Counter" / "(loss)" / ▼ — never by a second hue.
3. **Show the math.** Every fee is a line item with its rate and base, like a commerce order summary.
4. **Trust is explicit.** Rates status + update date sit directly under the title.
5. **Thumb-first.** 44px targets, 16px inputs (no iOS zoom), one column on phones; two columns ≥ 960px.
6. **Quiet chrome.** Hairline borders (white 10%), soft drop shadows, 12px card radius; the only gradients are the page background and the neutral glow.

## Tokens
Single source: `assets/tokens.css` (`--t-*` CSS variables). Components in `assets/styles.css` use tokens only.

| Group | Tokens |
|---|---|
| Type | `--t-font` Inter → system stack (Inter used only if installed; no web-font request). Sizes 11/12/13/14/16/20/24/30/36/44 (`--t-fs-275…1000`). Weights 450/550/650/700. |
| Space | 4px scale: `--t-space-050`(2) `100`(4) `150` `200`(8) `300`(12) `400`(16) `500` `600`(24) `800`(32) `1000` `1200` |
| Radius | 4 / 6 / **8 (inputs, buttons, badges)** / **12 (cards, banners)** / 16 / full |
| Color | Dark theme — see below. |
| Elevation | `--t-shadow-card` (inset white-10% hairline + soft black drop), `--t-shadow-button` (white-16% hairline), `--t-shadow-button-primary` (green, inner highlight), `--t-shadow-button-inset` (pressed), `--t-focus-ring` (2px #0a0a0a + 2px green) |
| Layout | `--t-page-max` 1040px, `--t-col-max` 560px (phone/tablet column), `--t-touch` 44px |

## Components
- **App bar**: 56px, black 55% + 14px backdrop blur (solid 72% black fallback), hairline bottom border. Own mark (black rounded square, green "OF", green hairline) + app name + neutral "Free tool" badge.
- **Page header**: H1 24px/650, secondary subtitle 14px, then the **rates trust line**.
- **Rates trust line / banner**: verified → green-tint pill with green hairline, green "✓ Rates verified", gray "Rates updated 2026-10-09 · eBay & USPS fee pages" (source on hover). Placeholder → neutral banner, white-36% outline, "!" ring icon, "Placeholder rates — pending verification".
- **Segmented control (tabs)**: white bevelled container, 3 equal buttons, 8px radius; selected = green 14% tint + green hairline + green 650 text; unselected = gray text, hover white 6%. Sticky at top on mobile.
- **Card**: translucent `rgba(28,28,30,.78)` (≈ #1c1c1e) — no backdrop blur on cards (cheap scrolling), 12px radius, `--t-shadow-card`, 16px padding (20px ≥ 960px). Optional header row: 14px/650 title + secondary caption. Sections split by 1px `--t-border-secondary`.
- **Text field**: label 13px/550 above; 40px+ high field (44px on touch), 8px radius, 1px `#6e6e73` border on a darker field (black 35%), white 16px text. Prefix `$` / suffix `%` rendered inside the field in secondary text. Focus: 2px `--t-border-focus` outline. Help text 12px secondary.
- **Select**: same box as text field + custom chevron; full width.
- **Disclosure** ("Shipping charged, supplies & sales tax"): plain link-style button with chevron.
- **Result hero**: caption (12px uppercase-free, secondary) → number 36px (44px desktop)/700 tabular-nums → status badge (Success "Profitable" / Critical "Below target" / "Pass") → one-line plain-English verdict. Good = green 10% tint + green hairline, green number, solid green "✓ Profitable" badge. Bad = transparent box with white-36% outline and faint diagonal hatching, **white** number, outlined badge with ⊖ minus icon ("Below target", "Counter", "Unreachable").
- **Fee breakdown table** (order-summary style): rows 13–14px, label left, amount right with tabular numbers; rate/base as 12px secondary sub-line; deductions in text color with "−"; subtotal row 650; total row 700 with hairline top border; net is green when ≥ 0, white with "(loss)" suffix when < 0.
- **Comparison table**: header row gray 12px; worse Δ = white 650 with ▼ marker; other Δ gray.
- **Badges**: 12px/550, 2px 8px, 8px radius, optional 12px icon. Neutral = white 8% / white text; accent ("Early access", success) = green 16% / green text; on green hero = solid green / black text; outlined ("Test pricing", loss) = transparent / white text / white-36% outline.
- **Buttons**: Primary = green `#3ddc84` fill, **black** 650 text, hover `#5ee69b`, pressed `#2fc472` + inset. Secondary = transparent with white-16% hairline, white text. Plain = green text, no chrome. Min height 44px on mobile, 8px radius.
- **Waitlist block**: card with green "Early access" badge, title 20px/650, pitch, inline email field + primary "Join waitlist" (stacks ≤ 360px), divider, secondary full-width "Pre-order" (or one per price option), caption "Test pricing — not final", privacy caption. Status messages: success green; error white with ⚠.
- **Footer**: secondary 12px, centered on mobile, max-width column.

## Dark theme (replaces the light palette)
**Background** — `html` is `#0a0a0a`; two fixed, `pointer-events:none` layers behind content (`body::before/after`, z-index −1, body `isolation:isolate`):
1. Linear gradient `#0a0a0a → #1c1c1e` (top→bottom) + neutral radial glow `rgba(255,255,255,.05)` at top center.
2. Film grain: 160px tiled inline-SVG `feTurbulence` (fractalNoise, baseFrequency .85, white) at **7% opacity**. Static (no animation), rasterised once and tiled, no `filter:` on scrolling elements — cheap on mobile.

| Role | Token | Value |
|---|---|---|
| Page | `--t-bg` / `--t-bg-top` / `--t-bg-bottom` | `#0a0a0a` / `#0a0a0a` / `#1c1c1e` |
| Card | `--t-surface` | `rgba(28,28,30,.78)` (contrast ref `#1c1c1e`) |
| Raised (app bar, banner) | `--t-surface-raised` | `rgba(44,44,46,.72)` + blur 14px where supported |
| Field | `--t-field` | `rgba(0,0,0,.35)` (≈ `#121214`) |
| Subtle fill / hover | `--t-surface-secondary` / `--t-surface-hover` | white 4% / 6% |
| Text | `--t-text` / `--t-text-secondary` / `--t-text-disabled` | `#f5f5f7` / `#a1a1a6` / `#6e6e73` (placeholder only) |
| Hairlines | `--t-border` / `--t-border-secondary` | white 10% / 6% |
| Input border | `--t-border-input` / hover | `#6e6e73` / `#8e8e93` |
| Loss outline | `--t-border-strong` | white 36% |
| **Accent (only hue)** | `--t-accent` / hover / pressed | **`#3ddc84`** / `#5ee69b` / `#2fc472` |
| On accent | `--t-on-accent` | `#0a0a0a` |
| Accent tints | `--t-accent-surface` / `-2` / `--t-accent-border` | green 10% / 16% / 35% |

Semantic aliases kept for components: `success*` → accent; `critical*` → neutral white/transparent; `info*`/`warning*` → neutral. Links and focus = accent.

**Contrast (computed, WCAG 2.x)** — primary text on card 15.6:1, on page 18.2:1; secondary on card 6.6:1, on page 7.7:1, on green hero tint 5.5:1; green on card 9.5:1, on page 11.1:1, on hero tint 7.9:1, on active-tab/badge tint 6.8:1; black on green button 11.1:1; white on neutral badge 12.4:1; field text 17.2:1; banner body 6.3:1. Non-text (1.4.11): input border 3.7:1, focus ring 11.1:1, loss outline 3.3:1. Green outlines on tabs/hero are decorative (state also carried by fill + text).

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
- Polaris-style banner, **neutral + green only**: near-opaque `rgba(32,32,34,.94)` + blur, hairline, soft shadow, 12px radius; own app icon (40px), white title 14/650, gray 13px body (white for **Share** / **Add to Home Screen**, green share glyph), green "Install" + green plain "Not now", gray close ×. Fixed to the bottom on mobile (safe-area aware); never shown ≥ 960px.
- Shown only on mobile, not in standalone mode, not after dismissal (`localStorage.flip_a2hs_dismissed`). Android/Chromium: only after `beforeinstallprompt`. iOS: Share → Add to Home Screen instructions.
- Manifest theme/background + `<meta name=theme-color>` = `#0a0a0a`; iOS status bar `black-translucent`. Icons: our own green "OF" on #0a0a0a (192, 512, maskable 512, apple-touch 180, favicon 32).

## Accessibility
- All text pairs meet AA (see Dark theme contrast list; lowest body text 5.5:1). Placeholder `#6e6e73` is hint-only.
- Never color-only: positive vs negative differ by fill vs outline/hatch, ✓ vs ⊖ icon, and words ("Profitable" / "Below target" / "Counter" / "(loss)" / ▼).
- Visible green focus ring (2px black gap + 2px green) on every control; tabs use `role=tab` + `aria-selected`; result cards `aria-live=polite`; labels wrap inputs.
- `color-scheme: dark` for native controls; respects `prefers-reduced-motion` (no transitions; background is static).
