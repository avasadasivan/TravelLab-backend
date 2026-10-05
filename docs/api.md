# TravelLab API contract (v0.1)

The agreement between the TravelLab backend, the web app and the iOS app.
Anything marked **Planned** is not built yet, but its shape is fixed so clients can code against it now.

- Base URL (local dev): `http://localhost:3001`
- Bodies are JSON (`Content-Type: application/json`).
- Field names are camelCase.
- No auth yet. **Planned:** a bearer token in the `Authorization` header.

## Data shapes

### Trip

```json
{
  "id": 1,
  "name": "Paris spring break",
  "version": 1
}
```

| Field | Type | Required on create | Notes |
|---|---|---|---|
| `id` | number | no (server sets it) | Never reused after a delete. |
| `name` | string | yes | Not empty. |
| `version` | number | no (server sets it) | Starts at 1, +1 on every change. |

### Activity

```json
{
  "id": 7,
  "tripId": 1,
  "title": "Visit the Louvre",
  "startTime": "2026-11-03T10:00",
  "timeZone": "Europe/Paris",
  "location": "Paris",
  "notes": "Buy tickets beforehand",
  "version": 3
}
```

| Field | Type | Required on create | Notes |
|---|---|---|---|
| `id` | number | no (server sets it) | Never reused after a delete. |
| `tripId` | number | no (comes from the URL) | The trip this activity belongs to. |
| `title` | string | yes | Not empty. |
| `startTime` | string | yes | Local wall-clock time at the destination, `YYYY-MM-DDTHH:mm`, **no** `Z` or offset. |
| `timeZone` | string | yes | IANA zone name of the place, e.g. `Europe/Paris`. |
| `location` | string | yes | Free text for now. |
| `notes` | string or `null` | no | Missing on create = `null`. |
| `version` | number | no (server sets it) | Starts at 1, +1 on every change. |

**Why local time + time zone:** "Louvre at 10:00" means 10:00 in Paris for everyone, whether a friend is planning from New York or Paris. Apps show `startTime` as-is, labelled with the city. To compare times across zones (sorting, "starts in 2 hours"), combine `startTime` with `timeZone`.

## Endpoints

| Method | Path | Success | Errors | Status |
|---|---|---|---|---|
| `GET` | `/trips` | 200, `Trip[]` | | Planned |
| `POST` | `/trips` | 201, `Trip` | 400 | Planned |
| `GET` | `/trips/:tripId` | 200, `Trip` | 404 | Planned |
| `PATCH` | `/trips/:tripId` | 200, `Trip` | 400, 404, 409 | Planned |
| `DELETE` | `/trips/:tripId` | 204, no body | 404 | Planned |
| `GET` | `/trips/:tripId/activities` | 200, `Activity[]` sorted by `startTime` | 404 | Planned |
| `POST` | `/trips/:tripId/activities` | 201, `Activity` | 400, 404 | Planned |
| `GET` | `/activities/:id` | 200, `Activity` | 404 | Built (old shape) |
| `PATCH` | `/activities/:id` | 200, `Activity` | 400, 404, 409 | Built (old shape) |
| `DELETE` | `/activities/:id` | 204, no body | 404 | Built (returns 200 today) |

Lists and creates are nested under a trip because an activity always belongs to one. Reading, editing and deleting a single activity only needs its id, so those paths stay short.

Deleting a trip also deletes its activities.

### Request bodies

`POST /trips`: `{ "name": "Paris spring break" }`

`POST /trips/:tripId/activities`:
```json
{
  "title": "Visit the Louvre",
  "startTime": "2026-11-03T10:00",
  "timeZone": "Europe/Paris",
  "location": "Paris",
  "notes": "Buy tickets beforehand"
}
```

`PATCH` (trip or activity): send only the fields you change, **plus the `version` you last saw**.
```json
{ "notes": "Closed Tuesdays", "version": 3 }
```
- A field left out = unchanged.
- `"notes": null` = clear the notes. (Only `notes` accepts `null`.)
- `id`, `tripId` and any unknown field = 400.

## Concurrent edits (`version`)

Every trip and activity carries `version`. Clients must send it back on every `PATCH`.

- **Now:** the server accepts `version` and ignores it.
- **Planned:** if `version` doesn't match the current one, the server rejects the edit with `409 Conflict` and the current record, so the app can reload and let the user retry:

```json
{
  "statusCode": 409,
  "message": "Activity 7 was changed by someone else",
  "error": "Conflict",
  "current": { "id": 7, "version": 4, "...": "..." }
}
```

Sending `version` from day one means the iOS app won't need an update when the check is switched on.

## Errors

Every error uses the same shape (NestJS default):

```json
{ "statusCode": 400, "message": ["title should not be empty"], "error": "Bad Request" }
```

`message` is a string or an array of strings.

| Code | When |
|---|---|
| 400 | Body fails validation, has unknown fields, or the id isn't a number |
| 404 | No trip or activity with that id |
| 409 | Stale `version` (planned) |
| 500 | Server bug |

## Live updates (Planned)

Socket.IO on the same host and port. Writes still go through REST; the socket only announces them.

1. Connect, then emit `trip.join` with `{ "tripId": 1 }`.
2. After every successful write, the server sends the event to everyone in that trip (including the client that made the change):

| Event | Payload |
|---|---|
| `trip.updated` | the full `Trip` |
| `trip.deleted` | `{ "id": 1 }` |
| `activity.created` | the full `Activity` |
| `activity.updated` | the full `Activity` |
| `activity.deleted` | `{ "id": 7, "tripId": 1 }` |

If an event's `version` is not higher than what the app already has, ignore it.

## Changing this contract

- Safe without warning: new endpoints, new optional fields, new events. Apps must ignore fields they don't know.
- Breaking (renaming or removing a field, changing a type, making a field required): agree with both client devs first. Once the iOS app is on real phones, breaking changes go under a new `/v2` path.
