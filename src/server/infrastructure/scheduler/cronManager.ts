import cron from 'node-cron';
import { ScheduleService } from '../../services/scheduleService.js';
import { RunService } from '../../services/runService.js';
import { WeekPlanService } from '../../services/weekPlanService.js';
import { TelegramClient } from '../external/telegramClient.js';
import { AuditService } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';

export class CronManager {
  private static instance: CronManager | null = null;
  private jobs: Map<number, cron.ScheduledTask> = new Map();
  private scheduleService: ScheduleService;
  private runService: RunService;
  private weekPlanService: WeekPlanService;
  private telegram: TelegramClient;
  private auditService: AuditService;

  private constructor() {
    this.scheduleService = new ScheduleService();
    this.runService = new RunService();
    this.weekPlanService = new WeekPlanService();
    this.telegram = new TelegramClient();
    this.auditService = new AuditService();
  }

  static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  static destroy(): void {
    if (CronManager.instance) {
      CronManager.instance.stop();
      CronManager.instance = null;
    }
  }

  start(): void {
    const activeSchedules = this.scheduleService.getActive();
    for (const schedule of activeSchedules) {
      this.addJob(schedule.id, schedule.cron_expression, schedule.task_type, schedule.task_config);
    }
    logger.info(`CronManager started with ${activeSchedules.length} jobs`);
  }

  stop(): void {
    for (const [id, task] of this.jobs) {
      task.stop();
      logger.info(`Stopped cron job ${id}`);
    }
    this.jobs.clear();
  }

  addJob(id: number, cronExpression: string, taskType: string, taskConfig: string | null): void {
    if (!cron.validate(cronExpression)) {
      logger.error(`Invalid cron expression for schedule ${id}: ${cronExpression}`);
      return;
    }

    // Remove existing job if any
    this.removeJob(id);

    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Executing scheduled task ${id} (${taskType})`);
      try {
        await this.executeTask(id, taskType, taskConfig);
        this.scheduleService.markRun(id);
      } catch (err) {
        logger.error(`Scheduled task ${id} failed`, { error: err });
      }
    });

    this.jobs.set(id, task);
    logger.info(`Added cron job ${id}: ${cronExpression} (${taskType})`);
  }

  removeJob(id: number): void {
    const existing = this.jobs.get(id);
    if (existing) {
      existing.stop();
      this.jobs.delete(id);
    }
  }

  private async executeTask(scheduleId: number, taskType: string, taskConfig: string | null): Promise<void> {
    let config: Record<string, unknown> = {};
    if (taskConfig) {
      try {
        config = JSON.parse(taskConfig);
      } catch (err) {
        logger.error(`Invalid JSON in taskConfig for schedule ${scheduleId}`, { error: err });
        return;
      }
    }

    switch (taskType) {
      case 'SEARCH': {
        const plans = this.weekPlanService.findNeedingSearch();
        for (const plan of plans) {
          try {
            const result = await this.runService.executeSearch({
              type: 'SCHEDULED',
              departureStation: (config.departureStation as string) ?? '김천(구미)',
              arrivalStation: (config.arrivalStation as string) ?? '동탄',
              departureDate: plan.plan_date,
              departureTimeFrom: plan.preferred_time ?? undefined,
              trainType: (config.trainType as string) ?? 'SRT',
            });

            if (result.recommendations.length > 0) {
              const topRec = result.recommendations[0];
              this.weekPlanService.updateWithRecommendation(
                plan.id,
                JSON.stringify(topRec),
              );

              const message = this.telegram.formatTrainResults(
                result.results.slice(0, 5),
                plan.plan_date,
              );
              await this.telegram.sendMessage(message);
            }
          } catch (err) {
            logger.error(`Search failed for plan ${plan.id}`, { error: err });
          }
        }
        break;
      }
      case 'CLEANUP': {
        const runDays = (config.runRetentionDays as number) ?? 30;
        const auditDays = (config.auditRetentionDays as number) ?? 90;
        this.runService.cleanup(runDays);
        this.auditService.cleanup(auditDays);
        logger.info('Cleanup task completed');
        break;
      }
      case 'HEALTH_CHECK': {
        const message = `TrainBot 상태 정상\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
        await this.telegram.sendMessage(message, false);
        break;
      }
      default:
        logger.warn(`Unknown task type "${taskType}" for schedule ${scheduleId}`);
    }
  }
}
