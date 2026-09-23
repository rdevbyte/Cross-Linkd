# Accessibility Strategy (WCAG 2.2 AA target)

## Implemented

- [x] Semantic landmarks (`header/nav/main/footer`, headings hierarchy, lists, tables with `th`).
- [x] Skip-to-content link; visible `:focus-visible` rings (accent, 2px + offset).
- [x] Keyboard: full search combobox (arrows/enter/esc), chips removable by button, map has list-view alternative, modals trap-ish + esc.
- [x] Screen readers: `aria-label/expanded/selected`, `role=combobox/listbox/option/status`, icon `aria-hidden`, QR has label, chart has `role=img` + description.
- [x] Forms: visible labels, `required`/`maxlength`, inline error `role=alert`, autocomplete tokens.
- [x] Contrast: body ≥ 4.5:1 both themes (charcoal `#171512` + `#F2EDE1`; parchment + `#1D1A14`); muted text reserved for non-essential.
- [x] Motion: `prefers-reduced-motion` kill-switch (CSS) + GSAP/Anime/Framer guards; no auto-play; smooth-scroll disabled.
- [x] Touch: ≥ 40px targets on primary controls; mobile map controls native to Leaflet.
- [x] Text: fluid to 200% zoom; no text-in-image;adai

## Testing checklist

1. Keyboard-only pass (tab order, search, menus, modal, map fallback link).
2. VoiceOver + NVDA spot-check on `/`, `/search`, profile, dashboards.
3. axe DevTools: 0 critical/serious.
4. Contrast spot-check in both themes (cards, chips, badges, muted).
5. 200% zoom + 320px viewport reflow.
6. `prefers-reduced-motion: reduce` → no parallax/reveal/pulse.

## Backlog (Phase 1.1)

- Leaflet keyboard shortcut cheatsheet + marker listbox mirror.
- `aria-live` announcements for filter result counts.
- Captions/transcripts required for listing videos.
