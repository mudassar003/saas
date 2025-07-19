import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      .eq('user_id', userId)
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

    // Get latest auto-sync status
    const { data: latestAutoSync } = await supabaseAdmin
      .from('sync_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'incremental')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      syncLogs,
      latestAutoSync,
      autoSyncStatus: {
        enabled: process.env.AUTO_SYNC_ENABLED === 'true',
        intervalMinutes: parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '15'),
        lastRun: latestAutoSync?.created_at || null,
        nextExpectedRun: latestAutoSync?.created_at 
          ? new Date(new Date(latestAutoSync.created_at).getTime() + 15 * 60 * 1000).toISOString()
          : null
      }
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