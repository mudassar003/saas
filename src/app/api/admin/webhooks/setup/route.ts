import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/auth/server-utils';
import { setupWebhooksForMerchant } from '@/lib/mx-merchant-webhooks';

/**
 * Validation schema for webhook setup request
 */
const webhookSetupSchema = z.object({
  merchantId: z.number().positive('Merchant ID must be a positive number'),
  eventTypes: z.array(z.enum([
    'PaymentSuccess',
    'PaymentFail',
    'RefundCreated',
    'Chargeback',
    'Deposit'
  ])).min(1, 'At least one event type is required'),
  callbackUrl: z.string().url('Invalid callback URL').optional(),
});

export interface WebhookSetupResponse {
  success: boolean;
  results?: {
    eventType: string;
    status: number;
    success: boolean;
    error?: string;
  }[];
  error?: string;
}

/**
 * POST /api/admin/webhooks/setup
 * Setup webhook subscriptions for a merchant
 *
 * @security Requires super admin access
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebhookSetupResponse>> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    // Parse and validate request body
    const body = await request.json();
    const { merchantId, eventTypes, callbackUrl } = webhookSetupSchema.parse(body);

    console.log(`[Webhook Setup] Starting setup for merchant ${merchantId}, events:`, eventTypes);

    // Setup webhooks for all requested event types
    const results = await setupWebhooksForMerchant(
      merchantId,
      eventTypes,
      callbackUrl
    );

    // Check if all succeeded
    const allSucceeded = results.every(r => r.success);

    if (!allSucceeded) {
      const failedEvents = results.filter(r => !r.success);
      console.warn(`[Webhook Setup] Some webhooks failed:`, failedEvents);
    }

    return NextResponse.json({
      success: allSucceeded,
      results,
    });

  } catch (error) {
    console.error('[Webhook Setup] Error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || 'Invalid input'
        },
        { status: 400 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup webhooks'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/webhooks/setup
 * Get available webhook event types
 *
 * @security Requires super admin access
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Require super admin access
    await requireSuperAdmin();

    const availableEventTypes = [
      {
        id: 11,
        eventType: 'PaymentSuccess',
        description: 'Successful payment transactions',
        group: 'Transactions',
        recommended: true,
      },
      {
        id: 12,
        eventType: 'PaymentFail',
        description: 'Failed/declined payment transactions',
        group: 'Transactions',
        recommended: true,
      },
      {
        id: 27,
        eventType: 'RefundCreated',
        description: 'Refund transactions',
        group: 'Transactions',
        recommended: true,
      },
      {
        id: 1,
        eventType: 'Chargeback',
        description: 'Chargeback notifications',
        group: 'Transactions',
        recommended: false,
      },
      {
        id: 2,
        eventType: 'Deposit',
        description: 'Deposit notifications',
        group: 'Transactions',
        recommended: false,
      },
    ];

    return NextResponse.json({
      success: true,
      eventTypes: availableEventTypes,
    });

  } catch (error) {
    console.error('[Webhook Setup] Error fetching event types:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch event types'
      },
      { status: 500 }
    );
  }
}
