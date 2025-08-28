'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Database, CheckCircle2, AlertCircle } from 'lucide-react'

interface SyncResult {
  success: boolean
  message?: string
  error?: string
  stats?: {
    transactionsSynced: number
    invoicesLinked: number
    transactionsWithProducts: number
    transactionsLinkedToInvoices: number
    apiCalls: number
    efficiency: string
  }
}

interface SyncDialogProps {
  onSyncComplete?: () => void
}

export function SyncDialog({ onSyncComplete }: SyncDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [transactionCount, setTransactionCount] = useState<number>(50)
  const [dateFilter, setDateFilter] = useState<string>('')
  const [emergencyMode, setEmergencyMode] = useState<boolean>(false)

  const handleSync = async () => {
    if (!transactionCount || transactionCount < 1 || transactionCount > 1000) {
      setResult({
        success: false,
        error: 'Please enter a valid number between 1 and 1000'
      })
      return
    }

    setIsLoading(true)
    setResult(null)
    setProgress(0)

    try {
      // Simulate progress during sync
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 500)

      const queryParams = new URLSearchParams({
        count: transactionCount.toString()
      })
      
      if (dateFilter) {
        queryParams.append('date', dateFilter)
      }

      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionCount: transactionCount,
          dateFilter: dateFilter || undefined
        })
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)

      if (data.success && onSyncComplete) {
        // Delay callback to show results briefly
        setTimeout(() => {
          onSyncComplete()
        }, 2000)
      }

    } catch (error) {
      setResult({
        success: false,
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetDialog = () => {
    setResult(null)
    setProgress(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        resetDialog()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="h-4 w-4 mr-2" />
          Sync Latest Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync Latest Data
          </DialogTitle>
          <DialogDescription>
            Fetch recent transactions, then automatically fetch related invoices and map products
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Emergency Mode Toggle */}
          {!result && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  id="emergencyMode"
                  type="checkbox"
                  checked={emergencyMode}
                  onChange={(e) => setEmergencyMode(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="emergencyMode" className="text-sm font-medium">
                  Emergency Mode (with date filter)
                </label>
              </div>
              
              {/* Transaction Count Input */}
              <div className="space-y-2">
                <label htmlFor="transactionCount" className="text-sm font-medium">
                  Number of transactions to fetch
                </label>
                <Input
                  id="transactionCount"
                  type="number"
                  min={1}
                  max={emergencyMode ? 1000 : 100}
                  value={transactionCount}
                  onChange={(e) => setTransactionCount(parseInt(e.target.value) || 50)}
                  placeholder={emergencyMode ? "1000" : "50"}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {emergencyMode 
                    ? "Emergency: Up to 1000 transactions" 
                    : "Normal: Up to 100 recent transactions (webhook handles real-time)"
                  }
                </p>
              </div>

              {/* Date Filter (Emergency Mode Only) */}
              {emergencyMode && (
                <div className="space-y-2">
                  <label htmlFor="dateFilter" className="text-sm font-medium">
                    Filter by date (optional)
                  </label>
                  <Input
                    id="dateFilter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for all transactions, or select specific date
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing {transactionCount} transactions...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Fetching transactions → Extracting invoice IDs → Fetching invoices → Mapping products...
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium">{result.message || result.error}</p>
                  
                  {/* Success Statistics */}
                  {result.success && result.stats && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded border">
                          <p className="font-medium text-blue-800">💳 Transactions</p>
                          <p className="text-xl font-bold text-blue-900">{result.stats.transactionsSynced}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded border">
                          <p className="font-medium text-green-800">🔗 Invoices Linked</p>
                          <p className="text-xl font-bold text-green-900">{result.stats.invoicesLinked}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border text-center">
                        <p className="text-sm text-gray-600">⚡ API Efficiency</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {result.stats.apiCalls} calls • {result.stats.efficiency}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {!result.success && result.message && (
                    <div className="text-sm">
                      <p className="text-red-600">{result.message}</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {result?.success ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button
                onClick={handleSync}
                disabled={isLoading || !transactionCount || transactionCount < 1 || transactionCount > 1000}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Sync {transactionCount} Transactions
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}