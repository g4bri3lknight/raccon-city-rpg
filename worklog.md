---
Task ID: 1
Agent: main
Task: Create Admin Panel with CRUD for items, quests, events, documents, sounds, images

Work Log:
- Read existing project structure: DebugPanel, data files, Prisma schema, game store, loader
- Updated Prisma schema with new GameSound and GameImage models
- Ran db:push to apply schema changes
- Created 6 CRUD API routes under src/app/api/admin/: items, quests, events, documents, sounds, images
- Created /api/admin/refresh endpoint for game data reload
- Created /api/admin/seed endpoint for sound data seeding
- Updated src/game/data/loader.ts with refreshGameData() function
- Built AdminPanel.tsx component with 6 tabs, expandable rows, create/edit forms
- Added AdminPanel to page.tsx and F3 keyboard shortcut
- Added Admin Panel shortcut button in existing DebugPanel
- Seeded 23 sounds into DB
- Verified clean lint, dev server running

Stage Summary:
- Prisma schema: added GameSound, GameImage models
- API routes: /api/admin/{items|quests|events|documents|sounds|images} + /refresh + /seed
- AdminPanel component: 580px wide panel with dark theme, 6 entity tabs, full CRUD UI
- Accessible via F3 key or DebugPanel button
- Game data refresh button to reload in-memory data after CRUD changes

---
Task ID: 2
Agent: main
Task: Add BLOB storage support for audio/image files in SQLite DB

Work Log:
- Updated Prisma schema: added `data` (Bytes/BLOB), `mimeType` (String), `refKey` (String, unique) to GameSound and GameImage
- Ran db:push to apply schema changes
- Created `/api/media/sound/route.ts` - serves audio BLOBs by refKey or id
- Created `/api/media/image/route.ts` - serves image BLOBs by refKey or id
- Created `/api/admin/sounds/upload/route.ts` - multipart upload endpoint for sounds
- Created `/api/admin/images/upload/route.ts` - multipart upload endpoint for images
- Updated `/api/admin/sounds/route.ts` and `/api/admin/images/route.ts` to safely handle BLOB data in list responses
- Updated `src/game/engine/sounds.ts`: `loadSfx()` now tries DB BLOB first via `/api/media/sound?ref=`, then falls back to file on disk
- Updated `src/game/engine/sounds.ts`: `playBgm()` now tries DB BLOB first, then falls back to file
- Updated `src/components/game/AdminPanel.tsx`: added `FileUploadSection` component with file picker, metadata fields, upload button
- Added Upload icon import, file upload section visible only on sounds/images tabs
- Updated expanded row details to show BLOB status (✅ loaded with size vs "no file")
- Updated seed script with refKey mappings for all sound internal keys
- Re-seeded sounds with refKey field

Stage Summary:
- Files are stored as binary BLOBs directly in SQLite (no separate files needed)
- Each sound/image has a `refKey` that maps to the internal engine name (e.g., `playAttack`, `bgm_title`)
- Audio engine: DB-first loading → fallback to file on disk (fully backwards compatible)
- Admin Panel: drag-and-drop upload UI with metadata (id, name, refKey, category, volume, loop)
- API: `/api/media/sound?ref=playAttack` serves the BLOB with proper Content-Type
- Upload: `POST /api/admin/sounds/upload` with FormData (multipart)

---
Task ID: 3
Agent: main
Task: Fix Prisma browser error — loader.ts must not import db client in client-side code

Work Log:
- Diagnosed the error: `loader.ts` imported `db` from `@/lib/db` (PrismaClient) which cannot run in the browser
- Created `/api/game-data/route.ts` — server-side endpoint that fetches all game data (items, events, documents, quests) via Prisma and returns JSON
- Rewrote `src/game/data/loader.ts` — removed all Prisma imports, now uses `fetch('/api/game-data')` to load data from the API
- Added proper DB row type interfaces and mapper functions for each entity type
- Updated `/api/admin/refresh/route.ts` — simplified to just return success (client-side `refreshGameData()` now handles the reload via API)
- Updated `src/components/game/AdminPanel.tsx` — imported `refreshGameData` and updated `handleRefreshGameData` to call it directly instead of hitting a server endpoint
- Verified all `db` imports only exist in API route handlers (server-side), not in client code
- Lint clean, dev server confirmed working: `GET / 200` and `GET /api/game-data 200` in logs
- No more "PrismaClient is unable to run in this browser environment" error

Stage Summary:
- Architecture fix: moved all Prisma calls from client-side loader to server-side API route
- New endpoint: `GET /api/game-data` returns `{ items, events, documents, quests }` as JSON
- `loader.ts`: pure client-side, uses `fetch('/api/game-data')` with static fallback
- AdminPanel refresh: calls `refreshGameData()` client-side which re-fetches from API
- Sound 404s for BGM (bgm_title, etc.) are expected — no BGM MP3 files exist yet (need upload via Admin Panel)
- SFX sounds work via file fallback from `public/audio/*.wav`
