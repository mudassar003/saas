'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, Eye, Activity } from 'lucide-react'
import { getWebhookLogs, clearWebhookLogs } from '@/lib/webhook-debug'

/**
 * TEMPORARY: Webhook Debug Page
 * This entire file can be deleted once production is stable
 */

interface WebhookLog {
  id: string
  timestamp: string
  merchantId: string
  eventType: string
  transactionId: string
  payload: Record<string, unknown>
  processed: boolean
}

export default function WebhookDebugPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const refreshLogs = () => {
    setLogs(getWebhookLogs())
  }

  const handleClearLogs = () => {
    clearWebhookLogs()
    setLogs([])
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'PaymentSuccess': return 'bg-green-100 text-green-800'
      case 'PaymentFail': return 'bg-red-100 text-red-800'
      case 'RefundCreated': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Auto-refresh every 3 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshLogs()
    }, 3000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Initial load
  useEffect(() => {
    refreshLogs()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-red-600">
          🚧 Webhook Debug Monitor (TEMPORARY)
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor incoming MX Merchant webhooks in real-time. This page will be removed in production.
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Debug Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button 
            onClick={refreshLogs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Now
          </Button>
          
          <Button 
            onClick={handleClearLogs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Logs
          </Button>
          
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Webhook Logs ({logs.length}/50)
          </CardTitle>
          <CardDescription>
            Real-time webhook reception monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhooks received yet. Waiting for MX Merchant data...
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getEventTypeColor(log.eventType)}>
                        {log.eventType}
                      </Badge>
                      <Badge variant="outline">
                        Merchant: {log.merchantId}
                      </Badge>
                      <Badge variant="outline">
                        ID: {log.transactionId}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Full Payload
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Endpoint Info */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">Webhook Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>URL:</strong> <code>/api/webhook/mx-merchant</code></div>
            <div><strong>Method:</strong> POST</div>
            <div><strong>Status:</strong> Active and monitoring</div>
            <div className="text-yellow-700 text-xs mt-2">
              💡 Configure this endpoint in MX Merchant notification settings
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}