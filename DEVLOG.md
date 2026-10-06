# DEVLOG

## 2026-10-04: Block 2, backend hardening

**What happened**
- Found that `createActivity` used `id = activities.length + 1`. Deleting activity 2 and creating a new one produced a second activity with id 3.
- `GET/PATCH/DELETE /activities/:id` returned 200 with an empty body for ids that don't exist.
- The API accepted any request body, including unknown fields and a client-supplied `id`.

**What I chose**
- Ids come from a counter (`nextId`) that only goes up, so deleted ids are never reused. Test: delete, create, assert all ids are unique.
- The service throws `NotFoundException` for unknown ids; Nest maps it to a 404.
- DTOs with class-validator plus a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), and `ParseIntPipe` on `:id`. Bad input returns 400.

**Why**
- "Highest id + 1" also avoids duplicates but reuses deleted ids, which would confuse other clients during live sync. A counter matches how Postgres sequences work.
- Throwing in the service keeps the controller thin and gives web and iOS the same 404.
- Rejecting undeclared fields closes mass assignment (e.g. `{ id: 99 }` or `{ isAdmin: true }`).
- The uniqueness test checks behavior, not the id scheme, so it should still pass after the move to Postgres.

**Open**
- `notes` is required for now; make it `@IsOptional()` if the iOS app needs empty notes.
- `test/app.e2e-spec.ts` has a type error (`supertest/types` not found), present before this block.

## 2026-10-06: Block 6, live sync

**What happened**
- Two people editing the same trip couldn't see each other's changes without reloading.
- Added Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io` on the backend, `socket.io-client` on the web app).

**What I chose**
- Writes still go through REST. The socket only announces them, using the events in `docs/api.md`: `trip.updated`, `trip.deleted`, `activity.created`, `activity.updated`, `activity.deleted`.
- One room per trip. A client emits `trip.join` with `{ tripId }` and the gateway puts it in `trip:<id>`. Events go only to that room, including the client that made the change.
- Observer pattern. `TripsService` and `ActivitiesService` call `announce()` after each successful write, and `RealtimeGateway` subscribes with `onChange()` and forwards to the room. Creating a trip sends nothing because nobody can be in its room yet.
- The web app refetches instead of patching state. `LiveSync` (a client component on the trip page) calls `router.refresh()` on any event, and goes home on `trip.deleted`.
- The gateway has its own CORS setting, because `enableCors` in `main.ts` only covers REST.

**Why**
- REST for writes keeps validation, 404s and versions in one place for both web and iOS. The socket stays a thin notification channel.
- Rooms mean a change reaches only the people looking at that trip, not every connected user.
- With the observer, the services don't know sockets exist. The dependency points one way (gateway → services), and the existing unit tests didn't change: 31 still pass.
- Refetching is simple and can't drift out of sync, at the cost of one extra request per change. A later optimization: apply the event payload directly and use `version` to drop stale events.

**Open**
- No membership check on `trip.join`: anyone can join any trip's room until there's auth.
- Single server only. Rooms live in memory, so running several backend instances would need the Socket.IO Redis adapter.
- Events sent while a client is disconnected are missed. Handled: on every `connect` (including reconnects), the web app rejoins the trip's room and refetches. Found this when the backend restarted under open tabs: they reconnected but were no longer in the room, so they heard nothing.
