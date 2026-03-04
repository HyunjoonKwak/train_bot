import { ConfigRepository } from '../repositories/configRepository.js';
import { AuditService } from './auditService.js';
import { AppError } from '../middleware/errorHandler.js';

// Config keys that should have their values redacted in audit logs
const SENSITIVE_KEYS = new Set(['api_key', 'api_secret', 'telegram_token', 'session_secret']);

export class ConfigService {
  private repo: ConfigRepository;
  private audit: AuditService;

  constructor() {
    this.repo = new ConfigRepository();
    this.audit = new AuditService();
  }

  getAll() {
    return this.repo.findAll().map(row => ({
      key: row.key,
      value: row.value,
      description: row.description,
    }));
  }

  getValue(key: string, defaultValue?: string): string {
    return this.repo.getValue(key, defaultValue);
  }

  updateValue(key: string, value: string, userId: number) {
    const existing = this.repo.findByKey(key);
    if (!existing) {
      throw new AppError(404, `설정 키를 찾을 수 없습니다: ${key}`);
    }
    this.repo.updateValue(key, value, userId);

    // Redact sensitive values in audit log
    const isSensitive = SENSITIVE_KEYS.has(key);
    const detail = isSensitive ? '(값 변경됨)' : `${existing.value} -> ${value}`;
    this.audit.log({
      userId,
      action: 'CONFIG_UPDATE',
      entityType: 'config',
      entityId: key,
      detail,
    });
  }
}
