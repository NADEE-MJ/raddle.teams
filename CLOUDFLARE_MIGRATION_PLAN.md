# Raddle Teams → Cloudflare Workers + Durable Objects + D1

**Status: not started.** This is a scoping document, written after migrating
Potluck to Cloudflare (see `potluck/cloudflare/README.md` for that precedent
— same free-tier constraints, same "no payment method" hard requirement).
Nothing here has been built yet.

## tl;dr

Possible, and free-tier-compatible, confirmed against current Cloudflare
pricing docs (see Sources). Realistic effort: **3-5x Potluck** — Potluck was
stateless CRUD ported almost mechanically; this app's whole value is
real-time multiplayer state, which means the WebSocket/connection-manager
layer has to be redesigned around Durable Objects, not translated line by
line. Recommend only if raddle.teams needs to come off the Mac Mini
specifically (the "used by other people" criterion from the network lockdown
plan), not as a quick win.

## Feasibility: confirmed free-tier

Cloudflare Workers Free plan, current limits (verified via
[developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/)):

- **Durable Objects are available on the Free plan** — SQLite-backed storage
  class only (not the older KV-backed class, which needs Workers Paid). That's
  not a real constraint here: this app doesn't need anything KV-backed offers
  that SQLite storage doesn't.
- **WebSockets are supported** on Free, billed as part of the same
  100,000 requests/day bucket as everything else (HTTP + RPC + WS messages +
  alarms).
- **13,000 GB-s/day** of Durable Object duration on Free.
- The **Hibernatable WebSockets API** lets a DO hold an open connection
  without accruing duration charges while idle — this is the load-bearing
  feature that makes "several lobbies with players just sitting there
  connected" free-tier-viable. Without hibernation, an always-on DO per
  active lobby could plausibly burn through the daily duration budget on a
  busy game night; with it, an idle connection costs ~nothing.
- **Alarms** (`state.storage.setAlarm()`) are the DO equivalent of this app's
  `asyncio.create_task` round-timer (`backend/api/admin/lobby/timer_task.py`)
  — actually a better fit than the current implementation, since an alarm
  survives the DO being evicted/restarted, where the current in-memory
  `asyncio.Task` reference (`_active_timer_tasks` dict) would just vanish if
  the FastAPI process ever restarted mid-round.

No feature this app uses requires the Workers Paid plan.

## Architecture mapping

| Current (FastAPI) | Cloudflare equivalent |
|---|---|
| `backend/main.py`, `backend/api/*.py` (REST) | Worker `fetch()` handler, same flat-router pattern as Potluck's `src/index.js` |
| `backend/websocket/api.py` (WS endpoint) | Worker forwards the WebSocket upgrade request to the right Durable Object (`env.LOBBY.get(id).fetch(request)`) |
| `backend/websocket/managers.py` (`LobbyWebSocketManager`, in-process dict of live sockets) | **One Durable Object instance per lobby.** Each DO holds its own connected players' WebSockets directly (`ctx.acceptWebSocket()`), no cross-process dict needed — this is strictly simpler than the current manager, since a DO *is* the single source of truth for its lobby by construction |
| `admin_web_socket_manager` (cross-lobby admin subscriptions) | A separate, singleton-ish DO (or just the Worker itself relaying via D1 polling / a lightweight pub-sub DO) subscribed to per-lobby DOs — needs its own design pass, see Open Questions |
| `backend/api/admin/lobby/timer_task.py` (asyncio background task) | DO Alarm (`state.storage.setAlarm(Date.now() + duration)`), handled in the DO's `alarm()` method |
| `backend/game/state_machine.py` (`TeamStateMachine`, in-memory per-request) | Same logic, ported to JS, but now naturally lives *inside* the lobby's DO alongside its connections — no separate reconstruction from DB rows on every request |
| `backend/database/models.py` (SQLModel: Lobby, Player, Team, Game, Guess, RoundResult) | Split two ways (see Data Model below): durable cross-lobby history → D1; live in-round state → the DO's own embedded SQLite storage |
| 434 puzzle JSON files on disk (`puzzles_from_raddle/`) | Bulk-loaded into D1 once (small, static, read-heavy — same pattern as Potluck's one-time SQLite→D1 migration script) |
| Admin token auth | Same HMAC-signed-cookie approach as Potluck's `src/auth.js` — no session store needed |
| Player session + reconnection | Opaque session token in a cookie, same as Potluck's attendee session — the DO looks up "is this session_id already a player in this lobby" on reconnect |

## Data model split: D1 vs. Durable Object storage

This is the one genuinely new design decision Potluck didn't have (it was
100% D1, no per-entity ephemeral state):

- **D1** (shared, queryable, cross-lobby): `lobby` (code, name, created_at),
  `round_result` (historical scores — this is what a leaderboard/stats page
  would query across lobbies), `puzzle` (the 434 puzzles, read-only).
- **Durable Object storage** (one instance per active lobby, its own private
  SQLite): `player`, `team`, `game` (current puzzle assignment + revealed
  steps + timer), `guess` (this lobby's guess log). This data is scoped to
  exactly one lobby's lifetime anyway — a DO's own storage is a *more*
  natural fit than a shared D1 table filtered by `lobby_id` on every query,
  and it's what makes hibernation/alarms colocate with the data they act on.
- When a round/lobby finishes, the DO writes a summary row to D1
  (`round_result`) — the one place data crosses from DO storage into shared
  D1, mirroring how `RoundResult` already works today (persists across
  rounds while `Game`/`Guess` are more transient).

## What ports mechanically vs. needs a real rewrite

**Ports with modest changes** (same shape, different runtime):
- `state_machine.py` (`TeamStateMachine`) — pure logic, no I/O, straightforward JS port. Same for `puzzles.py`'s puzzle-loading/validation logic.
- REST endpoints in `backend/api/lobby.py`, `admin/lobby/*.py` — CRUD-shaped, same pattern as Potluck's admin routes.
- Admin/player auth — directly reuses the Potluck pattern.

**Needs real redesign, not translation:**
- `websocket/managers.py` — the whole connect/disconnect/broadcast/
  broadcast_to_team/kick_player surface has to be re-expressed as DO methods
  operating on `ctx.getWebSockets()` instead of a manually-maintained dict.
  Team-based broadcast (`broadcast_to_team`) needs `player_teams` tracked in
  DO storage instead of an in-memory dict, since a hibernating DO's
  in-memory state doesn't survive between wake-ups — only durable storage
  does.
- The **admin cross-lobby WebSocket** (subscribe to N lobbies, get broadcasts
  from all of them) doesn't have a clean 1:1 DO mapping, since a DO is
  naturally scoped to *one* lobby. Options: the admin's browser opens one WS
  per subscribed lobby directly to that lobby's DO (simplest, changes the
  frontend's connection model a bit); or a dedicated "admin hub" DO that each
  lobby DO pings on state changes (more faithful to current architecture,
  more moving parts). Needs a decision before implementation starts.
- Timer task → DO alarm: conceptually simpler than today's code (no need for
  the `_active_timer_tasks` dict / cancellation bookkeeping — `setAlarm`
  natively overwrites), but it's new code, not a port.
- `PlayedPuzzleSession`-style admin session state — needs to decide whether
  this lives in D1 (if genuinely cross-lobby) or per-admin cookie state.

**Frontend (`frontend/`, React + Vite + TS):** the WebSocket client itself
barely changes (still a `WebSocket` object receiving JSON messages) — the
bigger change is the connection URL needs to resolve to the right DO
(probably via the lobby code, same as today's room-code routing), and if the
admin-hub question above lands on "one WS per lobby," the admin UI's
connection management needs a small rework.

## Testing strategy

This is the part I'd actually worry about most. Potluck's hardest test was
two isolated Playwright browser contexts racing a single unclaim request.
Raddle needs:
- Multiple concurrent WebSocket clients per lobby (a full team submitting
  guesses at once) — races on `revealed_steps` need the same "single atomic
  operation, check the result" discipline used for Potluck's claim/unclaim,
  now inside DO storage transactions instead of D1's `meta.changes`.
- Hibernation-specific bugs: a client that's been idle long enough to
  hibernate, then sends a message — does state resume correctly? This class
  of bug doesn't exist in the current FastAPI version at all (nothing ever
  "hibernates" in a long-running Python process), so it needs new test
  coverage, not just ported test coverage.
- Timer/alarm correctness: does an alarm reliably fire once, not zero or
  twice, across a DO eviction-and-restart mid-timer?
- Recommend building this harness *before* porting real game logic, unlike
  the Potluck migration where testing came after — the risk profile here is
  higher (silent broadcast bugs are much harder to notice than an HTTP 500).

## Suggested phased approach, if this gets greenlit

1. Local `wrangler dev` skeleton: one lobby DO, WebSocket connect/broadcast
   only (no game logic), Playwright test with 2+ concurrent clients — prove
   the connection model works before porting anything else.
2. Port `state_machine.py` + basic REST lobby CRUD, wire into the DO.
3. Port teams/guesses/scoring, with the same claim-style race-safety
   discipline as Potluck.
4. Timer/alarm.
5. Puzzle data migration (434 JSON files → D1, one-time script like
   Potluck's `migrate/export_sqlite.py`).
6. Solve the admin cross-lobby subscription design (see Open Questions) —
   probably worth deciding this in step 1, not deferring it.
7. Full local Playwright suite, multi-client, before any real deploy.
8. `workers.dev` deploy, manual test with real concurrent players.
9. DNS cutover, same pattern as Potluck (`raddle.nadee-mj.dev` → Worker
   custom domain), only after confidence is high — this app has real users
   mid-game in a way Potluck's claim list never was.

## Open questions before starting

- Admin cross-lobby subscription model (see above) — the one piece without
  an obvious answer.
- Does `PlayedPuzzleSession` need to survive across devices/browser
  restarts, or is per-session-cookie state enough?
- Any expectation of >1 concurrent round per lobby, ever, or is "one DO
  instance = one lobby, one round at a time" a safe permanent assumption?

## Sources

- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Durable Objects Pricing Calculator](https://flarecalc.com/calculators/durable-objects/)
