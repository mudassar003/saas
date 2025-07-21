'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toTexasTime } from '@/lib/timezone';

interface AutoSyncHeaderProps {
  className?: string;
}

export function AutoSyncHeader({ className }: AutoSyncHeaderProps) {
  const [lastSync, setLastSync] = useState<{
    status: string;
    created_at: string;
    records_processed: number;
  } | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const getHoursUntilNext = (nextRunTime: string): number => {
    const now = new Date();
    const nextRun = new Date(nextRunTime);
    const diffMs = nextRun.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours and round up
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sync/logs?limit=1&type=scheduled');
      const data = await response.json();
      
      if (data.success) {
        setIsEnabled(data.autoSyncStatus?.enabled || false);
        if (data.latestAutoSync) {
          setLastSync(data.latestAutoSync);
          setNextRun(data.autoSyncStatus?.nextExpectedRun || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Auto-sync: Loading...</span>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <XCircle className="h-3 w-3 text-gray-400" />
        <span>Auto-sync: Disabled</span>
      </div>
    );
  }

  if (!lastSync) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Clock className="h-3 w-3 text-blue-500" />
        <span>Auto-sync: Enabled (Daily at midnight)</span>
        {nextRun && (
          <span>• Will run in {getHoursUntilNext(nextRun)} hours</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-1">
        {getStatusIcon(lastSync.status)}
        <span className="text-muted-foreground">Auto-sync:</span>
        <Badge variant={lastSync.status === 'completed' ? 'default' : 'destructive'} className="text-xs py-0 px-1">
          {lastSync.status}
        </Badge>
      </div>
      
      {nextRun && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>•</span>
          <span>Will run in {getHoursUntilNext(nextRun)} hours</span>
        </div>
      )}
    </div>
  );
}