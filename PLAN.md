# Notes — Implementation Plan (v1)

A single-user, markdown note-taking web app with an Obsidian-style inline Live Preview editor. Goal: load fast, respond fast, stay simple. Built test-first. **v1 target: running locally.** Deployment is deferred.

See [CONTEXT.md](./CONTEXT.md) for the domain glossary (Note, Title, Body, Live Preview, Passcode, Lockout).

---

## 1. Locked decisions (recap)

| Area | Decision |
|---|---|
| Architecture | Client SPA + server API. **Server (SQLite) is the source of truth.** |
| Frontend | **React 19 SPA** via Vite. Client-rendered (no SSR). React Router v7 for routing. |
| Editor | The external **`md-live-editor`** package (`md-live-editor/react`) — CodeMirror 6 inline **Live Preview** + headless autosave. `NoteEditor` passes `initialContent` and `onSave`. |
| Backend | **Hono** API on **Node**, a **separate process** from the static-file serving. |
| Database | **SQLite** (`node:sqlite` — the native Node SQLite module) + **Drizzle ORM** for typed queries + migrations. |
| Language | **TypeScript** end-to-end, shared types between client/server. |
| Auth | 4-digit **Passcode**, hashed in DB. Session = **stateless plain signed token** (HMAC, not JWT) in an **httpOnly + Secure + SameSite cookie**. |
| Lockout | 5 consecutive failed attempts → **app-wide 1-hour lockout**, tracked in-memory (resets on server restart), logged via Telegram if configured. Resets on success / when the hour expires. |
| Logout | Clear the cookie (matching attributes). Emergency revoke-all = **rotate the signing secret**. |
| Markdown scope | headings, bold, **italics**, lists, code, links, tables, checkboxes. |
| Autosave | Debounced → `PATCH`. Status: `idle → saving… → saved`, plus **`couldn't save — retrying`** (keeps unsaved Body in memory, auto-retries). No manual save button. |
| Client storage | **None** for notes. No IndexedDB. Fetch-on-load + in-memory session state + optimistic updates. **Theme** is persisted in `localStorage`. |
| Multi-user | **Built in.** Schema supports roles (o = owner, m = member, g = guest, p = public) with `userId` FK on notes. Currently only single-user is actively used. |
| Multi-device | **Last-write-wins** on the server. No merge/CRDT. |
| Testing | **Vitest** (server domain + API + client logic) and **@testing-library/react** (components). Strict red-green-refactor. **No Playwright/e2e.** |

## 2. Out of scope (v1)

- **Images** in notes (no upload, no storage). The `![]()` syntax can be re-enabled later.
- **Offline support** / client-side persistence.
- **Deployment** (Lightsail, nginx, TLS, systemd, Litestream backups) — see §11.
- **Per-token revocation** (use secret rotation instead).
- **Image/attachment GC**, folders, tags, search (possible v2).

## 3. Domain model & data

**`notes`**
| column | type | notes |
|---|---|---|
| `id` | text (uuid) | primary key |
| `user_id` | text (uuid) | FK → `auth.id` |
| `title` | text | shown in the picker; derived from Body **or** explicitly set via rename |
| `body` | text | markdown source |
| `created_at` | integer (epoch ms) | also seeds the default title `New note YYYY-MM-DD HH:MM` |
| `updated_at` | integer (epoch ms) | sort key (desc) |

**Title rules.** On create: `title = "New note YYYY-MM-DD HH:MM"`. On Body edit (`PATCH` with `body`): re-derive `title = firstHeading(body) ?? firstNonEmptyLine(body) ?? <keep current>`. A **rename** (`PATCH` with `title` field) overwrites the title; after that, body edits will only update the title when the body content changes (derivation still runs, so the title can change again if the user adds a heading later).

**`auth`**
| column | type | notes |
|---|---|---|
| `id` | text (uuid) | primary key |
| `name` | text | display name; not unique (passcode is the identity) |
| `role` | text | `o` = owner, `m` = member, `g` = guest, `p` = public |
| `passcode_hash` | text \| null | argon2id hash of the 4-digit Passcode |

The **signing secret** lives in an env var / `.env` (not the DB, not the repo), so rotating it is a config change that invalidates all tokens.

*Note:* The `auth` table supports multiple users with roles, but the app currently targets a single-user workflow. The `userId` FK on `notes` is always populated.

## 4. Project structure (npm workspaces)

```
/
├── CONTEXT.md
├── PLAN.md
├── package.json            (workspaces: client, server, shared)
├── shared/                 Shared TS types: Note, API request/response contracts
├── server/                 Hono API (Node), Drizzle schema + migrations, set-user CLI
│   ├── src/
│   │   ├── app.ts          createApp() — Hono instance, error handler
│   │   ├── config.ts       loadConfig(): SESSION_SECRET, secureCookies, telegram
│   │   ├── index.ts        Entry: creates DB + app, listens on :3001
│   │   ├── db/             createDb(), schema, migrate(), backup()
│   │   ├── auth/           auth-repo, passcode hashing, token sign/verify
│   │   ├── notes/          notes-repo, title derivation
│   │   ├── routes/         V1 router (auth, notes, backup) + handlers
│   │   └── notify/         Telegram notifier for lockout alerts
│   └── test/
└── client/                 React SPA (Vite)
    ├── src/
    │   ├── index.tsx       Entry point (React 19 createRoot)
    │   ├── App.tsx         Root component (Suspense + Routing)
    │   ├── Routing.tsx     React Router v7: /login, /n/:id
    │   ├── api/            auth-api, notes-api
    │   ├── components/     LoginScreen, NotePlatform, NoteEditor,
    │   │                   NotePickerModal, ActionBar, icons/
    │   ├── hooks/          useAuth, useTheme
    │   └── styles/         global.css
    └── test/
```

## 5. Local dev

- `npm run dev` runs **two processes**: the Vite dev server (client, with HMR, port 5173) and the Hono API (Node, port 3001).
- Vite's **dev proxy** forwards `/api/*` → the Hono process (stands in for nginx locally).
- SQLite is a local file (`server/data/notes.db`); tests use `:memory:`.
- Plain HTTP on `localhost`. **Cookie `Secure` flag is env-conditional** (off in dev) so login works over `http://localhost`.
- `npm run set-user alice 1234` creates the first user (owner) with the given passcode. Additional users: `npm run set-user bob 5678 m`.

## 6. API surface (all `/api/v1/*`; notes routes require a valid session)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | No | Health check |
| `POST` | `/login` | No | Verify Passcode (respecting Lockout) → set session cookie |
| `POST` | `/logout` | No | Clear the session cookie |
| `GET` | `/session` | Yes | Session probe — returns 200 if valid, 401 otherwise |
| `GET` | `/me` | Yes | Current user info (id, name, role) |
| `PATCH` | `/me` | Yes | Update passcode and/or role (owner-only) |
| `POST` | `/set-user` | No | Register a new user (seed-only, no auth guard) |
| `GET` | `/notes` | Yes | List notes (`id, title, updated_at`), sorted `updated_at` desc |
| `GET` | `/notes/:id` | Yes | Read one note (full Body) |
| `POST` | `/notes` | Yes | Create an empty note |
| `PATCH` | `/notes/:id` | Yes | Update Body (re-derive title) **or** rename (set custom title), bump `updated_at` |
| `DELETE` | `/notes/:id` | Yes | Delete a note |
| `GET` | `/backup` | Yes (owner) | Full DB backup — writes to timestamped file |

Session middleware verifies the signed cookie on protected routes; invalid/missing → `401`. The client treats `401` as "session ended" → redirect to Login.

## 7. Auth design (detail)

- **Passcode at rest:** argon2id hash in `auth.passcode_hash`. Seeded via `npm run set-user` CLI.
- **Login:** Verify Passcode via `findUserByPasscode`. On success: issue a signed token, `Set-Cookie` (httpOnly, SameSite=Lax, Secure-in-prod, **7-day fixed expiry** — re-login after 7 days, no sliding renewal). On failure: increment in-memory counter; at 5 → set `lockedUntil = now + 1h`, **send Telegram alert** if configured, **log the lockout**.
- **Token:** small HMAC-SHA256-signed value (`body.signature`), payload = `{ iat, exp, userId }`. Verified by signature + expiry only — **no per-request DB lookup**.
- **Logout:** `Set-Cookie` with `Max-Age=0` and identical attributes.
- **Lockout:** In-memory (global counter + timestamp), not persisted in DB. Resets on server restart. Resets on successful login or when the hour expires.

**Routing (React Router v7):** `/login`, `/n/:id` (app shell). Selected note reflected in the URL for deep-linking/refresh.

**Components:** `LoginScreen` (full-screen 4 inputs), `NotePlatform` (main app shell: action bar + editor + modal picker), `NoteEditor` (wraps `md-live-editor/react`), `NotePickerModal` (cmdk-based search/selection modal), `ActionBar` (toolbar: new note, open picker, theme toggle, logout).

**New note:** creates an empty note titled **`New note YYYY-MM-DD HH:MM`** and navigates to it.

**Rename:** `PATCH /notes/:id` with `{ title: "..." }` field. Title re-derivation still runs on subsequent body edits.

**Two-step delete (in picker modal):** first click on the delete button **arms** it — it changes to "Confirm?"; a second click deletes; clicking elsewhere in the modal cancels (disarms). A pure state machine (`idle → armed → deleted | idle`), so it's unit-testable.

**API client:** typed fetch using `shared/` types. Centralized `401` handling redirects to login.

**Auth guard:** on load, attempt `GET /api/v1/session`; `401` → redirect to Login.

## 8. Editor / Live Preview

- The editor is the external **`md-live-editor`** package, consumed via `md-live-editor/react`. `NoteEditor` is a thin wrapper that passes the Note's Body as `initialContent` and persists edits through `onSave` (→ `PATCH /notes/:id`).
- The package owns the CodeMirror 6 Live Preview surface and the debounced autosave, and is **headless** about status (emits `onSaveStatus`). See the package's own `CONTEXT.md` / `docs/adr/` for its design.
- **We do not test CM6 itself.** `NoteEditor`'s wiring is thin and verified manually; the package carries its own unit tests.

## 9. Testing strategy (TDD)

- **Server + domain (strict TDD):** pure functions (title-from-first-heading, lockout logic, token sign/verify, passcode verify) + API integration via Hono `app.request()` against in-memory SQLite. Covers login/fail/lockout, cookie set/clear, notes CRUD, `401` middleware. ~18 test files.
- **Client logic (TDD):** LoginScreen, NotePickerModal, ActionBar, NotePlatform, auth-api, notes-api with `@testing-library/react` + jsdom. Autosave status state machine tested. ~8 test files.
- **Editor:** not unit-tested (CM6 is the library's responsibility; jsdom can't render it). Wiring kept thin; verified manually.
- **Accepted gap:** no automated full-flow browser coverage in v1.

## 10. Implementation plan — vertical slices (tracer bullets, TDD)

Each slice is red-green-refactor and ends in something runnable.

- **Slice 0 — Walking skeleton.** Workspaces; Vite+React app; Hono server; `shared` types; Vite proxy; `GET /api/v1/health`; Vitest on both sides; one passing test each. *Done = `npm run dev` serves the app and the health check.*
- **Slice 1 — Auth (server).** `auth` table + migration (multi-user with roles); argon2 hashing; `set-user` CLI; token sign/verify (pure); `POST /login` (success/fail/lockout); session middleware (`401`); `POST /logout`; Telegram notifier.
- **Slice 2 — Login UI.** `LoginScreen` (4 inputs, submit, error + lockout messages); wire to `/login`; auth guard (`GET /session`) + redirect.
- **Slice 3 — Notes CRUD (server).** `notes` table (incl. `userId` FK) + migration; repository; auth-guarded CRUD endpoints; title-derivation pure function; `PATCH` supports both body update (re-derive title) and rename.
- **Slice 4 — Notes UI.** `NotePlatform` (action bar + editor), fetch-on-load, in-memory store, empty states.
- **Slice 5 — Editor + autosave.** Consumed via `md-live-editor/react` (`NoteEditor` passes `initialContent` / `onSave`).
- **Slice 6 — Polish.** Default title `New note YYYY-MM-DD HH:MM`, rename via PATCH, sorting, picker modal (cmdk, Shift+Shift trigger), two-step delete, theme toggle (localStorage), full local run-through.

## 11. Deferred — deployment (later)

When you choose to deploy: single Lightsail instance · nginx serves the built SPA + proxies `/api` to the Node process (systemd service) · Let's Encrypt/certbot TLS · Litestream → S3 backups · `.env` for signing secret + Passcode seed. No Docker unless reproducibility is wanted.

---

## Resolved product decisions

1. **Title** auto-derives from Body (first heading or first non-empty line), but the user can **rename** via `PATCH` to set an explicit title. Body edits continue to re-derive the title on subsequent saves.
2. **New note** is titled **`New note YYYY-MM-DD HH:MM`** (not "Untitled") and focuses the editor.
3. **Delete** uses a **two-step inline CTA** inside the cmdk-based picker modal (arm → confirm), cancel by clicking elsewhere. **No native dialog elements** (no `alert`/`confirm`/`prompt`).
4. **Note picker** opens as a full-screen modal triggered by **double-Shift** or the apps button, with cmdk-powered search.
5. **Selected note in the URL** (`/n/:id`) for deep-linking/refresh.
6. **Session:** 7 days, fixed (re-login after 7 days; no sliding renewal).
7. **Theme:** light/dark toggle persisted in `localStorage`. Default is light.
8. **Auth guard:** `GET /api/v1/session` on app load; `401` → redirect to Login.
