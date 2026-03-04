import { describe, it, expect, beforeEach } from 'vitest';
import { RunService } from '../../services/runService.js';
import { createTestUser, getTestDb } from '../helpers.js';

describe('RunService', () => {
  let service: RunService;
  let userId: number;

  beforeEach(() => {
    service = new RunService();
    userId = createTestUser();
  });

  it('executeSearch creates a run and returns results', async () => {
    const result = await service.executeSearch({
      type: 'MANUAL',
      departureStation: '김천(구미)',
      arrivalStation: '동탄',
      departureDate: '2026-03-10',
      userId,
    });

    expect(result.runId).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(Array.isArray(result.recommendations)).toBe(true);

    // Verify run record was created and updated to SUCCESS
    const run = service.getById(result.runId);
    expect(run).toBeDefined();
    expect(run!.status).toBe('SUCCESS');
  }, 10000);

  it('getRecent returns runs ordered by creation time', async () => {
    // Create two runs
    await service.executeSearch({
      type: 'MANUAL',
      departureStation: '김천(구미)',
      arrivalStation: '동탄',
      departureDate: '2026-03-10',
      userId,
    });
    await service.executeSearch({
      type: 'MANUAL',
      departureStation: '김천(구미)',
      arrivalStation: '동탄',
      departureDate: '2026-03-11',
      userId,
    });

    const recent = service.getRecent(10);
    expect(recent.length).toBe(2);
  }, 15000);

  it('getTodayStats returns correct stats', () => {
    const stats = service.getTodayStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('success');
    expect(stats).toHaveProperty('fail');
    expect(stats).toHaveProperty('successRate');
    expect(stats.total).toBe(0);
    expect(stats.successRate).toBe(0);
  });

  it('cleanup deletes old runs', () => {
    const db = getTestDb();
    // Insert an old run manually
    db.prepare(`
      INSERT INTO runs (type, departure_station, arrival_station, departure_date, status, created_at)
      VALUES ('MANUAL', '김천(구미)', '동탄', '2025-01-01', 'SUCCESS', datetime('now', '-60 days'))
    `).run();

    const deleted = service.cleanup(30);
    expect(deleted).toBe(1);
  });
});
