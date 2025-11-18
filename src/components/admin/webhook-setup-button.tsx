'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Webhook, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';

interface WebhookSetupButtonProps {
  merchantId: number;
  merchantName?: string;
}

interface WebhookResult {
  eventType: string;
  status: number;
  success: boolean;
  error?: string;
}

export function WebhookSetupButton({ merchantId, merchantName }: WebhookSetupButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<WebhookResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetupWebhooks = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setResults(null);

      const response = await fetch('/api/admin/webhooks/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId,
          eventTypes: [
            'PaymentSuccess',
            'PaymentFail',
            'RefundCreated',
            'Chargeback',
            'Deposit',
          ],
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to setup webhooks');
      }

      setResults(data.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to setup webhooks:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const successCount = results?.filter(r => r.success).length || 0;
  const totalCount = results?.length || 0;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Webhook className="h-4 w-4" />
        Setup Webhooks
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Setup Webhooks</DialogTitle>
            <DialogDescription>
              Configure 5 webhook subscriptions for {merchantName || `Merchant ${merchantId}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            {results && (
              <Alert className={successCount === totalCount ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
                <div className="font-medium mb-2">
                  Webhook Setup Complete: {successCount}/{totalCount} successful
                </div>
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                        {result.eventType} - {result.success ? 'Success' : `Failed (${result.error})`}
                      </span>
                    </div>
                  ))}
                </div>
              </Alert>
            )}

            {!results && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Webhook Event Types:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ PaymentSuccess - Successful payment transactions</li>
                  <li>✅ PaymentFail - Failed/declined transactions</li>
                  <li>✅ RefundCreated - Refund transactions</li>
                  <li>✅ Chargeback - Chargeback notifications</li>
                  <li>✅ Deposit - Deposit notifications</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  All webhooks will call: {process.env.NEXT_PUBLIC_APP_URL || 'https://saas-auto.vercel.app'}/api/webhook
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {results ? 'Close' : 'Cancel'}
              </Button>
              {!results && (
                <Button
                  onClick={handleSetupWebhooks}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Setting up...' : 'Setup Webhooks'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
