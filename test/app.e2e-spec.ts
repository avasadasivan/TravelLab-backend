import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { validationPipeOptions } from './../src/validation.js';

// Boots the whole app (every module, the real test database) the way main.ts
// does, to check the pieces are wired together.
describe('TravelLab (e2e)', () => {
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

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Welcome to TravelLab!');
  });

  it('lists the sample trip from the database', () => {
    return request(app.getHttpServer())
      .get('/trips')
      .expect(200)
      .expect([{ id: 1, name: 'Paris spring break', version: 1 }]);
  });

  it('creates an activity and lists it in start time order', async () => {
    await request(app.getHttpServer())
      .post('/trips/1/activities')
      .send({
        title: 'Breakfast',
        startTime: '2026-11-03T08:00',
        timeZone: 'Europe/Paris',
        location: 'Paris',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/trips/1/activities')
      .expect(200);
    expect(res.body[0].title).toBe('Breakfast');
    expect(res.body).toHaveLength(4);
  });

  it('deleting a trip deletes its activities too', async () => {
    await request(app.getHttpServer()).delete('/trips/1').expect(204);
    await request(app.getHttpServer()).get('/trips/1/activities').expect(404);
    await request(app.getHttpServer()).get('/activities/1').expect(404);
  });
});
