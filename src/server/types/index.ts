// User roles
export type UserRole = 'ADMIN' | 'MEMBER';

// Session user
export interface SessionUser {
  id: number;
  kakaoId: string;
  nickname: string;
  profileImage: string | null;
  role: UserRole;
}

// Run types
export type RunType = 'MANUAL' | 'SCHEDULED' | 'AUTO';
export type RunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAIL' | 'CANCELLED';

// Week plan
export type PlanDirection = 'TO_WORK' | 'TO_HOME';
export type PlanStatus = 'NEEDED' | 'BOOKED' | 'NOT_NEEDED' | 'SEARCHING' | 'RECOMMENDED';

// Schedule
export type TaskType = 'SEARCH' | 'CLEANUP' | 'HEALTH_CHECK';

// API response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Config
export interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
}

// Train search result
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

// Audit log
export interface AuditLogEntry {
  userId: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  ipAddress?: string;
}
