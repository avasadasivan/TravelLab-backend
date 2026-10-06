import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

// Prisma 7 talks to Postgres through the `pg` driver via an adapter.
export function createPrismaClient(
  connectionString = process.env.DATABASE_URL,
) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// The one database client the whole app shares. Nest creates it once and
// hands it to any service that asks for PrismaService.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// Prisma's "the row you asked to update or delete doesn't exist" error.
export function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
  );
}
