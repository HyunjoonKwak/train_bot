import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from '../helpers.js';

describe('Run routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/runs', () => {
    it('executes a search and returns results', async () => {
      const res = await request(app)
        .post('/api/runs')
        .send({
          departureDate: '2026-03-10',
          departureStation: '김천(구미)',
          arrivalStation: '동탄',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.runId).toBeDefined();
      expect(Array.isArray(res.body.data.results)).toBe(true);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    }, 10000);

    it('returns 400 for missing departureDate', async () => {
      const res = await request(app)
        .post('/api/runs')
        .send({
          departureStation: '김천(구미)',
          arrivalStation: '동탄',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/runs', () => {
    it('returns paginated list', async () => {
      const res = await request(app).get('/api/runs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/runs/recent', () => {
    it('returns recent runs', async () => {
      const res = await request(app).get('/api/runs/recent');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/runs/stats', () => {
    it('returns today stats', async () => {
      const res = await request(app).get('/api/runs/stats');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('fail');
      expect(res.body.data).toHaveProperty('successRate');
    });
  });

  describe('GET /api/runs/:id', () => {
    it('returns 404 for nonexistent run', async () => {
      const res = await request(app).get('/api/runs/99999');
      expect(res.status).toBe(404);
    });
  });
});
