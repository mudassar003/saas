/**
 * TEMPORARY: Webhook debugging utilities
 * This file can be easily removed once production is stable
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

// In-memory storage (resets on deployment - perfect for temporary debugging)
const webhookLogs: WebhookLog[] = []

/**
 * Log incoming webhook for debugging
 * Only active in development/staging environments
 */
export function logWebhook(payload: Record<string, unknown>): void {
  // Skip logging in production to avoid memory issues
  if (process.env.NODE_ENV === 'production') return
  
  const log: WebhookLog = {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    merchantId: (payload?.merchantId as string) || 'unknown',
    eventType: (payload?.eventType as string) || 'unknown',
    transactionId: (payload?.id as string) || 'unknown',
    payload: payload,
    processed: false
  }
  
  // Add to beginning of array (newest first)
  webhookLogs.unshift(log)
  
  // Keep only last 50 webhooks to prevent memory bloat
  if (webhookLogs.length > 50) {
    webhookLogs.splice(50)
  }
  
  // Console log for immediate visibility
  console.log('🔥 WEBHOOK RECEIVED:', {
    merchantId: log.merchantId,
    eventType: log.eventType,
    transactionId: log.transactionId,
    timestamp: log.timestamp
  })
}

/**
 * Get all webhook logs for debug page
 */
export function getWebhookLogs(): WebhookLog[] {
  return [...webhookLogs] // Return copy to prevent mutations
}

/**
 * Mark webhook as processed (for debugging flow)
 */
export function markWebhookProcessed(transactionId: string): void {
  const log = webhookLogs.find(l => l.transactionId === transactionId)
  if (log) {
    log.processed = true
  }
}

/**
 * Clear all webhook logs
 */
export function clearWebhookLogs(): void {
  webhookLogs.length = 0
}