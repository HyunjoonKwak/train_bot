import { describe, it, expect } from 'vitest';
import { ScoringService } from '../../services/scoringService.js';
import type { TrainResult } from '../../types/index.js';

function makeTrain(overrides?: Partial<TrainResult>): TrainResult {
  return {
    trainType: 'SRT',
    trainNumber: '301',
    departureStation: '김천(구미)',
    arrivalStation: '동탄',
    departureTime: '07:00',
    arrivalTime: '08:00',
    duration: '1시간',
    price: 20000,
    seatAvailable: true,
    isDirect: true,
    ...overrides,
  };
}

describe('ScoringService', () => {
  const service = new ScoringService();

  it('gives higher score to direct trains', () => {
    const results = service.score([
      makeTrain({ isDirect: true, trainNumber: '1' }),
      makeTrain({ isDirect: false, trainNumber: '2' }),
    ]);
    expect(results[0].train.isDirect).toBe(true);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('gives higher score when seats are available', () => {
    const results = service.score([
      makeTrain({ seatAvailable: true, trainNumber: '1' }),
      makeTrain({ seatAvailable: false, trainNumber: '2' }),
    ]);
    expect(results[0].train.seatAvailable).toBe(true);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('penalizes longer duration', () => {
    const results = service.score([
      makeTrain({ duration: '30분', trainNumber: '1' }),
      makeTrain({ duration: '2시간', trainNumber: '2' }),
    ]);
    expect(results[0].train.trainNumber).toBe('1');
  });

  it('boosts score near preferred time', () => {
    const results = service.score(
      [makeTrain({ departureTime: '07:00' })],
      '07:10',
    );
    expect(results[0].reason).toContain('선호 시간대');
  });

  it('does not boost score far from preferred time', () => {
    const results = service.score(
      [makeTrain({ departureTime: '07:00' })],
      '10:00',
    );
    expect(results[0].reason).not.toContain('선호 시간대');
  });

  it('boosts preferred train type', () => {
    const results = service.score(
      [makeTrain({ trainType: 'SRT' })],
      undefined,
      'SRT',
    );
    expect(results[0].reason).toContain('SRT 선호');
  });

  it('returns scores sorted descending', () => {
    const results = service.score([
      makeTrain({ seatAvailable: false, isDirect: false, trainNumber: 'low' }),
      makeTrain({ seatAvailable: true, isDirect: true, trainNumber: 'high' }),
    ]);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('clamps score to minimum 0', () => {
    const results = service.score([
      makeTrain({ seatAvailable: false, isDirect: false, duration: '10시간' }),
    ]);
    expect(results[0].score).toBeGreaterThanOrEqual(0);
  });
});
