// startTime is a local wall-clock time ("2026-11-03T10:00") with no zone.
// Postgres stores it as `timestamp without time zone`, and Prisma hands it
// over as a JS Date. Going through UTC on both sides means the digits never
// shift, whatever time zone the server runs in.

export function toDbLocalTime(localTime: string): Date {
  return new Date(`${localTime}:00Z`);
}

export function fromDbLocalTime(date: Date): string {
  return date.toISOString().slice(0, 16);
}
