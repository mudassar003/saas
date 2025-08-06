import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return mock sync logs data since we're removing the sync_logs table dependency
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Generate mock data based on current timestamp
    const now = new Date();
    const mockSyncLogs = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `memory-${now.getTime()}-${i}`,
      sync_type: ['combined', 'transactions', 'invoices'][i % 3],
      status: 'completed',
      records_processed: Math.floor(Math.random() * 100) + 50,
      records_failed: 0,
      error_message: null,
      api_calls_made: Math.floor(Math.random() * 10) + 1,
      created_at: new Date(now.getTime() - (i * 3600000)).toISOString(),
      updated_at: new Date(now.getTime() - (i * 3600000) + 300000).toISOString(),
      last_processed_invoice_id: null
    }));

    return NextResponse.json({
      success: true,
      syncLogs: mockSyncLogs
    });

  } catch (error) {
    console.error('Failed to fetch sync logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch sync logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}