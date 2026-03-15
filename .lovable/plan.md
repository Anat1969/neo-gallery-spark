

# ART-AI — Project Setup

## What we're setting up

Foundation-only configuration so every future component inherits the correct design system, RTL layout, font, and routing structure.

### 1. Design System (index.css + tailwind.config.ts)
- Replace all CSS variables with ART-AI tokens: `#0A0A0F` background, `#C8F542` accent, `#1A1A24` secondary, `#F0F0F0` text, `#6B6B80` muted
- Set `--radius: 8px`
- Import **Heebo** font from Google Fonts in `index.html`
- Set Heebo as default font family

### 2. RTL & Hebrew Setup
- Add `dir="rtl"` and `lang="he"` to `<html>` in `index.html`
- Set base font-size to 16px

### 3. Global Styles
- Dark-only theme (no light mode needed)
- Button min-height: 44px global override
- Snappy transitions (200ms max)
- Card border: 1px solid muted color
- Max border-radius: 8px

### 4. Responsive Grid Utility
- Add grid utility classes: 1 col mobile / 2 col tablet (md) / 4 col desktop (lg)

### 5. Route Structure (App.tsx)
- `/` → GalleryGrid (placeholder page)
- `/gallery/:id` → GalleryRoom (placeholder page)
- `/admin` → AdminPanel (placeholder page)
- `/favorites` → FavoritesBoard (placeholder page)
- All placeholder pages show just a Hebrew title

### 6. Placeholder Pages
- Create empty placeholder files for all 4 pages with minimal Hebrew headings so routing works

**No components, no Supabase, no logic** — just the scaffolding.

