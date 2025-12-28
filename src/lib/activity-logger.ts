/**
 * Activity Logger
 * Tracks admin actions for audit purposes
 * Uses localStorage for client-side logging (replace with database in production)
 */

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  details?: string;
  ipAddress?: string;
}

const STORAGE_KEY = 'admin_activity_logs';
const MAX_LOGS = 1000; // Keep last 1000 logs

/**
 * Log an activity
 */
export function logActivity(params: Omit<ActivityLog, 'id' | 'timestamp'>): void {
  try {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...params,
    };

    const logs = getLogs();
    logs.unshift(log);

    // Keep only the most recent logs
    const trimmedLogs = logs.slice(0, MAX_LOGS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLogs));

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Activity]', log);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Get all activity logs
 */
export function getLogs(limit?: number): ActivityLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const logs: ActivityLog[] = JSON.parse(stored);
    return limit ? logs.slice(0, limit) : logs;
  } catch (error) {
    console.error('Failed to get activity logs:', error);
    return [];
  }
}

/**
 * Get logs for a specific user
 */
export function getUserLogs(userId: string, limit?: number): ActivityLog[] {
  const logs = getLogs();
  const userLogs = logs.filter((log) => log.userId === userId);
  return limit ? userLogs.slice(0, limit) : userLogs;
}

/**
 * Get logs for a specific resource
 */
export function getResourceLogs(
  resource: string,
  resourceId?: string | number,
  limit?: number
): ActivityLog[] {
  const logs = getLogs();
  const resourceLogs = logs.filter(
    (log) =>
      log.resource === resource &&
      (resourceId === undefined || log.resourceId === resourceId)
  );
  return limit ? resourceLogs.slice(0, limit) : resourceLogs;
}

/**
 * Get recent logs (last N logs)
 */
export function getRecentLogs(limit = 50): ActivityLog[] {
  return getLogs(limit);
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear activity logs:', error);
  }
}

/**
 * Common activity helpers
 */
export const ActivityActions = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  EXPORT: 'export',
  LOGIN: 'login',
  LOGOUT: 'logout',
  RESET_PASSWORD: 'reset_password',
} as const;

export const ActivityResources = {
  USER: 'user',
  TENANT: 'tenant',
  MERCHANT: 'merchant',
  CATEGORY: 'category',
  TRANSACTION: 'transaction',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
} as const;

/**
 * Helper to log common admin actions
 */
export function logAdminAction(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  resourceId?: string | number,
  details?: string
): void {
  logActivity({
    userId,
    userEmail,
    action,
    resource,
    resourceId,
    details,
  });
}
