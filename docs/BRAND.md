# Brand & Visual Direction — CrossLinkd

## Concept

**CrossLinkd = the Cross + the linked.** The name promises what the platform does: link seekers to trusted Christian businesses, churches, ministries, and professionals — and link those listings to one another in a living network.

**“A compass of light.”** The mark fuses a cross, a location pin, and radiating grace-lines — discovery guided by faith. Deliberately *not* Yellow Pages: no yellow overload, no dense columns, no clip-art. Instead: a premium SaaS-grade discovery network — spacious, rounded, calm.

- **Voice:** warm, respectful, plain-spoken. “Find • Belong • Flourish.”
- **Promise:** trustworthy discovery across every tradition, with transparent verification.

## Color system

| Token | Light | Dark (charcoal/graphite — never pure black) |
|---|---|---|
| bg / bg-soft | `#FAF8F3` / `#F3EFE6` (warm parchment) | `#171512` / `#1E1C18` |
| surface / surface-2 | `#FFFFFF` / `#F7F4EC` | `#23201B` / `#2A2620` |
| border / strong | `#E7E1D3` / `#D8D0BA` | `#353129` / `#4A4437` |
| text / soft / mute | `#1D1A14` / `#57503F` / `#8A8270` | `#F2EDE1` / `#CFC7B4` / `#9A917D` |
| Primary “grace gold” | `#D89522` → `#EFAE33` gradient | `#EFAE33` |
| Secondary “living teal” | `#22746A` | `#4AAE9C` |

Accent usage: CTAs + active states + focus rings (`--ring`). Teal: links, verification, info. Contrast targets: ≥ 4.5:1 body, ≥ 3:1 large/UI.

## Typography

- **Sans throughout:** Roboto (100–900, per brand spec) → system stack. Tight display tracking (`-0.02em`), `text-4xl/6xl` heroes, `2xl/3xl` section titles.
- Hierarchy: eyebrow chips → extrabold titles → soft subcopy → card grids.

## Components

Rounded cards (`1.25rem`, soft layered shadows, lift on hover), pill chips, gradient primary buttons, ghost/secondary variants, ringed inputs, verify badges, skeletons, empty/success/error states. Radii: cards `20px`, buttons `12px`, chips full-round.

## Motion

- GSAP: hero entrance + scroll reveals + grid staggers (once, `<0.8s`).
- Anime.js: CTA press pulse.
- Framer Motion: dropdowns, chips, modals, favorite taps.
- **All gated** behind `prefers-reduced-motion` (CSS kill-switch + JS guards).

## Imagery

Hue-driven gradient covers per listing (deterministic, no stock dependency); white monogram tiles; inline-SVG logo + favicon; OG cover per route. Photos (production) via Vercel Blob with `alt` required.
