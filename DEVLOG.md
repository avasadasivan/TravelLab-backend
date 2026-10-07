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

## 2026-10-06: Postgres

**What happened**
- Trips and activities lived in arrays in memory, so every backend restart (including every save in watch mode) wiped them.

**What I chose**
- Postgres 17 in Docker (`docker-compose.yml`), with Prisma 7 as the ORM and the `pg` driver adapter.
- Schema: `trips` and `activities`, with `activities.trip_id` a foreign key `ON DELETE CASCADE`. The cascade replaced the in-memory `onTripDeleted` listener.
- An index on `(trip_id, start_time)`, which is exactly the trip page's query: one trip's activities in time order.
- `start_time` is `timestamp without time zone` holding the local wall-clock time, next to an IANA `time_zone` column (e.g. `Europe/Paris`).
- `version` lives in the database and is bumped on every update, ready for the 409 stale-edit check.
- Tests run against a separate `travellab_test` database. It gets migrated once, then wiped and reseeded before every test (`TRUNCATE ... RESTART IDENTITY`). CI starts its own Postgres container.

**Why**
- Prisma: type-safe queries generated from the schema, and versioned SQL migrations checked into git, so every machine and CI builds the same tables. TypeORM was the alternative. Prisma's schema file is easier to read, and its migrations are plain SQL.
- Cascade in the database: the rule holds no matter which code path deletes a trip, and it can't be forgotten.
- Local time instead of UTC: a 10:00 Louvre visit is 10:00 in Paris for everyone. If I stored UTC, a viewer in another zone, or a daylight-saving change, could shift it. The zone column keeps the information needed to convert to an absolute time if that's ever needed (e.g. reminders).
- Docker Compose: one command gives anyone (my iOS teammate, CI) an identical database, with nothing to install by hand.
- Separate test database: tests can wipe it freely without touching dev data. A guard refuses to wipe any database whose name doesn't end in `_test`.

**Open**
- Concurrent edits still last-write-wins. Next: reject a PATCH whose `version` is stale with a 409 (`UPDATE ... WHERE id = ? AND version = ?`).
- Test files run one at a time because they share a database. That's fine at this size.

## 2026-10-06: Finishing touches

- **Activities grouped by day (web).** The trip page shows a heading per date ("Tue, Nov 3"). The API already sorts by `startTime`, so grouping is a single pass over the list, keyed by the date part of the local time string. No date library and no time-zone math, because the times are already local.
- **Share link (web).** A "Copy link" button copies the trip URL. With no accounts yet, the URL is the access control: anyone with it can view and edit, and the page says so. If the browser blocks the clipboard (it needs https or localhost), the page shows the URL to copy by hand.
- **Dockerfile (API).** Multi-stage build: the first stage installs everything, generates the Prisma client, compiles, then prunes dev dependencies. The runtime stage copies only `dist`, the pruned `node_modules` and the Prisma files, and runs as the non-root `node` user. It starts the same way as Render: `prisma migrate deploy`, then the server. `npm run docker:up` runs Postgres plus the API; `npm run db:up` still starts only Postgres.
  - Bug found while testing: npm skipped Prisma's install script, so the migration engine was missing, and at startup the non-root user couldn't download it. Fixed by fetching the engine during the build (`npx prisma version`) and installing OpenSSL so Prisma picks the right engine. `prisma` moved to dependencies, because migrations run in production.
- **Open:** the image is ~880 MB. Smaller options are an Alpine base, or Prisma's compiled engines only.

## 2026-10-06: Deploy

**What happened**
- Put TravelLab online: the database on Neon, the backend on Render, and the web app on Vercel. Live at travellab-app.vercel.app.

**What I chose**
- Neon for managed Postgres 17. It gives two connection strings: **pooled** for the app (many short queries share a few connections), and **direct** for migrations (`prisma migrate deploy` needs one steady session). `prisma.config.ts` uses `DIRECT_DATABASE_URL` when it's set.
- Render for the NestJS backend, because it supports long-lived WebSocket connections. The start command runs migrations, then the server (`npm run start:prod`), so the schema is always up to date before traffic arrives.
- Vercel for the Next.js app. Pages render at request time (`dynamic = 'force-dynamic'`), so the build never needs the backend.
- All settings come from environment variables: `DATABASE_URL`, `DIRECT_DATABASE_URL` and `FRONTEND_ORIGIN` on Render, and `NEXT_PUBLIC_API_BASE` on Vercel. No secrets in git.
- CORS through one allow-list (`FRONTEND_ORIGIN`, comma-separated), shared by REST and Socket.IO.

**Bugs and what they taught me**
- **"Failed to fetch" on the live site.** Pages loaded, but adding an activity failed. The page's data is fetched by Vercel's *server*, where CORS doesn't apply, but the form's request comes from the *browser*, which enforces it, and the backend's allowed origin didn't exactly match the site's address. Fix: set `FRONTEND_ORIGIN` to the exact origin, and later to a list when I added a second domain. Lesson: know which requests come from the browser and which from the server.
- **Seeding failed: "table trips does not exist".** I seeded before the deploy that runs migrations was merged. Lesson: schema first, then data.
- **Cold starts.** The free Render plan sleeps after 15 idle minutes, so the first request can take about 50 seconds. I added a loading screen that says so, and a friendly error page with "Try again".

**Open**
- Render still builds with Node directly. Switching it to the existing Dockerfile would make the deploy match local Docker exactly.
- Cold starts go away on a paid plan. Fine for a portfolio for now.

## 2026-10-07: Fixed the end-to-end test suite

**What happened**
- `npm run test:e2e` was still the NestJS starter test. It expected "Hello World!" (the app says "Welcome to TravelLab!"), had a type error in its `supertest/types` import (open since Block 2), ran against whatever `DATABASE_URL` was set (the dev database), and CI never ran it, so nobody noticed it failing.

**What I chose**
- Fixed the import (`supertest/types.js`: with `nodenext` resolution and no `exports` map, subpath imports need the file extension) and the expected text.
- Gave the e2e suite the same setup as the main tests: the `travellab_test` database, migrated once, then wiped and reseeded before every test.
- Made it a real end-to-end check: it boots the whole app with the same validation pipe as `main.ts`, lists the seeded trip, creates an activity and checks the sort order, and checks that deleting a trip deletes its activities.
- CI now runs `npm run test:e2e` after `npm test`.

**Lesson**
- A test suite CI doesn't run rots silently. If it's worth having, it's worth running on every pull request.

## 2026-10-07: Optimistic concurrency (no more lost updates)

**What happened**
- Two people could edit the same activity at the same time and the last save silently won. The other person's change was gone with no warning (a "lost update"). The `version` column existed, but nothing checked it.

**What I chose**
- **Optimistic concurrency with row versioning.** `PATCH` now requires the `version` the edit is based on (400 without it). The save is one atomic `UPDATE ... SET ..., version = version + 1 WHERE id = ? AND version = ?`, using Prisma's `update` with `{ id, version }` in `where`. If no row matches, a follow-up read tells the two cases apart: the row is gone (404), or it changed (409 with the current record in the body).
- **Web app:** on 409 the edit form stays open with the user's text, and shows "Someone else changed this activity" with their version: **Keep my changes** (re-saves on top of their version, on purpose this time) or **Use their version**.
- **Subtle bug avoided:** the form remembers the version from when editing *started*. Live sync refreshes the activity while you type, so sending the version currently on screen would have quietly turned a stale edit into an overwrite.
- **Tests:**
  - unit tests for a stale edit (409, and nothing overwritten);
  - two simultaneous saves from the same version (exactly one wins);
  - API tests for a missing version (400) and the 409 body;
  - an e2e test where 10 clients each add 5 to a shared counter with retries, and the final count must be exactly 50.
- **Stress test** (`npm run stress:concurrency`, against a running server): 50 clients, each doing read → add 1 → save with retry on 409, on the same activity. Result: **1,000 successful edits, 16,579 stale writes rejected and retried, final counter 1,000, 0 lost updates** (local Postgres, ~98 s).

**Why**
- *Optimistic* because conflicts are rare and records are small. Locking a row while someone edits (pessimistic) would block everyone else and needs lock timeouts. The version check costs nothing when there's no conflict.
- The check lives in the database's `WHERE`, not in "read, compare, then write" code, so there's no gap between checking and writing where another save could sneak in.
- Not a CRDT: CRDTs merge concurrent edits automatically and shine for free-form text that several people type into at once. For small structured records, rejecting stale writes and letting the user decide is simpler and easier to reason about. I'd reach for a CRDT (e.g. Yjs) for shared trip notes.

**Open**
- Trips have the same check, but the web app has no rename-trip UI yet.
- Under heavy contention on one record, retries pile up (16 per success at 50 clients on a single row). Real trips have few editors per activity, so that's fine; a queue or a merge strategy would be the next step if it weren't.
