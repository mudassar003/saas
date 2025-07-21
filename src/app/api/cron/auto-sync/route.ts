import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SyncService } from '@/lib/sync-service';
import { getTexas24HoursAgo, getTexasISOString } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active MX Merchant configs for incremental sync
    const { data: configs, error } = await supabaseAdmin
      .from('mx_merchant_configs')
      .select('*')
      .eq('is_active', true);

    if (error || !configs?.length) {
      return NextResponse.json({
        success: false,
        error: 'No active MX Merchant configurations found'
      }, { status: 400 });
    }

    const results = [];

    for (const config of configs) {
      try {
        // Get last successful sync timestamp
        const { data: lastSync } = await supabaseAdmin
          .from('sync_logs')
          .select('updated_at')
          .eq('user_id', config.user_id)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        // Only sync invoices created/updated since last sync (last 24 hours max in Texas time)
        const since = lastSync?.updated_at || getTexasISOString(getTexas24HoursAgo());
        
        const syncService = new SyncService(config.user_id, config);
        const result = await syncService.syncIncrementalInvoices(since);
        
        results.push({
          userId: config.user_id,
          result
        });

      } catch (configError) {
        console.error(`Sync failed for user ${config.user_id}:`, configError);
        results.push({
          userId: config.user_id,
          error: configError instanceof Error ? configError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Incremental auto-sync completed',
      results
    });

  } catch (error) {
    console.error('Auto-sync failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Auto-sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}