# AGENTS.md

This file is for future coding agents working on this project. Read it before making changes.

## Project Overview

This is an AI design-terminology journal: a weekly, hand-journal style infinite canvas where users paste or upload inspiration images. The app stores each image in the current date column, generates 5-10 design keywords and a reverse prompt, and supports a companion Chrome extension for right-click image workflows.

Primary stack:

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, Framer Motion, lucide-react.
- Backend: Node.js, Express.
- Database: PostgreSQL with Drizzle ORM, with an in-memory fallback when `DATABASE_URL` is not configured.
- AI: OpenAI Responses API, Gemini, Volcengine/Ark/Doubao, or OpenAI-compatible chat completions.
- Extension: Chrome Manifest V3 under `chrome-extension/`.

## Important Paths

- `src/main.tsx`: Main React app. Most canvas, upload, paste, drag, preview, copy, prompt-template, local cache, and sync behavior lives here.
- `src/styles.css`: Global visual language: hand-journal UI, glass buttons, light/dark canvas, board lines, analysis panel, toast, and modal styles.
- `src/components/ui/`: Small shadcn-style primitives.
- `server/index.ts`: Express routes and request validation.
- `server/openai.ts`: AI provider selection, image-analysis calls, and prompt construction.
- `server/store.ts`: Persistence abstraction over Drizzle/Postgres or in-memory storage.
- `server/db/`: Drizzle schema, client, and migrations.
- `chrome-extension/`: Chrome extension source, options page, manifest, icons, and README.
- `app.js`, `server.js`, root `styles.css`: older prototype files. Do not treat these as the current app unless the user explicitly asks.
- `snapshots/`: archived project snapshots. Do not modify unless the user asks.

## Run Commands

Install dependencies:

```bash
npm install
```

Run frontend only:

```bash
npm run dev
```

Run backend only:

```bash
npm run server
```

Run both:

```bash
npm run dev:all
```

In this workspace, ports have often been occupied. The stable working setup has been:

```bash
API_PORT=8792 VITE_API_TARGET=http://localhost:8792 npm run dev:all
```

Vite starts at port `5173`, then moves upward if ports are busy. The user has been using `http://localhost:5176/` recently. The backend default is `8787`, but the Chrome extension and local debugging currently prefer `8792` because old backend ports can become stale.

Build:

```bash
npm run build
```

Database:

```bash
npm run db:generate
npm run db:migrate
```

## Environment

- `.env.example` documents supported AI providers and database variables.
- `.env` may contain real API credentials. Never print, quote, commit, or expose its contents.
- If `DATABASE_URL` is absent, `server/store.ts` uses process-local in-memory storage. Restarting the backend loses server-only rows, although the frontend also caches data in localStorage.
- The Vite proxy sends `/api` to `VITE_API_TARGET` or `http://localhost:${API_PORT || 8787}`.

## Backend API

Defined in `server/index.ts`:

- `GET /api/images?weekStart=YYYY-MM-DD`: list images for a week.
- `GET /api/ai/status`: current provider/config/model status.
- `POST /api/analyze-image`: analyze a data URL image. Body: `{ imageDataUrl, promptTemplate?, fast? }`.
- `POST /api/images`: create an image. Body includes `weekStart`, `dayIndex`, `title`, `imageDataUrl`, `decoration`, optional `promptTemplate`, optional `asyncAnalysis`.
- `PATCH /api/images/:id/keywords`: update keywords.
- `DELETE /api/images/:id`: remove an image.

When `asyncAnalysis` is true, image creation returns immediately with placeholder keywords and the AI result is written later through `store.updateAnalysis`.

## Frontend Behavior To Preserve

The app is intentionally a canvas-like hand journal, not a dashboard.

- The week board uses seven columns, each `1200px` wide in world coordinates.
- Canvas zoom should feel Figma-like: wheel/pinch zoom is anchored to the pointer position and should not make images jump.
- The canvas supports mouse/trackpad panning. Card dragging must not conflict with canvas panning.
- On first load/refresh, the viewport should center on today's date column.
- Pasting an image anywhere puts it in today's date column.
- Double-clicking an empty day area opens local file upload.
- Drag/drop into a day column is supported.
- New cards should auto-layout into a responsive grid inside their date column and not overlap existing cards.
- User-customized card positions are preserved in localStorage.
- Deleting a card should re-grid the remaining cards for that day while keeping custom drag support.
- Image cards preserve source aspect ratio.
- Decorative clips/tapes/pins sit above the image.
- Keyword and prompt areas support click-to-copy with toast feedback.
- Keyword/prompt floating panels should only open from the bottom keyword zone, not from the whole image.

Important localStorage keys in `src/main.tsx`:

- `design-terminology-journal`: week/image cache.
- `design-terminology-card-positions`: custom card positions.
- `journal-prompt-template`: current prompt template.
- `journal-default-prompt-template`: saved default prompt template.
- `journal-theme`: light/dark theme.

The app also has a migration helper:

- `?migrate=export` exports old localStorage data.
- The import UI can restore data after changing localhost ports.

## Visual/UI Rules

The current visual direction is hand-drawn journal chrome around highly readable content.

- Non-image UI such as week labels, nav, empty states, and general chrome can use the hand-drawn style.
- Text inside images, analysis panels, prompt panels, toasts, keyword chips, and dense reading surfaces should remain normal sans-serif for readability.
- Floating image buttons use a consistent glass style via `.image-float-button`.
- Prompt and image modal close buttons should also use the glass style.
- Analysis panels should avoid heavy shadows.
- Dark mode should not reintroduce the old top-left radial light source.
- The weekly board should show vertical date-column separators that extend through the canvas, without horizontal date-section divider lines.

Before finishing meaningful frontend UI changes, inspect the page in the in-app browser when possible and check both the visual result and the interaction that was changed.

## Chrome Extension

Source lives in `chrome-extension/`.

Manifest:

- Manifest V3.
- Root context menu: `AI 灵感手帐`.
- Child menu: `生成 Prompt`.
- Child menu: `保存至手帐`.
- Icons are `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`, with `icon.svg` as source/reference.

Extension behavior:

- `生成 Prompt` opens a floating panel on the current webpage and shows loading inside the panel, not as a toast.
- Generated prompt supports one-click copy and toast feedback.
- `保存至手帐` posts to the local API with `asyncAnalysis: true`, then notifies open journal tabs through the `ai-journal-sync` custom event.
- The extension should prefer the current local backend at `http://localhost:8792`.
- After editing extension files, Chrome usually requires reloading the unpacked extension from `chrome://extensions`.

Useful extension checks:

```bash
node --check chrome-extension/background.js
node -e "JSON.parse(require('fs').readFileSync('chrome-extension/manifest.json','utf8')); console.log('manifest ok')"
```

Browser image clipboard support is limited. If implementing image copy, only show success when the browser actually writes a real image blob to the clipboard. Provide fallback actions like download, open original, or copy Markdown when needed.

## AI Provider Notes

`server/openai.ts` chooses providers in this order:

1. Explicit `AI_PROVIDER`.
2. Volcengine/Ark if `VOLCENGINE_API_KEY` or `ARK_API_KEY` exists.
3. OpenAI-compatible if `OPENAI_COMPATIBLE_API_KEY` exists.
4. Gemini if `GEMINI_API_KEY` exists.
5. OpenAI.

The analyzer expects strict JSON:

- `keywords`: 5-10 strings.
- `reversePrompt`: string.

Fast prompt generation uses lower image detail and lower token limits where the provider supports it. Keep `fast: true` paths lightweight for the Chrome extension.

## Validation Checklist

Use the smallest validation that covers the change:

- Type/frontend/backend changes: `npm run build`.
- Extension background changes: `node --check chrome-extension/background.js`.
- Manifest changes: parse `chrome-extension/manifest.json`.
- Database schema changes: run Drizzle generate/migrate commands as appropriate.
- Frontend interaction changes: test in the browser, especially zoom/pan/card drag/paste/upload/preview/copy flows.

## Common Gotchas

- Changing localhost ports changes the browser origin, so localStorage data can appear missing. Use the migration helper or return to the original port.
- Backend in-memory data disappears on restart. Use Postgres through `DATABASE_URL` when persistence matters.
- A successful extension toast does not guarantee the journal tab updated unless `ai-journal-sync` reached an open journal tab or the app re-polled the current week.
- Do not overwrite user-customized card positions unless the feature requires re-layout, such as delete/re-grid behavior for a day.
- Keep image data URL payloads in mind: Express currently accepts up to `14mb`.
- Avoid broad refactors in `src/main.tsx`; it is large and stateful. Prefer focused, well-contained edits.
