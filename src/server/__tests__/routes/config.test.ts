import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp, seedConfig } from '../helpers.js';
import { createApp } from '../../app.js';

describe('Config routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp(); // ADMIN user by default
  });

  describe('GET /api/config', () => {
    it('returns 200 with config list', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns 401 without session', async () => {
      const unauthApp = createApp();
      const res = await request(unauthApp).get('/api/config');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/config/:key', () => {
    it('updates an existing config value (ADMIN)', async () => {
      const res = await request(app)
        .put('/api/config/departure_station')
        .send({ value: '서울' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify the update
      const getRes = await request(app).get('/api/config');
      const updated = getRes.body.data.find((c: any) => c.key === 'departure_station');
      expect(updated.value).toBe('서울');
    });

    it('returns 403 for MEMBER role', async () => {
      const memberApp = createTestApp({ role: 'MEMBER' });
      const res = await request(memberApp)
        .put('/api/config/departure_station')
        .send({ value: '서울' });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid key format', async () => {
      const res = await request(app)
        .put('/api/config/INVALID-KEY!')
        .send({ value: 'test' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty value', async () => {
      const res = await request(app)
        .put('/api/config/departure_station')
        .send({ value: '' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent key', async () => {
      const res = await request(app)
        .put('/api/config/nonexistent_key_abc')
        .send({ value: 'test' });
      expect(res.status).toBe(404);
    });
  });
});
