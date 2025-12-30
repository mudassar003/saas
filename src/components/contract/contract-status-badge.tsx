/**
 * Contract Status Badge Component
 *
 * Displays contract status with color-coded badges for business intelligence:
 * - Active (Green): Future revenue - used in projections
 * - Completed (Blue): Historical revenue - actual earned
 * - Cancelled (Red): Churn tracking - retention analysis
 * - Inactive (Gray): Paused/suspended - potential reactivation
 *
 * @module components/contract/contract-status-badge
 */

import { type ContractStatus } from '@/types/contract';
import { cn } from '@/lib/utils';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  className?: string;
  showIcon?: boolean;
}

/**
 * Status configuration with colors, icons, and business context
 */
const STATUS_CONFIG: Record<
  ContractStatus,
  {
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: string;
    description: string;
  }
> = {
  Active: {
    label: 'Active',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: '●',
    description: 'Future revenue (projections)',
  },
  Completed: {
    label: 'Completed',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: '✓',
    description: 'Historical revenue (actual)',
  },
  Cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: '✕',
    description: 'Churn tracking',
  },
  Inactive: {
    label: 'Inactive',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    textColor: 'text-gray-700 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-800',
    icon: '○',
    description: 'Paused/suspended',
  },
};

export function ContractStatusBadge({
  status,
  className,
  showIcon = true,
}: ContractStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    // Fallback for unknown statuses
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border',
          'bg-gray-50 dark:bg-gray-900/20',
          'text-gray-700 dark:text-gray-400',
          'border-gray-200 dark:border-gray-800',
          className
        )}
        title={`Status: ${status}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
      title={`${config.label}: ${config.description}`}
    >
      {showIcon && <span className="text-xs">{config.icon}</span>}
      {config.label}
    </span>
  );
}

/**
 * Status filter chip for UI filters
 */
export function ContractStatusFilterChip({
  status,
  count,
  active,
  onClick,
}: {
  status: ContractStatus | 'all';
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  if (status === 'all') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
          active
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-foreground border-border hover:bg-accent'
        )}
      >
        All Contracts
        {count !== undefined && (
          <span className="text-xs opacity-70">({count})</span>
        )}
      </button>
    );
  }

  const config = STATUS_CONFIG[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
        active
          ? cn(config.bgColor, config.textColor, config.borderColor)
          : 'bg-background text-muted-foreground border-border hover:bg-accent'
      )}
    >
      <span>{config.icon}</span>
      {config.label}
      {count !== undefined && (
        <span className="text-xs opacity-70">({count})</span>
      )}
    </button>
  );
}
