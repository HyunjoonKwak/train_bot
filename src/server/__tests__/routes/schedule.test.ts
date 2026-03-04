import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from '../helpers.js';
import { createApp } from '../../app.js';

describe('Schedule routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/schedules', () => {
    it('returns 200 with empty list initially', async () => {
      const res = await request(app).get('/api/schedules');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns 401 without session', async () => {
      const unauthApp = createApp();
      const res = await request(unauthApp).get('/api/schedules');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/schedules', () => {
    it('creates a schedule (ADMIN)', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .send({
          name: 'Test Schedule',
          cronExpression: '0 6 * * *',
          taskType: 'SEARCH',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('returns 403 for MEMBER role', async () => {
      const memberApp = createTestApp({ role: 'MEMBER' });
      const res = await request(memberApp)
        .post('/api/schedules')
        .send({
          name: 'Test',
          cronExpression: '0 6 * * *',
          taskType: 'SEARCH',
        });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid cron expression', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .send({
          name: 'Bad Cron',
          cronExpression: 'not-a-cron',
          taskType: 'SEARCH',
        });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid task type', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .send({
          name: 'Bad Task',
          cronExpression: '0 6 * * *',
          taskType: 'INVALID',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/schedules/:id', () => {
    it('updates an existing schedule', async () => {
      // Create first
      const createRes = await request(app)
        .post('/api/schedules')
        .send({ name: 'Original', cronExpression: '0 6 * * *', taskType: 'SEARCH' });
      const id = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/schedules/${id}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    it('deletes an existing schedule', async () => {
      const createRes = await request(app)
        .post('/api/schedules')
        .send({ name: 'ToDelete', cronExpression: '0 6 * * *', taskType: 'CLEANUP' });
      const id = createRes.body.data.id;

      const deleteRes = await request(app).delete(`/api/schedules/${id}`);
      expect(deleteRes.status).toBe(200);

      // Verify it's gone
      const listRes = await request(app).get('/api/schedules');
      expect(listRes.body.data).toEqual([]);
    });
  });
});
