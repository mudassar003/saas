'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sync/logs?limit=1&type=incremental');
      const data = await response.json();
      
      if (data.success && data.latestAutoSync) {
        setLastSync(data.latestAutoSync);
        setNextRun(data.autoSyncStatus?.nextExpectedRun || null);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
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

  if (!lastSync) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Clock className="h-3 w-3" />
        <span>Auto-sync: Waiting...</span>
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
      
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>{lastSync.records_processed} synced</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(lastSync.created_at), { addSuffix: true })}</span>
      </div>
      
      {nextRun && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>•</span>
          <span>Next: {formatDistanceToNow(new Date(nextRun), { addSuffix: true })}</span>
        </div>
      )}
    </div>
  );
}