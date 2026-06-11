# Notes

A single-user web application for writing and organising markdown notes, with a live-rendering editing experience. Notes are stored on a server so they can be reached from any device behind a simple passcode.

## Language

**Note**:
A single markdown document authored by the user. The unit of content in the app. Has a title, a body, and timestamps. Notes are kept in a flat collection (no folders or tags in v1).
_Avoid_: Document, File, Page, Entry

**Title**:
The human-readable name of a Note. Defaults to the Note's first heading; can be overridden explicitly.
_Avoid_: Name, Heading (when referring to the Note's label)

**Body**:
The markdown source text of a Note — what the user types and edits.
_Avoid_: Content, Text, Markdown (when referring to the editable source)

**Live Preview**:
The editing experience — rendered markdown in a single pane, except on the cursor's line/block, which reveals its raw source. Delivered by the external **`md-live-editor`** package, which owns the canonical definition; the app feeds a Note's Body to the editor as its "Content".
_Avoid_: Split preview, Side-by-side, WYSIWYG, Render pane

**Passcode**:
The 4-digit numeric secret the single user enters to gain access. The only authentication factor. Entered on a dedicated full-screen Login.
_Avoid_: PIN, Password, Code, OTP

**Lockout**:
A temporary, app-wide disabling of Login, triggered after 5 consecutive failed Passcode attempts. Lasts one hour, then Login is allowed again. Each Lockout is recorded in the server logs. Not tied to IP address.
_Avoid_: Ban, IP block, Throttle
