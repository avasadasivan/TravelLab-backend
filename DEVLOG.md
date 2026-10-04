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
