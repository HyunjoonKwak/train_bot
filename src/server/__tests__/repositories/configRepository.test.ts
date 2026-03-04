import { describe, it, expect } from 'vitest';
import { ConfigRepository } from '../../repositories/configRepository.js';
import { createTestUser } from '../helpers.js';

describe('ConfigRepository', () => {
  it('reads seeded default config values', () => {
    const repo = new ConfigRepository();
    const all = repo.findAll();
    expect(all.length).toBeGreaterThan(0);

    const station = repo.findByKey('departure_station');
    expect(station).toBeDefined();
    expect(station!.value).toBe('김천(구미)');
  });

  it('returns default when key does not exist', () => {
    const repo = new ConfigRepository();
    const value = repo.getValue('nonexistent_key', 'fallback');
    expect(value).toBe('fallback');
  });

  it('updates a config value', () => {
    const repo = new ConfigRepository();
    const userId = createTestUser();

    repo.updateValue('departure_station', '서울', userId);

    const updated = repo.findByKey('departure_station');
    expect(updated!.value).toBe('서울');
    expect(updated!.updated_by).toBe(userId);
  });

  it('upserts a new key', () => {
    const repo = new ConfigRepository();
    repo.upsert('new_key', 'new_value', 'A new config');

    const row = repo.findByKey('new_key');
    expect(row).toBeDefined();
    expect(row!.value).toBe('new_value');
    expect(row!.description).toBe('A new config');
  });

  it('upserts an existing key (updates value)', () => {
    const repo = new ConfigRepository();
    repo.upsert('departure_station', '부산', '변경된 출발역');

    const row = repo.findByKey('departure_station');
    expect(row!.value).toBe('부산');
  });
});
