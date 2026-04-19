# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## BambooStudio Pro (`artifacts/bamboo-studio`)

Russian-language web app for visualising bamboo wall panels on interior photos.

### Workflow
1. Upload interior photo (JPG/PNG/WEBP)
2. Click 4 wall corners to define the wall quad
3. Drag dividers to create panel sectors
4. Select a panel texture from the catalogue sidebar
5. Use eraser to mask furniture overlap areas
6. Add/remove corner moldings
7. Export final PNG

### Textures (`public/textures/`)
640 images extracted from the real ALL WALL PDF catalogue (`pdfimages -all`).
115 named panels in 14 collapsible series (accordion UI in sidebar):

| Series ID       | Name                   | Panels |
|-----------------|------------------------|--------|
| metall-25       | Металлическая серия    | 4      |
| liqmetall-25    | Жидкий металл -25      | 4      |
| pet-25          | ПЭТ матовая            | 4      |
| galv-15         | Гальваническая         | 4      |
| liqmetall-10    | Жидкий металл -10      | 9      |
| particles-10    | Частицы                | 4      |
| stone-gravel    | Щебень / Камень        | 8      |
| patina-copper   | Патина / Медь          | 6      |
| linen-cement    | Льняное / Цемент       | 6      |
| rainbow         | Радуга / Хамелеон      | 3      |
| mirror-gloss    | Зеркальная глянцевая   | 3      |
| wood            | Натуральное дерево     | 18     |
| reiki           | Рейки (деревянные)     | 16     |
| soft-touch      | Soft-touch / Кожа      | 26     |

### Рейки rendering
Panels with `slatOverlay: true` get vertical dark-gradient stripes drawn over the wood texture
inside the clipped panel polygon (SLAT_W=38px, GAP_W=6px, soft-edge gradient per gap).
This simulates the physical gaps between narrow wooden slats on a reyeka-style wall panel.
Textures for Рейки: tex-443..tex-469 range (light blonde to near-black ebony oak).

### Website Structure (full allwall.ru-style site)
- **Website Header** (sticky, `#111111`): ALL WALL logo + favicon.jpg, nav links → allwall.ru, phone +7 495 151-09-46, green accent `#7ec662`
- **Hero Section** (`#111111`): headline, subtitle, 4-step instruction cards (01-04), green CTA button → scrolls to tool
- **App Tool Section** (`height: calc(100vh - 64px)`): internal nav + canvas + sidebar
- **Footer** (`#111111`): brand, catalogue series, buyer links, contacts + "Открыть примерочную" button
- Page title: "ALL WALL — Онлайн-примерочная стеновых панелей"

### Architecture (`src/App.tsx`, ~1488 lines)
- `PANEL_SERIES` — array of 12 series, each with `{ id, name, panels[] }`
- `BAMBOO_PANELS` — flat array derived from `PANEL_SERIES.flatMap(s => s.panels)` (81 панель)
- `openSeries` state — `Set<string>` of expanded series IDs (accordion)
- `SeriesAccordion` component — collapsible series headers + 2-column grid of `PanelThumb`
- `historyRef` — `HistorySnapshot[]` stack (max 50 entries) for general undo
- `pushHistory()` — saves snapshot of `{sectorMaterials, dividerPositions, panelCount}` before changes
- `undo()` — pops history stack and restores state; bound to Ctrl+Z and "Отменить" navbar button
- `textureCacheRef` — `Record<string, HTMLImageElement>` for loaded texture images
- Texture preload `useEffect` runs after `drawFullScene` to avoid TDZ errors
- `drawFullScene` uses `canvas.clip()` + `ctx.createPattern()` + `DOMMatrix` scale transform
- Canvas composite: photo → tempCanvas (panels + dividers + moldings) → mask (destination-out) → 0.85 alpha → photo multiply 0.38
- `PanelThumb` component renders 48×72 thumbnail + name + article code

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
