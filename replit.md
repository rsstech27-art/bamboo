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
24 named panels in 3 series are registered in `BAMBOO_PANELS`:
- **Металлическая серия** (8 panels): tex-117..129 — brushed & liquid metal
- **ПЭТ / Гальваническая** (6 panels): tex-133..143 — PET matte, galvanic
- **Жидкий металл / Зеркальная** (10 panels): tex-147..185 — particles, mirror, gold, rose copper

### Architecture (`src/App.tsx`, ~1090 lines)
- `BAMBOO_PANELS` — array of 24 panels with `{ id, article, name, color, texture }`
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
