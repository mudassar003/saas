import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // No authentication required
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const syncType = url.searchParams.get('type') || 'all';

    let query = supabaseAdmin
      .from('sync_logs')
      .select(`
        id,
        sync_type,
        status,
        records_processed,
        records_failed,
        error_message,
        api_calls_made,
        created_at,
        updated_at,
        last_processed_invoice_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (syncType !== 'all') {
      query = query.eq('sync_type', syncType);
    }

    const { data: syncLogs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sync logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      syncLogs
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