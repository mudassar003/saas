import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Page Header Component
 *
 * Modern page header with title, optional description, and action buttons
 * Used at the top of all main pages for consistent branding
 *
 * @example
 * <PageHeader
 *   title="Patient Census Dashboard"
 *   description="Monitor patient transactions and treatment categories"
 *   actions={<SyncButton />}
 * />
 */
export function PageHeader({
  title,
  description,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between gap-4">
        {/* Title and description */}
        <div className="flex-1 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* Action buttons */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
