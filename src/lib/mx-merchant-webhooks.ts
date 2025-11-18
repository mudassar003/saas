/**
 * MX Merchant Webhook Setup Utilities
 * Handles automated webhook subscription for merchant tenants
 */

import { createMXClientForMerchant } from '@/lib/mx-merchant-client';

export type WebhookEventType =
  | 'PaymentSuccess'
  | 'PaymentFail'
  | 'RefundCreated'
  | 'Chargeback'
  | 'Deposit';

export interface WebhookSubscriptionPayload {
  sendWebhook: boolean;
  callbackUrl: string;
  sources: string;
  eventType: string;
  merchantId: number;
  threshold: number;
  sendEmail: boolean;
  sendSMS: boolean;
}

export interface WebhookSetupResult {
  eventType: string;
  status: number;
  success: boolean;
  error?: string;
  response?: unknown;
}

/**
 * Get the default webhook callback URL based on environment
 */
export function getDefaultWebhookUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-auto.vercel.app';
  return `${baseUrl}/api/webhook`;
}

/**
 * Setup webhook subscriptions for a merchant
 *
 * @param merchantId - MX Merchant ID
 * @param eventTypes - Array of event types to subscribe to
 * @param callbackUrl - Optional custom callback URL (defaults to /api/webhook)
 * @returns Array of setup results for each event type
 */
export async function setupWebhooksForMerchant(
  merchantId: number,
  eventTypes: WebhookEventType[],
  callbackUrl?: string
): Promise<WebhookSetupResult[]> {
  const results: WebhookSetupResult[] = [];
  const webhookUrl = callbackUrl || getDefaultWebhookUrl();

  console.log(`[Webhook Setup] Setting up ${eventTypes.length} webhooks for merchant ${merchantId}`);
  console.log(`[Webhook Setup] Callback URL: ${webhookUrl}`);

  // Create MX Client for this merchant
  const mxClient = await createMXClientForMerchant(merchantId.toString());

  // Setup webhook for each event type
  for (const eventType of eventTypes) {
    try {
      const payload: WebhookSubscriptionPayload = {
        sendWebhook: true,
        callbackUrl: webhookUrl,
        sources: 'QuickPay, API, Recurring', // Monitor all transaction sources
        eventType: eventType,
        merchantId: merchantId,
        threshold: 0, // Capture all transactions regardless of amount
        sendEmail: false,
        sendSMS: false,
      };

      console.log(`[Webhook Setup] Setting up ${eventType} for merchant ${merchantId}`);

      // Make PUT request to MX Merchant subscription endpoint
      const response = await fetch('https://api.mxmerchant.com/checkout/v3/subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(
            `${mxClient.consumerKey}:${mxClient.consumerSecret}`
          ).toString('base64')}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        results.push({
          eventType,
          status: response.status,
          success: true,
          response: responseData,
        });
        console.log(`[Webhook Setup] ✅ ${eventType} setup successful`);
      } else {
        // Handle "Duplicate notification" error - webhook already exists, which is OK
        const isDuplicateError = responseData?.errorCode === 'ValidationError' &&
                                 responseData?.details?.includes('Duplicate notification');

        if (isDuplicateError) {
          results.push({
            eventType,
            status: response.status,
            success: true, // Mark as success since webhook exists
            error: 'Webhook already exists (duplicate)',
            response: responseData,
          });
          console.log(`[Webhook Setup] ℹ️  ${eventType} already exists (duplicate)`);
        } else {
          results.push({
            eventType,
            status: response.status,
            success: false,
            error: responseData?.message || `HTTP ${response.status}`,
            response: responseData,
          });
          console.error(`[Webhook Setup] ❌ ${eventType} setup failed:`, responseData);
        }
      }

      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        eventType,
        status: 0,
        success: false,
        error: errorMessage,
      });
      console.error(`[Webhook Setup] ❌ ${eventType} setup error:`, error);
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Webhook Setup] Completed: ${successCount}/${eventTypes.length} successful`);

  return results;
}

/**
 * Delete a specific webhook subscription
 *
 * @param merchantId - MX Merchant ID
 * @param subscriptionId - Subscription ID to delete
 * @returns Deletion result
 */
export async function deleteWebhookSubscription(
  merchantId: number,
  subscriptionId: number
): Promise<boolean> {
  try {
    const mxClient = await createMXClientForMerchant(merchantId.toString());

    const response = await fetch(
      `https://api.mxmerchant.com/checkout/v3/subscription/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${mxClient.consumerKey}:${mxClient.consumerSecret}`
          ).toString('base64')}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[Webhook Setup] Error deleting subscription:', error);
    return false;
  }
}

/**
 * Clean up old webhook subscriptions for a specific callback URL
 *
 * @param merchantId - MX Merchant ID
 * @param callbackUrl - Callback URL to clean up
 * @returns Number of subscriptions deleted
 */
export async function cleanupOldWebhooks(
  merchantId: number,
  callbackUrl: string
): Promise<number> {
  try {
    const subscriptions = await getWebhookSubscriptions(merchantId) as {
      records: Array<{
        id: number;
        callbackUrl?: string;
        sendWebhook: boolean;
      }>
    };

    let deletedCount = 0;

    if (subscriptions?.records) {
      const webhooksToDelete = subscriptions.records.filter(
        (sub) => sub.sendWebhook && sub.callbackUrl === callbackUrl
      );

      for (const webhook of webhooksToDelete) {
        const deleted = await deleteWebhookSubscription(merchantId, webhook.id);
        if (deleted) {
          deletedCount++;
          console.log(`[Webhook Setup] Deleted old webhook ${webhook.id}`);
        }
        // Small delay between deletions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('[Webhook Setup] Error cleaning up old webhooks:', error);
    return 0;
  }
}

/**
 * Get current webhook subscriptions for a merchant
 *
 * @param merchantId - MX Merchant ID
 * @returns Current webhook subscriptions
 */
export async function getWebhookSubscriptions(merchantId: number): Promise<unknown> {
  try {
    const mxClient = await createMXClientForMerchant(merchantId.toString());

    const response = await fetch('https://api.mxmerchant.com/checkout/v3/subscription', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${mxClient.consumerKey}:${mxClient.consumerSecret}`
        ).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch subscriptions: HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('[Webhook Setup] Error fetching subscriptions:', error);
    throw error;
  }
}

/**
 * Setup recommended webhook subscriptions for a new merchant
 * Subscribes to the 5 core transaction event types
 *
 * @param merchantId - MX Merchant ID
 * @returns Setup results
 */
export async function setupRecommendedWebhooks(
  merchantId: number
): Promise<WebhookSetupResult[]> {
  const recommendedEvents: WebhookEventType[] = [
    'PaymentSuccess',
    'PaymentFail',
    'RefundCreated',
    'Chargeback',
    'Deposit',
  ];

  return setupWebhooksForMerchant(merchantId, recommendedEvents);
}
