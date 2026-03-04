import { AuditRepository } from '../repositories/auditRepository.js';
import { logger } from '../utils/logger.js';

export class AuditService {
  private repo: AuditRepository;

  constructor() {
    this.repo = new AuditRepository();
  }

  log(entry: {
    userId?: number | null;
    action: string;
    entityType?: string;
    entityId?: string;
    detail?: string;
    ipAddress?: string;
  }): void {
    try {
      this.repo.create(entry);
    } catch (err) {
      logger.error('Failed to write audit log', { error: err, entry });
    }
  }

  getAll(options: { page: number; limit: number; action?: string; userId?: number }) {
    return this.repo.findAll(options);
  }

  cleanup(retentionDays: number = 90): number {
    const deleted = this.repo.deleteOlderThan(retentionDays);
    logger.info(`Audit cleanup: deleted ${deleted} records older than ${retentionDays} days`);
    return deleted;
  }
}
