# TravelLab

[![CI](https://github.com/avasadasivan/TravelLab-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/avasadasivan/TravelLab-backend/actions/workflows/ci.yml)

A real-time collaborative trip planner. Friend groups plan trips and build their itinerary together in one place, from the web or an iOS app.

This repo is the backend API.

## Architecture

- One NestJS backend serving two clients: a Next.js web app and an iOS app
- REST endpoints for reads and writes
- Socket.IO to push changes to everyone on a trip in real time (planned)
- Version numbers on each record to catch conflicting edits (planned)

## Tech stack

NestJS 12, TypeScript, Vitest, class-validator, GitHub Actions

## Run locally

```bash
npm ci
npm run start:dev   # http://localhost:3001
```

## Test

```bash
npm test
```
