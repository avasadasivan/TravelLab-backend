# Load test: how fast does an edit reach everyone?

Script: [`scripts/load-test.ts`](../scripts/load-test.ts), run with `npm run load:test`.

## Method

1. Create temporary trips, each with one activity.
2. Connect `CLIENTS` real Socket.IO clients, spread evenly across the trips, each joining its trip's room like a browser with the trip open.
3. Edit each trip's activity over REST (`PATCH` with its version), round-robin, one edit every `GAP_MS`.
4. For every edit, record the time from **sending the save** to **each client receiving `activity.updated`**. That's the delay a person actually sees: request, validation, the Postgres write, the broadcast, and the network.
5. Report per-delivery percentiles, plus **"reaches everyone"**: the time until the *last* viewer of that trip has the update.
6. Delete the temporary trips.

Both timestamps come from the same process, so there's no clock skew. All clients run from one laptop, so this measures one network location.

## Results (2026-10-07)

**Production:** Render free web service + Neon Postgres (us-east-1), clients on a home connection over the internet. 10 edits per trip, 200 ms apart.

| Connected clients | Trips (viewers each) | Deliveries | Each client: median / p95 / p99 | Reaches everyone: median / p95 / max |
|---|---|---|---|---|
| 200 | 10 (~20) | 2,000 / 2,000 | 54 / 75 / 80 ms | 56 / 77 / 139 ms |
| 500 | 10 (~50) | 5,000 / 5,000 | 57 / 74 / 196 ms | 63 / 82 / 243 ms |
| 1,000 | 20 (~50) | 10,000 / 10,000 | 52 / 71 / 154 ms | 56 / 75 / 468 ms |
| **1,000** | **200 (~5, a realistic group size)** | **5,000 / 5,000** | **54 / 74 / 104 ms** | **56 / 75 / 623 ms** |

The last row is the realistic shape: many small groups planning different trips at the same time. *Simultaneous users* means load on the server across the whole app, not people on one trip.

**Local:** NestJS + Docker Postgres on a laptop, with the load generator on the same machine. 20 edits per trip, 100 ms apart.

| Connected clients | Trips (viewers each) | Deliveries | Each client: median / p95 / p99 | Reaches everyone: median / p95 / max |
|---|---|---|---|---|
| 500 | 10 (~50) | 10,000 / 10,000 | 23 / 36 / 47 ms | 25 / 38 / 55 ms |
| 1,000 | 10 (~100) | 20,000 / 20,000 | 22 / 30 / 40 ms | 23 / 31 / 60 ms |
| 2,000 | 20 (~100) | 40,000 / 40,000 | 25 / 51 / 66 ms | 28 / 54 / 87 ms |
| 500 | 1 (500, worst-case fan-out) | 10,000 / 10,000 | 31 / 52 / 60 ms | 41 / 60 / 64 ms |

## Takeaways

- Every update reached every connected client in every run (100% delivery).
- On the free production tier, 1,000 simultaneous users (200 groups of 5) got each edit within **75 ms at p95**. Most of that is the internet round trip and the database write, not the broadcast.
- The tail (max of a few hundred ms) comes from the free instance's shared CPU. A paid instance, or several instances behind the Socket.IO Redis adapter, would be the next step for more users.
- Locally, 2,000 clients stayed under 55 ms at p95, even with the load generator competing for the same CPU.
