import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { validationPipeOptions } from '../validation.js';
import { ActivitiesModule } from './activities.module.js';

describe('Activities request validation', () => {
  let app: INestApplication;

  const validActivity = {
    title: 'Louvre',
    time: '10:00',
    location: 'Paris',
    notes: 'Buy tickets',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivitiesModule],
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
      .post('/activities')
      .send(body)
      .expect(400);
  });

  it('rejects a create body whose title is a number', () => {
    return request(app.getHttpServer())
      .post('/activities')
      .send({ ...validActivity, title: 123 })
      .expect(400);
  });

  it('rejects a create body with an unknown field', () => {
    return request(app.getHttpServer())
      .post('/activities')
      .send({ ...validActivity, isAdmin: true })
      .expect(400);
  });

  it('creates an activity from a valid body', () => {
    return request(app.getHttpServer())
      .post('/activities')
      .send(validActivity)
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject(validActivity);
        expect(typeof res.body.id).toBe('number');
      });
  });

  it('rejects an update body that tries to change the id', () => {
    return request(app.getHttpServer())
      .patch('/activities/1')
      .send({ id: 99 })
      .expect(400);
  });

  it('rejects a non-numeric id param', () => {
    return request(app.getHttpServer()).get('/activities/abc').expect(400);
  });
});
