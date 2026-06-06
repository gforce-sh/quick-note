# Notes — Implementation Plan (v1)

A single-user, markdown note-taking web app with an Obsidian-style inline Live Preview editor. Goal: load fast, respond fast, stay simple. Built test-first. **v1 target: running locally.** Deployment is deferred.

See [CONTEXT.md](./CONTEXT.md) for the domain glossary (Note, Title, Body, Live Preview, Passcode, Lockout).

---

## 1. Locked decisions (recap)

| Area | Decision |
|---|---|
| Architecture | Client SPA + server API. **Server (SQLite) is the source of truth.** |
| Frontend | **SolidJS SPA** via Vite. Client-rendered (no SSR). |
| Editor | **CodeMirror 6**, inline **Live Preview** (rendered doc; active line reveals raw markdown). |
| Backend | **Hono** API on **Node**, a **separate process** from the static-file serving. |
| Database | **SQLite** (`better-sqlite3`) + **Drizzle ORM** for typed queries + migrations. |
| Language | **TypeScript** end-to-end, shared types between client/server. |
| Auth | 4-digit **Passcode**, hashed in DB. Session = **stateless plain signed token** (HMAC, not JWT) in an **httpOnly + Secure + SameSite cookie**. |
| Lockout | 5 consecutive failed attempts → **app-wide 1-hour lockout**, persisted in DB, logged. Resets on success / when the hour expires. |
| Logout | Clear the cookie (matching attributes). Emergency revoke-all = **rotate the signing secret**. |
| Markdown scope | headings, bold, **italics**, lists, code, links, tables, checkboxes. |
| Autosave | Debounced **2s** → `PATCH`. Status: `idle → saving… → saved`, plus **`couldn't save — retrying`** (keeps unsaved Body in memory, auto-retries). No manual save button. |
| Client storage | **None.** No IndexedDB. Fetch-on-load + in-memory session state + optimistic updates. |
| Multi-device | **Last-write-wins** on the server. No merge/CRDT. |
| Testing | **Vitest** (server domain + API + client logic) and **@solidjs/testing-library** (components). Strict red-green-refactor. **No Playwright/e2e.** |

## 2. Out of scope (v1)

- **Images** in notes (no upload, no storage). The `![]()` syntax can be re-enabled later.
- **Offline support** / client-side persistence.
- **Deployment** (Lightsail, nginx, TLS, systemd, Litestream backups) — see §11.
- **Multi-user** (schema leaves the door open; none of the machinery is built).
- **Per-token revocation** (use secret rotation instead).
- **Image/attachment GC**, folders, tags, search (possible v2).

## 3. Domain model & data

**`notes`**
| column | type | notes |
|---|---|---|
| `id` | text (uuid) | primary key |
| `title` | text | shown in the sidebar; derived from Body **unless** custom |
| `title_is_custom` | integer (0/1) | when set, Body edits never overwrite the Title |
| `body` | text | markdown source |
| `created_at` | integer (epoch ms) | also seeds the default title `New note <created_at>` |
| `updated_at` | integer (epoch ms) | sort key (desc) |

**Title rules.** On create: `title = "New note <created_at>"`, `title_is_custom = 0`. On Body edit (`PATCH`): if **not** custom, re-derive `title = firstHeading(body) ?? firstNonEmptyLine(body) ?? <keep current>`. A **rename** sets a custom title and `title_is_custom = 1`, after which Body edits leave it alone.

**`auth`** (single row)
| column | type | notes |
|---|---|---|
| `id` | integer | always `1` |
| `passcode_hash` | text | argon2id hash of the 4-digit Passcode |
| `failed_attempts` | integer | consecutive failures |
| `locked_until` | integer (epoch ms) \| null | set when locked |

The **signing secret** lives in an env var / `.env` (not the DB, not the repo), so rotating it is a config change that invalidates all tokens.

*Multi-user later:* add a `users` table and a nullable `owner_id` on `notes`. Not built now.

## 4. Project structure (npm workspaces)

```
/
├── CONTEXT.md
├── PLAN.md
├── package.json            (workspaces: client, server, shared)
├── shared/                 Shared TS types: Note, API request/response contracts
├── server/                 Hono API (Node), Drizzle schema + migrations, set-passcode CLI
│   ├── src/
│   └── test/
└── client/                 Solid SPA (Vite)
    ├── src/
    └── test/
```

## 5. Local dev

- `npm run dev` runs **two processes**: the Vite dev server (client, with HMR) and the Hono API (Node).
- Vite's **dev proxy** forwards `/api/*` → the Hono process (stands in for nginx locally).
- SQLite is a local file (e.g. `server/data/dev.db`); tests use `:memory:`.
- Plain HTTP on `localhost`. **Cookie `Secure` flag is env-conditional** (off in dev) so login works over `http://localhost`.
- `npm run set-passcode 1234` writes the Passcode hash into the dev DB.

## 6. API surface (all `/api/*`; notes routes require a valid session)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/login` | Verify Passcode (respecting Lockout) → set session cookie |
| `POST` | `/logout` | Clear the session cookie |
| `GET` | `/notes` | List notes (`id, title, updated_at`), sorted `updated_at` desc |
| `GET` | `/notes/:id` | Read one note (full Body) |
| `POST` | `/notes` | Create an empty note |
| `PATCH` | `/notes/:id` | Update Body, re-derive Title, bump `updated_at` |
| `DELETE` | `/notes/:id` | Delete a note |

Session middleware verifies the signed cookie on protected routes; invalid/missing → `401`. The client treats `401` as "session ended" → redirect to Login.

## 7. Auth design (detail)

- **Passcode at rest:** argon2id hash in `auth.passcode_hash`. Seeded via the `set-passcode` CLI.
- **Login:** if `locked_until > now` → reject (locked). Else verify Passcode. On success: reset `failed_attempts`/`locked_until`, issue a signed token, `Set-Cookie` (httpOnly, SameSite=Lax, Secure-in-prod, **7-day expiry, sliding**). On failure: increment `failed_attempts`; at 5 → set `locked_until = now + 1h`, **log the lockout**.
- **Token:** small HMAC-SHA256-signed value (`payload.signature`), payload = issue/expiry timestamps. Verified by signature + expiry only — **no per-request DB lookup**.
- **Logout:** `Set-Cookie` with `Max-Age=0` and identical attributes.

**UX principle: no modal dialogs anywhere.** Destructive/confirm actions use inline, two-step affordances instead.

- **Routing (Solid Router):** `/login`, `/` (app shell). Selected note reflected in the URL (`/n/:id`) for deep-linking/refresh.
- **State:** in-memory Solid store — notes list, selected note id, current Body, save status. Optimistic updates.
- **Components:** `LoginScreen` (full-screen 4 inputs), `AppShell` (sidebar + editor pane), `Sidebar` (list, **new note**, **two-step delete**), `NoteTitle` (renameable), `Editor` (CM6 wrapper), `SaveStatus`.
- **New note:** creates an empty note titled **`New note <timestamp>`** and focuses the editor.
- **Rename:** clicking the `NoteTitle` makes it editable; saving sets a **custom** title (`title_is_custom = 1`) so Body edits stop overwriting it.
- **Two-step delete (no dialog):** first click on the delete CTA **arms** it — it changes colour and wording (e.g. "Delete" → "Confirm?"); a second click deletes; **clicking anywhere else cancels** (disarms). A pure state machine (`idle → armed → deleted | idle`), so it's unit-testable.
- **API client:** typed fetch using `shared/` types; centralizes the `401 → /login` handling.
- **Auth guard:** on load, attempt `GET /notes`; `401` → Login.

## 9. Editor / Live Preview

- A **thin Solid wrapper** mounts a CM6 `EditorView`. Solid owns the shell; CM6 owns the editing surface.
- Live Preview via `@codemirror/lang-markdown` + custom decorations (a `ViewPlugin` that renders non-active blocks and reveals raw syntax on the active line). **This is the highest-risk slice** — we spike it first to de-risk.
- **We do not test CM6 itself** (trust the library). All testable logic (debounce, title derivation, save state machine) is extracted out of the editor into pure units.

## 10. Testing strategy (TDD)

- **Server + domain (strict TDD):** pure functions (title-from-first-heading, lockout logic, token sign/verify, passcode verify) + API integration via Hono `app.request()` against in-memory SQLite. Covers login/fail/lockout, cookie set/clear, notes CRUD, `401` middleware.
- **Client logic (TDD):** Login, Sidebar, and the autosave **status state machine** with `@solidjs/testing-library` + jsdom. Debounce + API client as plain units.
- **Editor:** not unit-tested (CM6 is the library's responsibility; jsdom can't render it). Wiring kept thin; verified manually.
- **Accepted gap:** no automated full-flow browser coverage in v1.

## 11. Implementation plan — vertical slices (tracer bullets, TDD)

Each slice is red-green-refactor and ends in something runnable.

- **Slice 0 — Walking skeleton.** Workspaces; Vite+Solid app; Hono server; `shared` types; Vite proxy; `GET /api/health`; Vitest on both sides; one passing test each. *Done = `npm run dev` serves the app and the health check.*
- **Slice 1 — Auth (server).** `auth` table + migration; argon2 hashing; `set-passcode` CLI; token sign/verify (pure); `POST /login` (success/fail/lockout); session middleware (`401`); `POST /logout`.
- **Slice 2 — Login UI.** `LoginScreen` (4 inputs, submit, error + lockout messages); wire to `/login`; auth guard + redirect.
- **Slice 3 — Notes CRUD (server).** `notes` table (incl. `title_is_custom`) + migration; repository; auth-guarded CRUD endpoints; title-derivation pure function; `PATCH` respects the custom-title flag; rename path.
- **Slice 4 — Notes UI.** Sidebar (list/select/new-note/**two-step delete**); fetch-on-load; in-memory store; empty states.
- **Slice 5 — Editor + autosave.** CM6 wrapper + Live Preview decorations (spike first); Body signal; debounce util; autosave `PATCH` + status state machine incl. `couldn't save — retrying`.
- **Slice 6 — Polish.** Default title `New note <timestamp>`, rename affordance, sorting, 7-day sliding session, full local run-through.

## 12. Deferred — deployment (later)

When you choose to deploy: single Lightsail instance · nginx serves the built SPA + proxies `/api` to the Node process (systemd service) · Let's Encrypt/certbot TLS · Litestream → S3 backups · `.env` for signing secret + Passcode seed. No Docker unless reproducibility is wanted.

---

## Resolved product decisions

1. **Title** auto-derives from Body, but the user can **rename** to a custom title that then sticks (`title_is_custom`).
2. **New note** is titled **`New note <timestamp>`** (not "Untitled") and focuses the editor.
3. **Delete** uses a **two-step inline CTA** (arm → confirm), cancel by clicking elsewhere. **No dialogs anywhere in the app.**
4. **Selected note in the URL** (`/n/:id`) for deep-linking/refresh.
5. **Session:** 7 days, sliding.
