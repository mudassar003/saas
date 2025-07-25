'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';

interface AutoSyncHeaderProps {
  className?: string;
}

interface LastSyncData {
  created_at: string;
  records_processed: number;
}

export function AutoSyncHeader({ className }: AutoSyncHeaderProps) {
  const [lastSync, setLastSync] = useState<LastSyncData | null>(null);
  const [loading, setLoading] = useState(true);

  const getMinutesAgo = (dateString: string): string => {
    const now = new Date();
    const syncTime = new Date(dateString);
    const diffMs = now.getTime() - syncTime.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const fetchLastSync = async () => {
    try {
      const response = await fetch('/api/sync/logs?limit=1&type=scheduled');
      const data = await response.json();
      
      if (data.success && data.latestAutoSync) {
        setLastSync({
          created_at: data.latestAutoSync.created_at,
          records_processed: data.latestAutoSync.records_processed || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastSync();
    const interval = setInterval(fetchLastSync, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Checking sync status...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs whitespace-nowrap ${className}`}>
      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
      <span className="text-gray-700 font-medium">Auto-sync</span>
      <span className="text-green-600 font-medium">Active</span>
      {lastSync && (
        <>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500">Last: {getMinutesAgo(lastSync.created_at)}</span>
        </>
      )}
    </div>
  );
}