'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, RefreshCw, Bell, CreditCard, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NotificationResult {
  success: boolean;
  message?: string;
  error?: string;
  rawResponse?: string;
  data?: Record<string, unknown>;
}

interface PaymentResult {
  success: boolean;
  message?: string;
  error?: string;
  rawResponse?: string;
  data?: Record<string, unknown>;
  transactionId?: string;
}

export default function MXNotificationTestPage() {
  const [isCreatingNotification, setIsCreatingNotification] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [notificationResult, setNotificationResult] = useState<NotificationResult | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('https://saas-wine-three.vercel.app/api/webhook/mx-merchant')
  const [paymentAmount, setPaymentAmount] = useState('10.00')
  const [listResult, setListResult] = useState<NotificationResult | null>(null)
  const [isListingNotifications, setIsListingNotifications] = useState(false)

  const createNotificationSubscription = async () => {
    setIsCreatingNotification(true)
    setNotificationResult(null)
    
    try {
      console.log('Creating notification subscription...')
      const response = await fetch('/api/debug/create-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl
        })
      })
      
      console.log('Notification response status:', response.status)
      const data = await response.json()
      console.log('Notification response data:', data)
      
      setNotificationResult(data as NotificationResult)
    } catch (error) {
      console.error('Notification creation error:', error)
      setNotificationResult({ 
        success: false,
        error: 'Failed to create notification subscription', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsCreatingNotification(false)
    }
  }

  const createTestPayment = async () => {
    setIsCreatingPayment(true)
    setPaymentResult(null)
    
    try {
      console.log('Creating test payment...')
      const response = await fetch('/api/debug/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount)
        })
      })
      
      console.log('Payment response status:', response.status)
      const data = await response.json()
      console.log('Payment response data:', data)
      
      setPaymentResult(data as PaymentResult)
    } catch (error) {
      console.error('Payment creation error:', error)
      setPaymentResult({ 
        success: false,
        error: 'Failed to create test payment', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const listNotificationSubscriptions = async () => {
    setIsListingNotifications(true)
    setListResult(null)
    
    try {
      console.log('Listing notification subscriptions...')
      const response = await fetch('/api/debug/list-notifications', {
        method: 'GET'
      })
      
      console.log('List response status:', response.status)
      const data = await response.json()
      console.log('List response data:', data)
      
      setListResult(data as NotificationResult)
    } catch (error) {
      console.error('List notification error:', error)
      setListResult({ 
        success: false,
        error: 'Failed to list notification subscriptions', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsListingNotifications(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MX Merchant Notification Test</h1>
        <p className="text-muted-foreground mt-2">
          Test webhook notifications and payment creation with MX Merchant sandbox environment
        </p>
      </div>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure the webhook URL for receiving MX Merchant notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="webhook-url" className="text-sm font-medium">
              Webhook URL (using your app&apos;s webhook endpoint)
            </label>
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-webhook-url.com"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Default: Production webhook endpoint (/api/webhook/mx-merchant)
            </p>
          </div>
          
          <Button 
            onClick={createNotificationSubscription}
            disabled={isCreatingNotification || !webhookUrl}
            className="w-full"
          >
            {isCreatingNotification ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating Notification Subscription...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Create Notification Subscription
              </>
            )}
          </Button>

          {notificationResult && (
            <Alert className={notificationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center">
                {notificationResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {notificationResult.success ? 'Success!' : 'Error'}
                    </p>
                    {notificationResult.message && (
                      <p className="text-sm">{notificationResult.message}</p>
                    )}
                    {notificationResult.error && (
                      <p className="text-sm text-red-600">{notificationResult.error}</p>
                    )}
                    {notificationResult.rawResponse && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-red-600">Raw Error Response</summary>
                        <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-red-800">
                          {notificationResult.rawResponse}
                        </pre>
                      </details>
                    )}
                    {notificationResult.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Response Data</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                          {JSON.stringify(notificationResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* List Existing Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            List Existing Notifications
          </CardTitle>
          <CardDescription>
            View all current notification subscriptions for this merchant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={listNotificationSubscriptions}
            disabled={isListingNotifications}
            className="w-full"
            variant="outline"
          >
            {isListingNotifications ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading Notifications...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                List Current Notifications
              </>
            )}
          </Button>

          {listResult && (
            <Alert className={listResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center">
                {listResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {listResult.success ? 'Current Notifications:' : 'Error'}
                    </p>
                    {listResult.message && (
                      <p className="text-sm">{listResult.message}</p>
                    )}
                    {listResult.error && (
                      <p className="text-sm text-red-600">{listResult.error}</p>
                    )}
                    {listResult.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Notification Details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                          {JSON.stringify(listResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Test Payment Creation
          </CardTitle>
          <CardDescription>
            Create a test payment to trigger webhook notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="payment-amount" className="text-sm font-medium">
              Payment Amount ($)
            </label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="10.00"
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Test Card Details (Sandbox)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><strong>Card Number:</strong> 4242424242424242</div>
              <div><strong>Expiry:</strong> 12/2026</div>
              <div><strong>CVV:</strong> 123</div>
              <div><strong>ZIP:</strong> 12345</div>
            </div>
          </div>
          
          <Button 
            onClick={createTestPayment}
            disabled={isCreatingPayment || !paymentAmount}
            className="w-full"
          >
            {isCreatingPayment ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating Test Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Create Test Payment
              </>
            )}
          </Button>

          {paymentResult && (
            <Alert className={paymentResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center">
                {paymentResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {paymentResult.success ? 'Payment Created!' : 'Payment Failed'}
                    </p>
                    {paymentResult.transactionId && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Transaction ID:</span>
                        <Badge variant="outline" className="font-mono">
                          {paymentResult.transactionId}
                        </Badge>
                      </div>
                    )}
                    {paymentResult.message && (
                      <p className="text-sm">{paymentResult.message}</p>
                    )}
                    {paymentResult.error && (
                      <p className="text-sm text-red-600">{paymentResult.error}</p>
                    )}
                    {paymentResult.rawResponse && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-red-600">Raw Error Response</summary>
                        <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto text-red-800">
                          {paymentResult.rawResponse}
                        </pre>
                      </details>
                    )}
                    {paymentResult.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Response Data</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                          {JSON.stringify(paymentResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Webhook Monitoring */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Webhook Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-blue-700">
              Monitor webhook reception in real-time after creating notifications.
            </p>
            <Button 
              onClick={() => window.open('/debug/webhooks', '_blank')}
              variant="outline"
              className="w-full"
            >
              <Activity className="mr-2 h-4 w-4" />
              Open Webhook Debug Monitor
            </Button>
            <div className="text-xs text-blue-600">
              💡 Keep this page open to see incoming webhooks after creating notifications
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Environment:</span>
              <Badge variant="destructive" className="ml-2">Production</Badge>
            </div>
            <div>
              <span className="font-medium">Merchant ID:</span>
              <span className="ml-2 font-mono">1000095245</span>
            </div>
            <div>
              <span className="font-medium">API URL:</span>
              <span className="ml-2 font-mono text-xs">api.mxmerchant.com</span>
            </div>
            <div>
              <span className="font-medium">Credentials:</span>
              <span className="ml-2">MX_MERCHANT_CONSUMER_*</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
