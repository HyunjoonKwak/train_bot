import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Health & Auth guards', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/config returns 401 without session', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(401);
  });

  it('GET /api/schedules returns 401 without session', async () => {
    const res = await request(app).get('/api/schedules');
    expect(res.status).toBe(401);
  });
});
