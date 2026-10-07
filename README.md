# TravelLab

[![CI](https://github.com/avasadasivan/TravelLab-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/avasadasivan/TravelLab-backend/actions/workflows/ci.yml)

A real-time collaborative trip planner. Instead of planning in a scattered group chat, friends build one shared itinerary, and every change shows up for everyone viewing the trip instantly.

**Live demo: [travellab-app.vercel.app](https://travellab-app.vercel.app)**

> The backend runs on a free plan that sleeps when idle, so the first load can take up to a minute while it wakes up.

![TravelLab trip page](docs/screenshot-trip.png)

**Try the live sync:** open the same trip in two windows (or your laptop and your phone), add or edit an activity in one, and watch the other update by itself.

This repo is the **backend API** (NestJS + PostgreSQL + Socket.IO). The web app is in [TravelLab-frontend](https://github.com/avasadasivan/TravelLab-frontend), and a native iOS app is being built against the same API.

## Features

- Trips with a day-by-day itinerary of activities (time, place, notes)
- Real-time sync: every create, edit and delete reaches everyone viewing the trip, with a live connection indicator
- Share a trip by copying its link
- One API shared by the web app and the iOS app, defined in a written contract ([docs/api.md](docs/api.md))
- 35 automated tests against a real PostgreSQL database (31 integration + 4 end-to-end), run in CI on every pull request

## Architecture

```
Next.js web app ─┐                       ┌─ REST (all reads and writes) ──► PostgreSQL
                 ├──► NestJS backend ────┤
iOS app ─────────┘                       └─ Socket.IO (announces changes, one room per trip)
```

What happens when someone adds an activity: the browser sends a REST `POST`, the backend validates it and saves it to Postgres, then broadcasts `activity.created` to that trip's room. Every open page on that trip hears the event and refetches the trip's data.

- One NestJS backend serving two clients: a Next.js web app and an iOS app
- REST endpoints for reads and writes, documented in [docs/api.md](docs/api.md) as a contract both clients code against
- Socket.IO pushes every change to everyone viewing that trip
- Version numbers on each record, so conflicting edits can be detected (rejecting stale edits is planned)

## Key decisions

- **REST writes, socket announcements.** Every change goes through the REST API, and the socket only announces it. Validation, 404s and versions live in one place, the same for web and iOS.
- **One room per trip.** A client joins `trip:<id>` and only hears about that trip, so a change never reaches users who aren't looking at it.
- **Observer pattern between services and the gateway.** The trips and activities services announce changes without knowing sockets exist. The gateway subscribes and forwards. The dependency points one way, and adding live sync didn't change a single unit test.
- **Clients refetch instead of patching state.** On an event, the web app reloads the trip's data. It's simple and can't drift out of sync, at the cost of one extra request per change.
- **Reconnects rejoin and refetch.** Rooms don't survive a dropped connection, so on every connect the client rejoins and refetches, catching anything it missed while offline. Found by restarting the server under open tabs.
- **Ids never reused.** A counter that only goes up, like a Postgres sequence, so a deleted id can't come back and confuse another client.
- **Postgres with local wall-clock times.** Activity times are stored as `timestamp without time zone` plus an IANA zone, so a 10:00 visit stays 10:00 for every viewer. Deleting a trip cascades to its activities in the database itself.
- **Strict request validation.** Unknown fields are rejected, which closes mass-assignment holes like a client sending its own `id`.

The reasoning behind each block is in [DEVLOG.md](DEVLOG.md).

## What's next

- Reject stale edits with `409` using the version numbers (optimistic concurrency)
- Load-test many simultaneous users and measure how fast an edit reaches everyone
- End-to-end tests in CI with two browsers
- Accounts, invite links and live presence, so only a trip's members can read it or join its room
- Multiple server instances (Socket.IO Redis adapter)

## Tech stack

- **Backend:** NestJS 12, TypeScript, Socket.IO, class-validator
- **Database:** PostgreSQL 17, Prisma 7 (schema, migrations, type-safe queries)
- **Web app:** Next.js 16, React 19, Tailwind CSS ([frontend repo](https://github.com/avasadasivan/TravelLab-frontend))
- **Testing & CI:** Vitest, Supertest, GitHub Actions with a Postgres service container
- **Infrastructure:** Docker (multi-stage Dockerfile, Docker Compose), Neon, Render, Vercel

## Run locally

Needs Node 24 and Docker Desktop (running).

```bash
cp .env.example .env
npm ci                # also generates the Prisma client
npm run db:up         # Postgres 17 in Docker
npx prisma migrate deploy
npm run db:seed       # sample Paris trip
npm run start:dev     # http://localhost:3001
```

Or run the whole backend in containers (Postgres + API): `npm run docker:up`.

After changing `prisma/schema.prisma`, run `npm run db:migrate` to create a migration.

## Deploy

- **Database:** Neon (hosted Postgres 17)
- **Backend:** Render web service
  - Build: `npm ci && npm run build`
  - Start: `npm run start:prod`, which applies pending migrations, then starts the server
  - Env: `DATABASE_URL` (Neon pooled), `DIRECT_DATABASE_URL` (Neon direct, for migrations), `FRONTEND_ORIGIN` (the deployed web app's URL)
- **Web app:** Vercel, with `NEXT_PUBLIC_API_BASE` set to the Render URL

## Test

Tests use their own database (`travellab_test`), which they wipe before every test. Postgres must be running (`npm run db:up`).

```bash
npm test           # 31 service and API tests
npm run test:e2e   # 4 end-to-end tests that boot the whole app
```
