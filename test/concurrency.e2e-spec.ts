import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { validationPipeOptions } from './../src/validation.js';

// The lost-update check: many clients edit the same activity at the same time.
// Each one reads it, adds 1 to a counter kept in `notes`, and saves with the
// version it read; on 409 it rereads and retries. If any save silently
// overwrote another, the final count would come up short.
describe('Concurrent edits (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('loses no updates when 10 clients each add 5 at once', async () => {
    const CLIENTS = 10;
    const EDITS_EACH = 5;
    const server = app.getHttpServer();

    await request(server)
      .patch('/activities/1')
      .send({ notes: '0', version: 1 })
      .expect(200);

    let conflicts = 0;
    const client = async () => {
      for (let done = 0; done < EDITS_EACH;) {
        const { body: current } = await request(server).get('/activities/1');
        const res = await request(server)
          .patch('/activities/1')
          .send({
            notes: String(Number(current.notes) + 1),
            version: current.version,
          });
        if (res.status === 200) {
          done++;
        } else {
          expect(res.status).toBe(409);
          conflicts++;
        }
      }
    };
    await Promise.all(Array.from({ length: CLIENTS }, client));

    const { body: final } = await request(server).get('/activities/1');
    expect(Number(final.notes)).toBe(CLIENTS * EDITS_EACH);
    // Every successful save bumped the version exactly once.
    expect(final.version).toBe(2 + CLIENTS * EDITS_EACH);
    // Sanity check that the clients really did collide.
    expect(conflicts).toBeGreaterThan(0);
    // Retries make heavy contention slow, so this test gets more time.
  }, 60_000);
});
