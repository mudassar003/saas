import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive?: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

/**
 * Metric Card Component
 *
 * Displays a single KPI metric with optional icon and trend indicator
 * Used for dashboard analytics and statistics
 *
 * @example
 * <MetricCard
 *   label="Total Transactions"
 *   value="1,234"
 *   icon={CreditCard}
 *   trend={{ value: "+12%", positive: true }}
 *   variant="default"
 * />
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className
}: MetricCardProps) {
  // Variant styles
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    error: 'border-error/20 bg-error/5',
    info: 'border-info/20 bg-info/5',
  };

  const iconStyles = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-foreground">
              {value}
            </p>
            {trend && (
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.positive ? 'text-success' : 'text-error'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className={cn('rounded-full p-2 bg-muted/50', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Metrics Grid Component
 *
 * Container for multiple metric cards with responsive grid layout
 *
 * @example
 * <MetricsGrid>
 *   <MetricCard ... />
 *   <MetricCard ... />
 *   <MetricCard ... />
 * </MetricsGrid>
 */
export function MetricsGrid({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6',
        className
      )}
    >
      {children}
    </div>
  );
}
