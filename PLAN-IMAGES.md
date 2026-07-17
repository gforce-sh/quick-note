# Image Support Plan

## Decisions

| # | Decision | Answer |
|---|---|---|
| 1 | Storage format | Public object store URLs (stored as markdown text in SQLite body) |
| 2 | Upload mechanism | Paste + drag & drop (no file picker) |
| 3 | Library vs app split | **Library**: image rendering in live preview. **App**: paste/DnD event handling and upload. |
| 4 | Upload strategy | Dedup — server hashes file by content, stores as `<hash>.<ext>`, reuses existing uploads. |
| 5 | Storage location | Object store (server relays blob with API token stored in server `.env`). |
| 6 | URL persistence | URL embedded in note body — no separate DB column needed. |

## Strategy

### Stream A: md-live-editor Library

Add an `ImageWidget` to md-live-editor so that `![alt](url)` markdown renders as an `<img>` element in live preview mode.

**Changes:**

1. **`md-live-editor/src/live-preview.ts`** — Add `ImageWidget` class that renders images inline (like text). Register it in `buildInlineDecorations` when the syntax tree encounters an `Image` node.

2. **`md-live-editor/src/table-preview.ts`** (or equivalent block handler) — Add block-level image rendering for full-width images. Register in `buildBlockDecorations` when the syntax tree encounters a block-level `Image` node.

3. **Rebuild and republish** — Rebuild the library (`npm pack`), update the `client/package.json` to use the new `.tgz` (delete existing `node_modules/md-live-editor`, extract from new `.tgz`).

**Key implementation notes:**

- `ImageWidget` extends `WidgetType` (from `@codemirror/view`)
- `toDOM()` returns `<img src="url" />`
- The `@lezer/markdown` parser (via `GFM`) produces `Image` nodes in the syntax tree for `![alt](url)` markdown
- Need to detect `Image` nodes in the tree iterate callbacks and render them as widgets

### Stream B: App (Client + Server)

The app handles image insertion: detects paste/DnD of images, uploads to the server, gets a URL back, and inserts `![alt](url)` into the editor.

**Data flow:**

```
User pastes / drops image
  → NoteEditor event handler detects image blob
  → NoteEditor calls POST /api/v1/images with the blob
  → Server hashes blob (content hash → filename)
  → Server uploads to object store (authenticated via API token from .env)
  → Object store returns public URL
  → Server returns { url: string }
  → NoteEditor inserts ![alt](url) into editor
  → Normal note save saves the markdown body (including URL) to SQLite
```

**Server extension:**

1. **`server/src/routes/images/routes.ts`** — New route file
   - `POST /api/v1/images` — Accepts multipart/form-data (image blob)
   - Returns JSON: `{ url: string }` (the public object store URL)
   - Server hashes the blob (SHA-256 or SHA-384), appends file extension detected from content (MIME type or magic bytes)
   - Stores as `<hash>.<ext>` in the object store
   - If file already exists (same hash), returns existing URL (dedup)

2. **`server/src/config.ts`** — Add object store configuration
   - `objectStoreUrl` (from env) — base URL of object store (e.g., `https://r2.example.com/bucket-name`)
   - `objectStoreKey` (from env) — API key / credentials for the object store
   - Optional: `objectStoreBucket` — bucket/container name

3. **Object store integration** — Server-side library for the chosen object store (e.g., `@aws-sdk/client-s3` for S3/R2, or equivalent for the chosen provider)

**Client extension:**

1. **`client/src/components/NoteEditor.tsx`** — Add image handling
   - Listen for `paste` events on the editor — if the pasted item is an image (check `ClipboardEvent.clipboardData.files[0]?.type.startsWith('image/')`), treat as image upload
   - Listen for `drag` / `drop` events on the editor container — if a dropped file is an image, treat as image upload
   - Extract image blob from event, send to server upload endpoint
   - On successful upload, insert `![alt](url)` markdown at the cursor position in the editor (via `MarkdownEditorHandle`)

2. **`client/src/api/notes-api.ts`** (or new `image-api.ts`) — Add `uploadImage(blob: Blob): Promise<string>` function that calls `POST /api/v1/images`

**Key implementation notes:**

- Use `useRef` to access `MarkdownEditorHandle` for cursor position and content manipulation
- For paste: check `e.clipboardData.files` for image files
- For drop: check `e.dataTransfer.files` for image files
- Use `FormData` to send the blob to the server endpoint
- Insert markdown using the existing `MarkdownEditorHandle` API (e.g., `setContent` or cursor-based insertion)

## Order of Execution

1. **Library** (md-live-editor) — Add `ImageWidget`, rebuild, republish
2. **Server** (Quick Note) — Add image upload endpoint, object store relay
3. **Client** (Quick Note) — Add `useImageUpload` hook / paste-DnD handlers to `NoteEditor`

## Constraints

- Images are **not sensitive** — object store URLs may be public (anyone with the URL can view)
- The server acts as a **relay** between the client browser and the object store, using server-side API credentials (never exposed to the client)
- Image URLs are **stable** (deterministic hash-based filenames)
- The object store handles its own backups — no need to backup images alongside SQLite
