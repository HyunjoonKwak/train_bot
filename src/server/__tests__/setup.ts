import { beforeEach } from 'vitest';
import { DatabaseManager } from '../infrastructure/database/connection.js';
import { runMigrations } from '../infrastructure/database/migrator.js';
import { CronManager } from '../infrastructure/scheduler/cronManager.js';

beforeEach(() => {
  // Reset singletons to ensure test isolation
  DatabaseManager.resetInstance();
  CronManager.destroy();

  // Initialize in-memory database with migrations
  const dbManager = DatabaseManager.getInstance(':memory:');
  runMigrations(dbManager.getDb());
});
