# DESIGN.md - DownNux Manager Website Brand & Design System

Dial: ENERGY 2 / RHYTHM 3 / MOTION 2

## Identity & Voice
- Product: DownNux Manager (by HoodTech - https://hoodtech.my.id/)
- Audience: Cross-platform power users, developers, media archivers, and users wanting an open-source, modern alternative to legacy download managers.
- Character: High-precision engineering tool, tactile, reliable, honest, un-bloated.
- Visual Motifs: 32-segment parallel range channel allocation, physical isometric instruments (via Anatomy skill), dark obsidian canvas with fiber-stream background artwork.

## Palette & Theming (Rule R-29, R-25, R-34)
- Dark Mode:
  - Base: `#0b0917` (Deep Obsidian Void)
  - Elevated Card: `#121422` (Translucent 88% on background artwork)
  - Border: `rgba(139, 92, 246, 0.22)`
  - Primary Accent: `#6554c0` (Royal Violet, HoodTech signature)
  - Active Channel / Success: `#2dd4bf` (Teal stream) and `#22c55e` (Completed segment green)
  - Text Primary: `#f4f6fb` (Contrast ratio > 8.5:1, WCAG AAA compliant)
  - Text Muted: `#b4bcd0` (Contrast ratio > 5.5:1, WCAG AA compliant)
- Light Mode:
  - Base: `#f6f7fc` (Alabaster Paper)
  - Elevated Card: `#ffffff` (Translucent 92% with clean border)
  - Border: `#dfe3f0`
  - Primary Accent: `#5944b5`
  - Text Primary: `#141726` (Contrast ratio > 8.5:1, WCAG AAA compliant)
  - Text Muted: `#4a5268` (Contrast ratio > 5.2:1, WCAG AA compliant)

## Typography (Rule R-06)
- Headings & Prose: `Plus Jakarta Sans`, sans-serif (deliberate geometric balance, high legibility).
- Telemetry & Terminal: `JetBrains Mono`, monospace (clear character distinction for byte offsets, hashes, and CLI flags).

## Anti-Slop Enforcements
- No em dash (—) anywhere in UI or documentation copy (Rule R-02).
- Zero fake numbers or fake testimonials (Rule R-17, R-18, R-36).
- Every button has real function, modal action, clipboard copy, or external link (Rule R-26).
- Dual theme verified in both modes (Rule R-34).
- Touch targets >= 44x44px and fluid mobile reflow without overflow (Rule R-03).

