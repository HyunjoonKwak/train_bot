import { z } from 'zod';
import cron from 'node-cron';

// Common
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Route param helpers
export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const configKeyParamSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, '유효하지 않은 설정 키 형식입니다.'),
});

export const weekPlanParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
  direction: z.enum(['TO_WORK', 'TO_HOME']),
});

// Config
export const updateConfigSchema = z.object({
  value: z.string().min(1).max(500),
});

// Run (manual search)
export const createRunSchema = z.object({
  departureStation: z.string().min(1).default('김천(구미)'),
  arrivalStation: z.string().min(1).default('동탄'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureTimeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  departureTimeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  trainType: z.enum(['SRT', 'KTX', 'ALL']).default('SRT'),
});

// Week plan
export const updateWeekPlanSchema = z.object({
  status: z.enum(['NEEDED', 'BOOKED', 'NOT_NEEDED', 'SEARCHING', 'RECOMMENDED']),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  trainInfo: z.string().optional(),
});

export const bulkUpdateWeekPlanSchema = z.object({
  plans: z.array(z.object({
    planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    direction: z.enum(['TO_WORK', 'TO_HOME']),
    status: z.enum(['NEEDED', 'BOOKED', 'NOT_NEEDED', 'SEARCHING', 'RECOMMENDED']),
    preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })).min(1).max(14),
});

// Schedule
export const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cronExpression: z.string().min(1).refine(
    (val) => cron.validate(val),
    { message: '유효하지 않은 cron 표현식입니다.' }
  ),
  taskType: z.enum(['SEARCH', 'CLEANUP', 'HEALTH_CHECK']),
  taskConfig: z.record(z.unknown()).optional(),
});

export const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cronExpression: z.string().min(1).refine(
    (val) => cron.validate(val),
    { message: '유효하지 않은 cron 표현식입니다.' }
  ).optional(),
  isActive: z.boolean().optional(),
  taskConfig: z.record(z.unknown()).optional(),
});

// User management (admin)
export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});
