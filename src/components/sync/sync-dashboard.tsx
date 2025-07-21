'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Download, AlertCircle, CheckCircle2, Clock, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatTexasDateTime } from '@/lib/timezone'

interface SyncStatus {
  lastSync: {
    id: string
    sync_type: string
    status: string
    records_processed: number
    records_failed: number
    started_at: string
    completed_at: string | null
    error_message: string | null
  } | null
  totalInvoices: number
  invoicesWithProducts: number
  pendingProductSync: number
}

interface SyncDashboardProps {
  onSyncComplete?: () => void
}

export function SyncDashboard({ onSyncComplete }: SyncDashboardProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    type: string
    message: string
    progress?: number
  } | null>(null)

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync')
      const result = await response.json()
      
      if (result.success) {
        setSyncStatus(result.data)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Start sync process
  const startSync = async (type: 'initial' | 'manual' | 'products') => {
    setIsSyncing(true)
    setSyncProgress({ type, message: 'Starting sync...' })

    try {
      const url = type === 'products' && syncStatus?.pendingProductSync 
        ? `/api/sync?type=products&invoiceIds=${Array.from({length: Math.min(10, syncStatus.pendingProductSync)}, (_, i) => i + 1).join(',')}`
        : `/api/sync?type=${type}`

      const response = await fetch(url, { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setSyncProgress({ 
          type, 
          message: result.message,
          progress: 100 
        })
        
        // Refresh sync status
        await fetchSyncStatus()
        
        // Notify parent component
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else {
        setSyncProgress({ 
          type, 
          message: `Sync failed: ${result.errors?.[0] || 'Unknown error'}` 
        })
      }
    } catch (error) {
      setSyncProgress({ 
        type, 
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsSyncing(false)
      
      // Clear progress after 3 seconds
      setTimeout(() => setSyncProgress(null), 3000)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Sync Status
        </CardTitle>
        <CardDescription>
          Manage synchronization between MX Merchant API and your database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Invoices</p>
                <p className="text-2xl font-bold text-blue-900">{syncStatus?.totalInvoices || 0}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">With Products</p>
                <p className="text-2xl font-bold text-green-900">{syncStatus?.invoicesWithProducts || 0}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Pending Products</p>
                <p className="text-2xl font-bold text-orange-900">{syncStatus?.pendingProductSync || 0}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Last Sync Status */}
        {syncStatus?.lastSync && (
          <div className="space-y-3">
            <h4 className="font-medium">Last Sync</h4>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {syncStatus.lastSync.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : syncStatus.lastSync.status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                  <Badge variant={
                    syncStatus.lastSync.status === 'completed' ? 'default' : 
                    syncStatus.lastSync.status === 'failed' ? 'destructive' : 'secondary'
                  }>
                    {syncStatus.lastSync.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {syncStatus.lastSync.sync_type} sync • {syncStatus.lastSync.records_processed} processed
                  {syncStatus.lastSync.records_failed > 0 && (
                    <span className="text-red-600"> • {syncStatus.lastSync.records_failed} failed</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {formatTexasDateTime(syncStatus.lastSync.started_at)}
              </div>
            </div>
            
            {syncStatus.lastSync.error_message && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {syncStatus.lastSync.error_message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Sync Progress */}
        {syncProgress && (
          <Alert>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <AlertDescription>
              <div className="space-y-2">
                <div>{syncProgress.message}</div>
                {syncProgress.progress !== undefined && (
                  <Progress value={syncProgress.progress} className="w-full" />
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Actions */}
        <div className="space-y-3">
          <h4 className="font-medium">Sync Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => startSync('manual')}
              disabled={isSyncing}
              variant="default"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Sync All Invoices
            </Button>
            
            {syncStatus && syncStatus.pendingProductSync > 0 && (
              <Button
                onClick={() => startSync('products')}
                disabled={isSyncing}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Sync Products ({Math.min(10, syncStatus.pendingProductSync)})
              </Button>
            )}
            
            <Button
              onClick={fetchSyncStatus}
              disabled={isSyncing}
              variant="ghost"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Sync Strategy Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Two-Step Sync Strategy:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <strong>Step 1</strong>: Sync all invoices (basic data only) - Fast</li>
                <li>• <strong>Step 2</strong>: Sync product details (on-demand) - Slower, requires additional API calls</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}