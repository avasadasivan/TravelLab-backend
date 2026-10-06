import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaModule } from '../prisma/prisma.module.js';
import { validationPipeOptions } from '../validation.js';
import { ActivitiesModule } from './activities.module.js';

describe('Activities request validation', () => {
  let app: INestApplication;

  const validActivity = {
    title: 'Louvre',
    startTime: '2026-11-03T10:00',
    timeZone: 'Europe/Paris',
    location: 'Paris',
    notes: 'Buy tickets',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, ActivitiesModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a create body with no title', () => {
    const { title: _title, ...body } = validActivity;

    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send(body)
      .expect(400);
  });

  it('rejects a create body whose title is a number', () => {
    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send({ ...validActivity, title: 123 })
      .expect(400);
  });

  it('rejects a startTime with a time zone on the end', () => {
    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send({ ...validActivity, startTime: '2026-11-03T10:00:00Z' })
      .expect(400);
  });

  it('rejects a create body with an unknown field', () => {
    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send({ ...validActivity, isAdmin: true })
      .expect(400);
  });

  it('creates an activity from a valid body', () => {
    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send(validActivity)
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({ ...validActivity, tripId: 1 });
        expect(typeof res.body.id).toBe('number');
        expect(res.body.version).toBe(1);
      });
  });

  it('creates an activity with no notes', () => {
    const { notes: _notes, ...body } = validActivity;

    return request(app.getHttpServer())
      .post('/trips/1/activities')
      .send(body)
      .expect(201)
      .expect((res) => {
        expect(res.body.notes).toBeNull();
      });
  });

  it('rejects an update body that tries to change the id', () => {
    return request(app.getHttpServer())
      .patch('/activities/1')
      .send({ id: 99 })
      .expect(400);
  });

  it('accepts an update body carrying the version it last saw', () => {
    return request(app.getHttpServer())
      .patch('/activities/1')
      .send({ notes: 'Closed Tuesdays', version: 1 })
      .expect(200)
      .expect((res) => {
        expect(res.body.notes).toBe('Closed Tuesdays');
        // The server owns the version number, not the client.
        expect(res.body.version).toBe(2);
      });
  });

  it('clears the notes when sent null', () => {
    return request(app.getHttpServer())
      .patch('/activities/1')
      .send({ notes: null })
      .expect(200)
      .expect((res) => {
        expect(res.body.notes).toBeNull();
      });
  });

  it('404s when creating an activity under an unknown trip', () => {
    return request(app.getHttpServer())
      .post('/trips/999/activities')
      .send(validActivity)
      .expect(404);
  });

  it('404s when listing activities for an unknown trip', () => {
    return request(app.getHttpServer())
      .get('/trips/999/activities')
      .expect(404);
  });

  it('rejects a non-numeric id param', () => {
    return request(app.getHttpServer()).get('/activities/abc').expect(400);
  });

  it('returns 204 and no body on delete', () => {
    return request(app.getHttpServer())
      .delete('/activities/1')
      .expect(204)
      .expect((res) => {
        expect(res.body).toEqual({});
      });
  });
});
