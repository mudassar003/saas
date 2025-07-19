'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  records_processed: number;
  records_failed: number;
  error_message?: string;
  api_calls_made?: number;
  created_at: string;
  updated_at: string;
}

interface AutoSyncStatus {
  enabled: boolean;
  intervalMinutes: number;
  lastRun: string | null;
  nextExpectedRun: string | null;
}

export function AutoSyncMonitor() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/logs?limit=20&type=incremental');
      const data = await response.json();
      
      if (data.success) {
        setSyncLogs(data.syncLogs || []);
        setAutoSyncStatus(data.autoSyncStatus);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    // Refresh every minute to show current status
    const interval = setInterval(fetchSyncStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'started':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : 
                   status === 'failed' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Auto-Sync Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Sync Status
          </CardTitle>
          <CardDescription>
            Automatic invoice synchronization monitoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoSyncStatus && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={autoSyncStatus.enabled ? 'default' : 'secondary'}>
                  {autoSyncStatus.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interval:</span>
                <span className="text-sm">Every {autoSyncStatus.intervalMinutes} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Run:</span>
                <span className="text-sm">
                  {autoSyncStatus.lastRun 
                    ? formatDistanceToNow(new Date(autoSyncStatus.lastRun), { addSuffix: true })
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Expected:</span>
                <span className="text-sm">
                  {autoSyncStatus.nextExpectedRun 
                    ? formatDistanceToNow(new Date(autoSyncStatus.nextExpectedRun), { addSuffix: true })
                    : 'Unknown'
                  }
                </span>
              </div>
            </>
          )}
          <Button 
            onClick={fetchSyncStatus} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Recent Auto-Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Auto-Sync Logs</CardTitle>
          <CardDescription>
            Last 20 automatic synchronization attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No auto-sync logs found. Auto-sync may not have run yet.
            </p>
          ) : (
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <span className="text-sm font-medium">
                          {log.records_processed} processed
                        </span>
                        {log.records_failed > 0 && (
                          <span className="text-sm text-red-500">
                            {log.records_failed} failed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        {log.api_calls_made && ` • ${log.api_calls_made} API calls`}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}