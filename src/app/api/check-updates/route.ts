import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Check for very recent transactions (last 6 minutes to account for cron timing)
    const sixMinutesAgo = new Date()
    sixMinutesAgo.setMinutes(sixMinutesAgo.getMinutes() - 6)
    
    const { data: recentTransactions, count } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact' })
      .gte('created_at', sixMinutesAgo.toISOString())
    
    const hasNewData = (count || 0) > 0
    
    return NextResponse.json({
      success: true,
      hasNewData,
      count: count || 0,
      message: hasNewData ? `${count} new transactions available` : 'No new data'
    })
    
  } catch (error) {
    console.error('Check updates error:', error)
    return NextResponse.json(
      { 
        success: false, 
        hasNewData: false, 
        count: 0,
        error: 'Failed to check for updates' 
      },
      { status: 500 }
    )
  }
}