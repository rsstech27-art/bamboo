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

### Per-surface editing (multi-quad)
- Zone «Стена с выступом»: up to 12 marked points = up to 3 quads (main wall / protrusion / 3rd plane)
- Each surface has its own `SurfaceConfig` {panelCount, dividerPositions, sectorMaterials, molding + hMolding settings} in `surfacesRef`
- Global state = ACTIVE surface (switch-sync model): persist-effect writes globals into `surfacesRef[activeSurface]`; `switchSurface(idx)` snapshots refs into old index, loads target config into setters
- Surface selection: click on a quad in canvas (point-in-quad) or «Поверхность» buttons in edit sidebar; active quad shown with green dashed outline
- Divider/molding handles + sector highlight rendered only for the active surface; interactive helpers (findNearDivider, canvasX/YToWallRatio, findNearHMolding) operate on active quad
- Undo is surface-aware (`surfaceIndex` in HistorySnapshot); upload/«Назад» reset `activeSurface` and `surfacesRef`
- `cornerTypes` array ('external'|'internal' per junction; junction j = walls j+1/j+2) controls edge visual between adjacent quads (bright bend vs dark seam); UI = `CornerTypeCheckboxes` (checkbox pair per junction, one type per junction, different types can coexist across junctions)
- `wrapJunctions` boolean[] («Загиб одной панели»): on an external junction one panel bends around the corner — first sector of the next wall reuses the previous wall's last panel material (overrideFirstMaterial in renderQuad), seam drawn as soft light bend (no profile), КП counts it as ONE panel «(с загибом на угол)» and deducts junction profiles; corner/wrap state is in undo history and redraw deps

### Wall dimensions & area check
- Panel physical size: `PANEL_H_MM=2800`, `PANEL_W_MM=1220` (area `PANEL_AREA_M2`≈3,42 м²)
- Per-surface `wallWidthMm`/`wallHeightMm` in `SurfaceConfig` (0 = not set); persisted/switched/reset/undone like other surface fields; also in `liveCfg` (draw) and `kpCfgs` (КП)
- Edit sidebar «Размеры стены N»: width/height inputs in meters (stored ×1000 as mm); shows area, panels-needed = `ceil(width/1220) × ceil(height/2800)` (cols×rows), warns + one-click «Установить N панелей» button if `panelCount < needed`, height>2800 → row-stacking note
- КП PDF gains a «Размеры стен и расход материала» section (per-wall dims, area, project vs computed panel count, total wall area)

### Commercial proposal (КП) PDF
- After «Сохранить PNG», a green «Рассчитать КП (PDF)» button appears
- `handleGenerateKP`: re-renders a fresh export image (never stale), aggregates items across all surfaces (panels by article via sectorMaterials with BAMBOO_PANELS[0] fallback; vertical profiles = panelCount+1 if moldingStyle set; horizontal = hMoldingCount), prices from `SERIES_PRICES` (placeholder ₽/panel per series) + `MOLDING_INFO` (profile article/name/price)
- PDF built by drawing an A4 canvas (1240×1754, Cyrillic-safe via canvas text) and embedding into jsPDF as JPEG → `allwall-kp.pdf`

### Architecture (`src/App.tsx`, ~1900 lines)
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
- Canvas composite: photo → tempCanvas (panels + dividers + moldings) → mask (destination-out) → 0.95 alpha → woodCanvas 0.18 alpha → photo multiply 0.25
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
