'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Database, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SyncResult {
  success: boolean
  message?: string
  error?: string
  summary?: {
    totalProcessed: number
    totalFailed: number
    totalFetched: number
    totalAvailable: number
    newInvoices: number
    updatedInvoices: number
    unchangedInvoices: number
    preservedWorkflowData: number
  }
  errors?: string[]
}

interface SyncDialogProps {
  onSyncComplete?: () => void
}

export function SyncDialog({ onSyncComplete }: SyncDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [progress, setProgress] = useState(0)

  const handleSync = async () => {
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

      const response = await fetch('/api/sync/setup?action=sync', {
        method: 'POST'
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
          Sync Invoices
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Intelligent Invoice Sync
          </DialogTitle>
          <DialogDescription>
            Sync all invoices from MX Merchant while preserving nurse workflow data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>This sync will:</strong></p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Add new invoices with "Pending" status</li>
                  <li>• Update existing invoices while preserving nurse data</li>
                  <li>• Skip unchanged invoices to save time</li>
                  <li>• Never overwrite Data Sent status</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing invoices...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Fetching invoices from MX Merchant and comparing with database...
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
                  {result.success && result.summary && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-green-50 p-3 rounded border">
                          <p className="font-medium text-green-800">🆕 New Invoices</p>
                          <p className="text-xl font-bold text-green-900">{result.summary.newInvoices}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded border">
                          <p className="font-medium text-blue-800">🔄 Updated</p>
                          <p className="text-xl font-bold text-blue-900">{result.summary.updatedInvoices}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded border">
                          <p className="font-medium text-gray-800">✅ Unchanged</p>
                          <p className="text-xl font-bold text-gray-900">{result.summary.unchangedInvoices}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded border">
                          <p className="font-medium text-red-800">❌ Failed</p>
                          <p className="text-xl font-bold text-red-900">{result.summary.totalFailed}</p>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded border">
                        <p className="font-medium text-purple-800">🔒 Workflow Data Preserved</p>
                        <p className="text-sm text-purple-700">
                          {result.summary.preservedWorkflowData} invoices kept their nurse workflow status
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded border">
                        <p className="font-medium text-blue-800">📊 Sync Summary</p>
                        <p className="text-sm text-blue-700">
                          Processed {result.summary.totalFetched} invoices from {result.summary.totalAvailable} available
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

                  {/* Sync Errors */}
                  {result.errors && result.errors.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-red-600 hover:text-red-700">
                        View Sync Errors ({result.errors.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-red-600 text-xs">
                        {result.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </details>
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
            <Button
              onClick={handleSync}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Start Sync
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}