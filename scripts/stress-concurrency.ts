// Lost-update stress test against a running backend.
//
//   npm run stress:concurrency                 # 50 clients x 20 edits, localhost
//   CLIENTS=100 EDITS=10 API=https://... npm run stress:concurrency
//
// Creates a scratch trip with one activity. Every client repeatedly reads the
// activity, adds 1 to a counter stored in `notes`, and saves with the version
// it read; on 409 it rereads and retries. With optimistic concurrency the
// final count equals CLIENTS x EDITS: zero lost updates. The scratch trip is
// deleted at the end.

const API = process.env.API ?? 'http://localhost:3001';
const CLIENTS = Number(process.env.CLIENTS ?? 50);
const EDITS = Number(process.env.EDITS ?? 20);

type Activity = { id: number; notes: string | null; version: number };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const trip = (await call('POST', '/trips', { name: 'Stress test (temporary)' }))
  .body as { id: number };
const activity = (
  await call('POST', `/trips/${trip.id}/activities`, {
    title: 'Counter',
    startTime: '2026-01-01T09:00',
    timeZone: 'UTC',
    location: 'Nowhere',
    notes: '0',
  })
).body as Activity;

let saves = 0;
let conflicts = 0;
let errors = 0;
const started = performance.now();

async function client() {
  for (let done = 0; done < EDITS;) {
    const current = (await call('GET', `/activities/${activity.id}`))
      .body as Activity;
    const res = await call('PATCH', `/activities/${activity.id}`, {
      notes: String(Number(current.notes) + 1),
      version: current.version,
    });
    if (res.status === 200) {
      done++;
      saves++;
    } else if (res.status === 409) {
      conflicts++;
    } else {
      errors++;
      throw new Error(`Unexpected ${res.status}: ${JSON.stringify(res.body)}`);
    }
  }
}

try {
  await Promise.all(Array.from({ length: CLIENTS }, client));
  const seconds = (performance.now() - started) / 1000;
  const final = (await call('GET', `/activities/${activity.id}`))
    .body as Activity;
  const expected = CLIENTS * EDITS;
  const counted = Number(final.notes);

  console.log(`API:               ${API}`);
  console.log(
    `Clients:           ${CLIENTS} editing the same activity at once`,
  );
  console.log(`Successful edits:  ${saves} (expected ${expected})`);
  console.log(
    `409 conflicts:     ${conflicts} (rejected stale writes, retried)`,
  );
  console.log(`Final counter:     ${counted}`);
  console.log(`Final version:     ${final.version}`);
  console.log(`Lost updates:      ${expected - counted}`);
  console.log(`Unexpected errors: ${errors}`);
  console.log(`Time:              ${seconds.toFixed(1)} s`);
  if (counted !== expected) process.exitCode = 1;
} finally {
  await call('DELETE', `/trips/${trip.id}`);
}
