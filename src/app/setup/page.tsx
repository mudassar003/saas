'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Database, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function SetupPage() {
  const [isSetup, setIsSetup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [syncStatus, setSyncStatus] = useState<Record<string, unknown> | null>(null)
  const [syncProgress, setSyncProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    processed: number;
    failed: number;
    isActive: boolean;
  } | null>(null)

  const handleSetup = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      console.log('Starting setup...')
      const response = await fetch('/api/sync/setup?action=setup', {
        method: 'POST'
      })
      
      console.log('Setup response status:', response.status)
      const data = await response.json()
      console.log('Setup response data:', data)
      
      setResult(data)
      
      if (data.success) {
        setIsSetup(true)
      }
    } catch (error) {
      console.error('Setup error:', error)
      setResult({ 
        success: false,
        error: 'Failed to setup', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    setResult(null)
    setSyncProgress({
      currentBatch: 0,
      totalBatches: 0,
      processed: 0,
      failed: 0,
      isActive: true
    })
    
    try {
      const response = await fetch('/api/sync/setup?action=sync', {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        // Update final progress
        setSyncProgress(prev => prev ? {
          ...prev,
          processed: data.summary?.totalProcessed || data.totalProcessed,
          failed: data.summary?.totalFailed || data.totalFailed || 0,
          isActive: false
        } : null)
        
        // Fetch sync status
        fetchSyncStatus()
      }
    } catch (error) {
      setResult({ error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' })
      setSyncProgress(prev => prev ? { ...prev, isActive: false } : null)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/setup')
      const data = await response.json()
      
      if (data.success) {
        setSyncStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Database Setup & Sync</h1>
        <p className="text-muted-foreground">
          Set up your database and sync invoices from MX Merchant. The &quot;Data Sent&quot; column will show &quot;Select&quot; by default for nurse workflow tracking.
        </p>
      </div>

      {/* Setup Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step 1: Database Setup
          </CardTitle>
        <CardDescription>
            Test database connection and verify MX Merchant credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSetup}
            disabled={isLoading || isSetup}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : isSetup ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {isSetup ? 'Setup Complete' : 'Setup Database'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Step 2: Sync Invoices
          </CardTitle>
          <CardDescription>
            Intelligently sync invoices from MX Merchant API. New invoices default to &quot;Pending&quot;, existing invoices preserve nurse workflow data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSync}
            disabled={isLoading || !isSetup}
            className="w-full"
            variant={isSetup ? 'default' : 'secondary'}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Invoice Sync
          </Button>
          
          {/* Progress Display */}
          {syncProgress && syncProgress.isActive && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing invoices...</span>
                <span>{syncProgress.processed} processed, {syncProgress.failed} failed</span>
              </div>
              <Progress value={isLoading ? 50 : 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Intelligently syncing invoices - preserving nurse workflow data for existing records
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{result.message || result.error}</p>
              
              {/* Success details */}
              {result.success && (result.totalProcessed || result.summary) && (
                <div className="space-y-2">
                  {/* Enhanced sync statistics */}
                  {result.summary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-green-50 p-3 rounded">
                        <p className="font-medium text-green-800">🆕 New Invoices</p>
                        <p className="text-2xl font-bold text-green-900">{result.summary.newInvoices}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="font-medium text-blue-800">🔄 Updated</p>
                        <p className="text-2xl font-bold text-blue-900">{result.summary.updatedInvoices}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="font-medium text-gray-800">✅ Unchanged</p>
                        <p className="text-2xl font-bold text-gray-900">{result.summary.unchangedInvoices}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <p className="font-medium text-red-800">❌ Failed</p>
                        <p className="text-2xl font-bold text-red-900">{result.summary.totalFailed || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-50 p-3 rounded">
                        <p className="font-medium text-green-800">✅ Successfully Added</p>
                        <p className="text-2xl font-bold text-green-900">{result.totalProcessed}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <p className="font-medium text-red-800">❌ Failed</p>
                        <p className="text-2xl font-bold text-red-900">{result.totalFailed || 0}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Intelligent sync details */}
                  {result.summary && (
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="font-medium text-purple-800">🔒 Workflow Data Preserved</p>
                      <p className="text-sm text-purple-700">
                        {result.summary.preservedWorkflowData} invoices kept their nurse workflow status
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-800">📊 Sync Summary</p>
                    <p className="text-sm text-blue-700">
                      Fetched: {result.summary?.totalFetched || result.totalFetched || result.totalProcessed + (result.totalFailed || 0)} invoices
                      {(result.summary?.totalAvailable || result.totalAvailable) && ` • Available: ${result.summary?.totalAvailable || result.totalAvailable} invoices`}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Error details */}
              {!result.success && result.details && (
                <div className="text-sm space-y-2">
                  <details className="cursor-pointer">
                    <summary className="font-medium text-red-600">View Error Details</summary>
                    <div className="mt-2 p-2 bg-red-50 rounded border">
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {typeof result.details === 'string' 
                          ? result.details 
                          : JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
              
              {/* Sync errors */}
              {result.errors && result.errors.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-600">View Sync Errors</summary>
                  <ul className="mt-2 space-y-1 text-red-600">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Database Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Database Status</CardTitle>
            <CardDescription>
              Current state of invoices in your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-600">Total Invoices</p>
                <p className="text-3xl font-bold text-blue-900">{syncStatus.totalInvoices}</p>
                <p className="text-xs text-blue-600">Records in database</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                <p className="text-sm font-medium text-orange-600">Pending</p>
                <p className="text-3xl font-bold text-orange-900">{syncStatus.pendingCount}</p>
                <p className="text-xs text-orange-600">Awaiting nurse action</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-600">Data Sent</p>
                <p className="text-3xl font-bold text-green-900">{syncStatus.yesCount}</p>
                <p className="text-xs text-green-600">Patient data sent</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                <p className="text-sm font-medium text-red-600">Not Sent</p>
                <p className="text-3xl font-bold text-red-900">{syncStatus.noCount}</p>
                <p className="text-xs text-red-600">No patient data</p>
              </div>
            </div>
            
            {syncStatus.lastSync && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Last Database Update:</p>
                <p className="text-sm text-gray-600">
                  {new Date(syncStatus.lastSync).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {syncStatus && syncStatus.totalInvoices > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Success!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>Your database is now populated with {syncStatus.totalInvoices} invoices!</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={fetchSyncStatus} 
                  variant="outline" 
                  className="w-full"
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}