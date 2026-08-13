# Figma Make backup

This folder records the Figma Make prototype that the Next.js app was recoded from.

The **running product is the Next.js app in this repo**, not the Make preview. Make is a clickable mock (buttons only navigate between screens). Auth, Firestore, watchlists, and the screener live in `src/`.

## Source

- Make file: [TVM Investment APP](https://www.figma.com/make/1WLR1gd8fZMbMSawU92HEe/TVM-Investment-APP)
- Cached preview: `https://fcd4fadb-79b8-4f6e-8824-adbd050cdc26-figmacachedpreview.preview.site/`

Figma Make is not a Design file, so MCP `get_design_context` cannot dump it. The generated source is in Make → **Show files**.

## Generated files observed in Make (Version 3)

Worked with 17 files, including:

- `index.css`
- `ui.tsx`
- `Sidebar.tsx`
- `Header.tsx`
- `App.tsx`
- `Landing.tsx`
- `Auth.tsx`
- `About.tsx`
- `Dashboard.tsx`

## Recode mapping

| Make screen | Next.js route |
| --- | --- |
| Landing | `/` (`src/components/LandingPage.tsx`) |
| About | `/about` |
| Auth (login / signup toggle) | `/login`, `/signup` |
| Dashboard shell | `/dashboard` |

## Design tokens carried into the recode

- Ink `#1a1442`, ink-soft `#5a5578`, violet `#5b3df5`, coral `#f47174`
- Fonts: Sora (display), DM Sans (body)
- Glass / glass-strong / glass-violet panels
- Motion: rise, floaty, sidebar spring, `active:scale-[0.97]`
