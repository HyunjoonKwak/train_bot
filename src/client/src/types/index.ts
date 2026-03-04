// User
export type UserRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: number;
  kakaoId: string;
  nickname: string;
  profileImage: string | null;
  role: UserRole;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Run
export type RunType = 'MANUAL' | 'SCHEDULED' | 'AUTO';
export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAIL' | 'CANCELLED';

export interface Run {
  id: number;
  type: RunType;
  status: RunStatus;
  departureStation: string;
  arrivalStation: string;
  departureDate: string;
  departureTimeFrom?: string;
  departureTimeTo?: string;
  trainType?: string;
  resultCount: number;
  resultSummary?: string;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

// Week Plan
export type PlanDirection = 'TO_WORK' | 'TO_HOME';
export type PlanStatus = 'NEEDED' | 'BOOKED' | 'NOT_NEEDED' | 'SEARCHING' | 'RECOMMENDED';

export interface WeekPlan {
  id: number;
  userId: number;
  planDate: string;
  direction: PlanDirection;
  status: PlanStatus;
  preferredTime?: string;
  trainInfo?: string;
  recommendation?: string;
}

// Train Result
export interface TrainResult {
  trainType: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  seatAvailable: boolean;
  isDirect: boolean;
}

// Recommendation
export interface Recommendation {
  train: TrainResult;
  score: number;
  reason: string;
}

// Config
export interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
}

// Schedule
export type TaskType = 'SEARCH' | 'CLEANUP' | 'HEALTH_CHECK';

export interface Schedule {
  id: number;
  name: string;
  cronExpression: string;
  isActive: boolean;
  taskType: TaskType;
  taskConfig?: Record<string, unknown>;
  lastRunAt?: string;
  nextRunAt?: string;
}

// Audit Log
export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
}
