// Live-sync load test: how fast does an edit reach everyone viewing a trip?
//
//   npm run load:test                                   # 500 clients, localhost
//   CLIENTS=200 API=https://... npm run load:test       # against a deployment
//
// Creates TRIPS temporary trips, connects CLIENTS Socket.IO clients spread
// evenly across them (like browsers with the trip open), then edits each
// trip's activity over REST, EDITS times per trip. For every edit it measures
// the time from sending the PATCH to each client receiving `activity.updated`:
// the delay a person actually sees. Everything runs in this one process, so
// both timestamps come from the same clock. Temporary trips are deleted at
// the end.

import { io, type Socket } from 'socket.io-client';

const API = process.env.API ?? 'http://localhost:3001';
const CLIENTS = Number(process.env.CLIENTS ?? 500);
const TRIPS = Number(process.env.TRIPS ?? 10);
const EDITS = Number(process.env.EDITS ?? 20);
// Pause between edits, so we measure delivery speed, not a write flood.
const GAP_MS = Number(process.env.GAP_MS ?? 100);

type Activity = { id: number; tripId: number; version: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return NaN;
  const i = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, i)];
}

const fmt = (ms: number) => `${ms.toFixed(1)} ms`;

// --- Setup: temporary trips, one activity each ---
const activities: Activity[] = [];
for (let t = 0; t < TRIPS; t++) {
  const trip = await call('POST', '/trips', {
    name: `Load test ${t} (temporary)`,
  });
  activities.push(
    await call('POST', `/trips/${trip.id}/activities`, {
      title: 'Load test',
      startTime: '2026-01-01T09:00',
      timeZone: 'UTC',
      location: 'Nowhere',
    }),
  );
}

// key "activityId:version" -> when the PATCH for that version was sent
const sentAt = new Map<string, number>();
const latencies: number[] = []; // every single delivery
const lastArrival = new Map<string, number>(); // key -> latest delivery time
const deliveries = new Map<string, number>(); // key -> how many clients got it
const viewersPerTrip = new Map<number, number>();
let unexpected = 0;

const sockets: Socket[] = [];
try {
  // --- Connect clients, spread round-robin over the trips ---
  const connectStart = performance.now();
  await Promise.all(
    Array.from({ length: CLIENTS }, (_, i) => {
      const { tripId } = activities[i % TRIPS];
      viewersPerTrip.set(tripId, (viewersPerTrip.get(tripId) ?? 0) + 1);
      const socket = io(API, { transports: ['websocket'], forceNew: true });
      sockets.push(socket);
      socket.on('activity.updated', (a: Activity) => {
        const key = `${a.id}:${a.version}`;
        const sent = sentAt.get(key);
        if (sent === undefined) {
          unexpected++;
          return;
        }
        const now = performance.now();
        latencies.push(now - sent);
        lastArrival.set(key, Math.max(lastArrival.get(key) ?? 0, now));
        deliveries.set(key, (deliveries.get(key) ?? 0) + 1);
      });
      return new Promise<void>((resolve, reject) => {
        socket.once('connect', () => {
          socket.emit('trip.join', { tripId });
          resolve();
        });
        socket.once('connect_error', reject);
      });
    }),
  );
  const connectSeconds = (performance.now() - connectStart) / 1000;
  // The server doesn't acknowledge trip.join; give the joins a moment to land.
  await sleep(2000);

  // --- Edits: round-robin over the trips ---
  for (let e = 0; e < EDITS; e++) {
    for (const activity of activities) {
      const nextVersion = activity.version + 1;
      sentAt.set(`${activity.id}:${nextVersion}`, performance.now());
      const saved: Activity = await call(
        'PATCH',
        `/activities/${activity.id}`,
        {
          notes: `edit ${e}`,
          version: activity.version,
        },
      );
      activity.version = saved.version;
      await sleep(GAP_MS);
    }
  }
  await sleep(2000); // let the last broadcasts arrive

  // --- Results ---
  latencies.sort((a, b) => a - b);
  const fanOut = [...sentAt.entries()]
    .map(([key, sent]) => (lastArrival.get(key) ?? NaN) - sent)
    .sort((a, b) => a - b);
  const editCount = sentAt.size;
  const expected = activities.reduce(
    (sum, a) => sum + (viewersPerTrip.get(a.tripId) ?? 0) * EDITS,
    0,
  );

  console.log(`API:                 ${API}`);
  console.log(
    `Connected clients:   ${CLIENTS} across ${TRIPS} trips (~${Math.round(CLIENTS / TRIPS)} viewers each), in ${connectSeconds.toFixed(1)} s`,
  );
  console.log(
    `Edits:               ${editCount} (${EDITS} per trip, ${GAP_MS} ms apart)`,
  );
  console.log(
    `Deliveries:          ${latencies.length} of ${expected} expected (${((100 * latencies.length) / expected).toFixed(2)}%)`,
  );
  console.log('Save -> each client receives the update:');
  console.log(
    `  median ${fmt(percentile(latencies, 50))} | p95 ${fmt(percentile(latencies, 95))} | p99 ${fmt(percentile(latencies, 99))} | max ${fmt(latencies[latencies.length - 1])}`,
  );
  console.log(
    'Save -> the LAST viewer of that trip has it ("reaches everyone"):',
  );
  console.log(
    `  median ${fmt(percentile(fanOut, 50))} | p95 ${fmt(percentile(fanOut, 95))} | max ${fmt(fanOut[fanOut.length - 1])}`,
  );
  if (unexpected) console.log(`Unexpected events:   ${unexpected}`);
  if (latencies.length !== expected) process.exitCode = 1;
} finally {
  for (const socket of sockets) socket.disconnect();
  for (const activity of activities) {
    await call('DELETE', `/trips/${activity.tripId}`).catch(() => {});
  }
}
