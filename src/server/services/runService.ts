import { RunRepository } from '../repositories/runRepository.js';
import { TrainApiClient } from '../infrastructure/external/trainApiClient.js';
import { ScoringService } from './scoringService.js';
import { ConfigService } from './configService.js';
import { AuditService } from './auditService.js';
import { logger } from '../utils/logger.js';
import type { TrainResult, Recommendation } from '../types/index.js';

export class RunService {
  private runRepo: RunRepository;
  private trainApi: TrainApiClient;
  private scoring: ScoringService;
  private config: ConfigService;
  private audit: AuditService;

  constructor() {
    this.runRepo = new RunRepository();
    this.trainApi = new TrainApiClient();
    this.scoring = new ScoringService();
    this.config = new ConfigService();
    this.audit = new AuditService();
  }

  async executeSearch(params: {
    type: string;
    departureStation: string;
    arrivalStation: string;
    departureDate: string;
    departureTimeFrom?: string;
    departureTimeTo?: string;
    trainType?: string;
    userId?: number;
  }): Promise<{ runId: number; results: TrainResult[]; recommendations: Recommendation[] }> {
    // Create run record
    const runId = this.runRepo.create({
      type: params.type,
      departureStation: params.departureStation,
      arrivalStation: params.arrivalStation,
      departureDate: params.departureDate,
      departureTimeFrom: params.departureTimeFrom,
      departureTimeTo: params.departureTimeTo,
      trainType: params.trainType,
      createdBy: params.userId,
    });

    this.runRepo.updateStatus(runId, 'RUNNING');
    logger.info(`Run ${runId} started`, { params });

    try {
      // Execute search
      const results = await this.trainApi.search({
        departureStation: params.departureStation,
        arrivalStation: params.arrivalStation,
        departureDate: params.departureDate,
        departureTimeFrom: params.departureTimeFrom,
        departureTimeTo: params.departureTimeTo,
        trainType: params.trainType,
      });

      // Score and rank results
      const preferredTrainType = this.config.getValue('preferred_train_type', 'SRT');
      const recommendations = this.scoring.score(results, params.departureTimeFrom, preferredTrainType);

      // Update run with results
      const topResults = recommendations.slice(0, 3);
      this.runRepo.updateStatus(runId, 'SUCCESS', {
        resultCount: results.length,
        resultSummary: JSON.stringify(topResults),
      });

      this.audit.log({
        userId: params.userId,
        action: 'RUN_EXECUTE',
        entityType: 'run',
        entityId: String(runId),
        detail: `Found ${results.length} results`,
      });

      logger.info(`Run ${runId} completed: ${results.length} results`);
      return { runId, results, recommendations };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.runRepo.updateStatus(runId, 'FAIL', { errorMessage: message });
      logger.error(`Run ${runId} failed`, { error: err });
      throw err;
    }
  }

  getById(id: number) {
    return this.runRepo.findById(id);
  }

  getAll(options: { page: number; limit: number; status?: string }) {
    return this.runRepo.findAll(options);
  }

  getRecent(limit: number = 10) {
    return this.runRepo.findRecent(limit);
  }

  getTodayStats() {
    const { total, success, fail } = this.runRepo.countTodayByStatus();
    return {
      total,
      success,
      fail,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }

  cleanup(retentionDays: number = 30): number {
    return this.runRepo.deleteOlderThan(retentionDays);
  }
}
