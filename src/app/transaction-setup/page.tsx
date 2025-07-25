'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CreditCard, Play, CheckCircle2, AlertCircle, RefreshCw, Database, Link } from 'lucide-react'
// Unused import removed

interface TransactionSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  summary?: {
    totalInvoicesProcessed?: number;
    totalTransactionsProcessed?: number;
    totalProcessed?: number;
    totalFailed?: number;
    syncType?: string;
  };
  errors?: string[];
  syncLogId?: string;
}

interface TransactionSyncStatus {
  success: boolean;
  data?: {
    totalInvoices: number;
    totalTransactions: number;
    transactionsWithInvoices: number;
    standaloneTransactions: number;
    approvedTransactions: number;
    declinedTransactions: number;
    lastSync?: {
      id: string;
      sync_type: string;
      status: string;
      started_at: string;
      completed_at?: string;
      records_processed: number;
      transactions_processed: number;
    };
    dataCompleteness: {
      invoiceCoverage: number;
      transactionCoverage: number;
      missingTransactions: number;
    };
  };
}

export default function TransactionSetupPage() {
  const [currentStep, setCurrentStep] = useState<'check' | 'sync' | 'complete'>('check')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<TransactionSyncResult | null>(null)
  const [syncStatus, setSyncStatus] = useState<TransactionSyncStatus | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [syncProgress, setSyncProgress] = useState<{
    currentPhase: string;
    processed: number;
    failed: number;
    isActive: boolean;
  } | null>(null)

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    try {
      addLog('Fetching current sync status...')
      const response = await fetch('/api/sync/transactions')
      const data = await response.json()
      
      if (data.success) {
        setSyncStatus(data as TransactionSyncStatus)
        addLog(`Status fetched: ${data.data?.totalTransactions || 0} transactions, ${data.data?.totalInvoices || 0} invoices`)
      } else {
        addLog(`❌ Failed to fetch status: ${data.error}`)
      }
    } catch (error) {
      addLog(`❌ Error fetching sync status: ${error}`)
    }
  }, [addLog])

  const handleCheckStatus = async () => {
    setIsLoading(true)
    setResult(null)
    setLogs([])
    
    try {
      addLog('🔍 Checking current database state...')
      await fetchSyncStatus()
      setCurrentStep('sync')
      addLog('✅ Status check complete - ready to sync transactions')
    } catch (error) {
      addLog(`❌ Status check failed: ${error}`)
      setResult({ 
        success: false,
        error: 'Failed to check status', 
        summary: { totalFailed: 1 }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncTransactions = async (syncType: 'transactions' | 'combined' | 'invoices') => {
    setIsLoading(true)
    setResult(null)
    setSyncProgress({
      currentPhase: `Starting ${syncType} sync`,
      processed: 0,
      failed: 0,
      isActive: true
    })
    
    try {
      addLog(`🚀 Starting ${syncType} sync...`)
      
      if (syncType === 'combined') {
        addLog('📡 Phase 1: Fetching ALL transactions from MX Merchant Payment API...')
        addLog('📡 Phase 2: Fetching ALL invoices from MX Merchant Invoice API...')
        addLog('🔗 Phase 3: Auto-linking transactions to invoices...')
      } else if (syncType === 'transactions') {
        addLog('📡 Phase 1: Fetching ALL transactions from MX Merchant Payment API...')
        addLog('🔗 Phase 2: Auto-linking transactions to existing invoices...')
      } else {
        addLog('📡 Phase 1: Fetching ALL invoices from MX Merchant Invoice API...')
      }
      
      setSyncProgress(prev => prev ? { ...prev, currentPhase: 'Fetching data from MX Merchant API...' } : null)
      
      const response = await fetch(`/api/sync/transactions?action=${syncType}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data as TransactionSyncResult)
      
      if (data.success) {
        addLog(`✅ ${syncType} sync completed successfully!`)
        
        if (data.summary) {
          if (syncType === 'combined') {
            addLog(`📊 Results: ${data.summary.totalInvoicesProcessed || 0} invoices, ${data.summary.totalTransactionsProcessed || 0} transactions`)
          } else {
            addLog(`📊 Results: ${data.summary.totalProcessed || 0} records processed, ${data.summary.totalFailed || 0} failed`)
          }
        }
        
        setSyncProgress(prev => prev ? {
          ...prev,
          currentPhase: 'Sync completed successfully',
          processed: data.summary?.totalTransactionsProcessed || data.summary?.totalProcessed || 0,
          failed: data.summary?.totalFailed || 0,
          isActive: false
        } : null)
        
        // Fetch updated status
        addLog('📊 Fetching updated database statistics...')
        await fetchSyncStatus()
        setCurrentStep('complete')
        
        addLog('🎉 Transaction sync setup complete!')
      } else {
        addLog(`❌ Sync failed: ${data.error}`)
        setSyncProgress(prev => prev ? { ...prev, isActive: false } : null)
        
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: string, index: number) => {
            if (index < 5) { // Limit to first 5 errors in logs
              addLog(`❌ Error ${index + 1}: ${error}`)
            }
          })
        }
      }
    } catch (error) {
      addLog(`❌ Sync error: ${error}`)
      setResult({ 
        success: false, 
        error: 'Failed to sync transactions', 
        summary: { totalFailed: 1 }
      })
      setSyncProgress(prev => prev ? { ...prev, isActive: false } : null)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch status on component mount
  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Transaction Setup & Sync</h1>
        <p className="text-muted-foreground">
          Set up your database to capture ALL MX Merchant transactions. This will fetch invoice-linked transactions AND standalone transactions (QuickPay, POS, etc.).
        </p>
      </div>

      {/* Current Status Display */}
      {syncStatus?.data && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Database className="h-5 w-5" />
              Current Database State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border-l-4 border-purple-500">
                <p className="text-sm font-medium text-purple-600">Invoices</p>
                <p className="text-2xl font-bold text-purple-900">{syncStatus.data.totalInvoices}</p>
              </div>
              <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-900">{syncStatus.data.totalTransactions}</p>
              </div>
              <div className="bg-white p-3 rounded border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-600">With Invoices</p>
                <p className="text-2xl font-bold text-green-900">{syncStatus.data.transactionsWithInvoices}</p>
              </div>
              <div className="bg-white p-3 rounded border-l-4 border-orange-500">
                <p className="text-sm font-medium text-orange-600">Standalone</p>
                <p className="text-2xl font-bold text-orange-900">{syncStatus.data.standaloneTransactions}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded">
              <p className="text-sm font-medium">Data Completeness</p>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transaction Coverage:</span>
                  <span className="font-bold">{syncStatus.data.dataCompleteness.transactionCoverage.toFixed(1)}%</span>
                </div>
                <Progress value={syncStatus.data.dataCompleteness.transactionCoverage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Check Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Step 1: Check Current State
          </CardTitle>
          <CardDescription>
            Check current database state and verify MX Merchant connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCheckStatus}
            disabled={isLoading}
            className="w-full"
            variant={currentStep === 'check' ? 'default' : 'outline'}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : currentStep !== 'check' ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {currentStep !== 'check' ? 'Status Checked' : 'Check Database Status'}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Sync Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Step 2: Choose Sync Method
          </CardTitle>
          <CardDescription>
            Choose how to populate your database with transaction data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Combined Sync (Recommended) */}
          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-green-800">🎯 Combined Sync (Recommended)</h3>
              <Button 
                onClick={() => handleSyncTransactions('combined')}
                disabled={isLoading || currentStep === 'check'}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Start Combined Sync
              </Button>
            </div>
            <p className="text-sm text-green-700">
              Fetches ALL transactions AND invoices, automatically links them. Best for complete data setup.
            </p>
          </div>

          {/* Transaction Only */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">💳 Transactions Only</h3>
              <Button 
                onClick={() => handleSyncTransactions('transactions')}
                disabled={isLoading || currentStep === 'check'}
                size="sm"
                variant="outline"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Sync Transactions
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Fetches only transaction data, links to existing invoices. Use if you already have invoices.
            </p>
          </div>

          {/* Invoice Only */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">📄 Invoices Only</h3>
              <Button 
                onClick={() => handleSyncTransactions('invoices')}
                disabled={isLoading || currentStep === 'check'}
                size="sm"
                variant="outline"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Sync Invoices
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Fetches only invoice data. Use this if you only need to update existing invoices.
            </p>
          </div>

          {/* Progress Display */}
          {syncProgress && syncProgress.isActive && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-blue-800">Sync in Progress...</span>
                <span className="text-sm text-blue-600">
                  {syncProgress.processed} processed, {syncProgress.failed} failed
                </span>
              </div>
              <Progress value={50} className="h-2 mb-2" />
              <p className="text-sm text-blue-700">{syncProgress.currentPhase}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Developer Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Developer Logs
          </CardTitle>
          <CardDescription>
            Live sync progress and debugging information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click &quot;Check Database Status&quot; to start.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Button 
              onClick={() => setLogs([])} 
              size="sm" 
              variant="outline"
            >
              Clear Logs
            </Button>
            <Button 
              onClick={fetchSyncStatus} 
              size="sm" 
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {result && (
        <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{result.message || result.error || ''}</p>
              
              {/* Success details */}
              {result.success && result.summary && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {result.summary.totalInvoicesProcessed !== undefined && (
                      <div className="bg-purple-50 p-3 rounded">
                        <p className="font-medium text-purple-800">📄 Invoices</p>
                        <p className="text-2xl font-bold text-purple-900">{result.summary.totalInvoicesProcessed}</p>
                      </div>
                    )}
                    {result.summary.totalTransactionsProcessed !== undefined && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="font-medium text-blue-800">💳 Transactions</p>
                        <p className="text-2xl font-bold text-blue-900">{result.summary.totalTransactionsProcessed}</p>
                      </div>
                    )}
                    {result.summary.totalProcessed !== undefined && (
                      <div className="bg-green-50 p-3 rounded">
                        <p className="font-medium text-green-800">✅ Processed</p>
                        <p className="text-2xl font-bold text-green-900">{result.summary.totalProcessed}</p>
                      </div>
                    )}
                    <div className="bg-red-50 p-3 rounded">
                      <p className="font-medium text-red-800">❌ Failed</p>
                      <p className="text-2xl font-bold text-red-900">{result.summary.totalFailed || 0}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error details */}
              {result.errors && result.errors.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-600 font-medium">View Detailed Errors ({result.errors.length})</summary>
                  <ul className="mt-2 space-y-1 text-red-600 max-h-40 overflow-y-auto">
                    {result.errors.map((error: string, index: number) => (
                      <li key={index} className="text-xs">• {error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Next Steps */}
      {currentStep === 'complete' && result?.success && syncStatus?.data && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 Transaction Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-green-600">{syncStatus.data.totalTransactions}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="font-medium text-gray-600">With Invoices</p>
                  <p className="text-2xl font-bold text-blue-600">{syncStatus.data.transactionsWithInvoices}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="font-medium text-gray-600">Standalone</p>
                  <p className="text-2xl font-bold text-orange-600">{syncStatus.data.standaloneTransactions}</p>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <p className="font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {syncStatus.data.dataCompleteness.transactionCoverage.toFixed(0)}%
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className="w-full"
                >
                  <Link className="h-4 w-4 mr-2" />
                  View All Transactions in Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    setCurrentStep('check')
                    setResult(null)
                    setSyncProgress(null)
                    fetchSyncStatus()
                  }} 
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Another Sync
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}