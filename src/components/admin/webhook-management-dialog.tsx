'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Webhook, Plus, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WebhookManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: number;
  tenantName: string | null;
}

const WEBHOOK_EVENT_TYPES = [
  { value: 'PaymentSuccess', label: 'Payment Success', description: 'When a payment is approved' },
  { value: 'PaymentFail', label: 'Payment Fail', description: 'When a payment is declined' },
  { value: 'RefundCreated', label: 'Refund Created', description: 'When a refund is issued' },
  { value: 'Chargeback', label: 'Chargeback', description: 'When a chargeback is filed' },
  { value: 'Deposit', label: 'Deposit', description: 'When funds are deposited' },
];

interface WebhookSubscription {
  eventType: string;
  status: 'active' | 'pending' | 'failed';
  createdAt?: string;
}

export function WebhookManagementDialog({
  open,
  onOpenChange,
  merchantId,
  tenantName,
}: WebhookManagementDialogProps) {
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing webhooks when dialog opens
  useEffect(() => {
    if (open && merchantId) {
      fetchWebhooks();
    }
  }, [open, merchantId]);

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/webhooks/list?merchantId=${merchantId}`, {
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch webhooks');
      }

      // MX Merchant returns the subscription data directly
      // Convert to our WebhookSubscription format
      const activeWebhooks: WebhookSubscription[] = [];

      if (result.webhooks && typeof result.webhooks === 'object') {
        // The API returns subscription configuration, not a list
        // If sendWebhook is true, there's an active webhook
        if (result.webhooks.sendWebhook && result.webhooks.callbackUrl) {
          activeWebhooks.push({
            eventType: 'Webhook Active',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      }

      setWebhooks(activeWebhooks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!selectedEventType) {
      setError('Please select an event type');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/webhooks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId,
          eventType: selectedEventType,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Display exact MX Merchant error
        let errorMessage = result.error || 'Failed to create webhook';

        if (result.errorCode) {
          errorMessage = `${result.errorCode}: ${result.error}`;

          if (result.details && Array.isArray(result.details)) {
            errorMessage += ` - ${result.details.join(', ')}`;
          }

          if (result.responseCode) {
            errorMessage += ` (Response: ${result.responseCode})`;
          }
        }

        throw new Error(errorMessage);
      }

      // Show success message from MX Merchant
      setSuccess(result.message || `Webhook for ${selectedEventType} created successfully!`);

      // Reset selection
      setSelectedEventType('');

      // Refresh the webhooks list
      await fetchWebhooks();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create webhook:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Webhook className="h-6 w-6" />
            Webhook Management
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Manage webhook subscriptions for <span className="font-semibold">{tenantName || `Merchant ${merchantId}`}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* Alerts */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400">
                {success}
              </Alert>
            )}

            {/* Create New Webhook Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Create New Webhook
              </h3>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                {/* Event Type Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedEventType}
                    onValueChange={setSelectedEventType}
                    disabled={isCreating}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBHOOK_EVENT_TYPES.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{event.label}</span>
                            <span className="text-xs text-muted-foreground">{event.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Webhook Details */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>Callback URL:</strong> https://saas-auto.vercel.app/api/webhook</p>
                  <p><strong>Merchant ID:</strong> {merchantId}</p>
                  <p><strong>Sources:</strong> QuickPay, Invoice, Recurring, Order, MXExpress, MXRetail, API</p>
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateWebhook}
                  disabled={isCreating || !selectedEventType}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Webhook
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Existing Webhooks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Active Webhooks
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchWebhooks}
                  disabled={isLoading}
                  className="h-8"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin opacity-50" />
                  <p className="text-sm">Loading webhooks...</p>
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                  <Webhook className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No webhooks configured yet</p>
                  <p className="text-xs mt-1">Create your first webhook above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((webhook, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {webhook.status === 'active' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : webhook.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Loader2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{webhook.eventType}</p>
                          {webhook.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(webhook.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          webhook.status === 'active'
                            ? 'default'
                            : webhook.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {webhook.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">How Webhooks Work:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>✅ Real-time notifications from MX Merchant</li>
                <li>✅ Automatically updates transactions in your dashboard</li>
                <li>✅ No need for manual syncing</li>
                <li>💡 Recommended: Set up all 5 event types for complete coverage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex-shrink-0">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
