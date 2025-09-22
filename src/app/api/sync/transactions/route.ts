import { NextRequest, NextResponse } from 'next/server'
import { SimpleSyncService } from '@/lib/simple-sync'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '50')
    const dateFilter = searchParams.get('date')
    
    console.log(`Starting simple sync for ${count} transactions${dateFilter ? ` since ${dateFilter}` : ''}`)

    // Validate count parameter
    if (count < 1 || count > 1000) {
      return NextResponse.json({ 
        success: false,
        error: 'Count must be between 1 and 1000' 
      }, { status: 400 })
    }

    // Create sync service instance
    const syncService = await SimpleSyncService.createFromConfig()
    
    if (!syncService) {
      return NextResponse.json({ 
        success: false,
        error: 'MX Merchant configuration not found. Please configure your API credentials first.' 
      }, { status: 400 })
    }

    // Execute sync with optional date filter
    const result = await syncService.syncTransactions(count, dateFilter || undefined)
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Sync completed. Transactions: ${result.transactionsProcessed}, Invoices: ${result.invoicesProcessed}, Products: ${result.productsProcessed}`
        : `Sync failed. Errors: ${result.errors.join(', ')}`,
      summary: {
        transactionsProcessed: result.transactionsProcessed,
        invoicesProcessed: result.invoicesProcessed,
        productsProcessed: result.productsProcessed,
        totalFailed: result.errors.length
      },
      errors: result.errors.slice(0, 5)
    })

  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // No authentication required
    
    // Get sync status
    // Get invoice count
    const { count: totalInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      
    // Get transaction counts from database for user
    const { data: transactions, error: transactionError, count: transactionCount } = await supabaseAdmin
      .from('transactions')
      .select('id, status, mx_invoice_number', { count: 'exact' })
      
    if (transactionError) {
      console.error('Error fetching transaction status:', transactionError)
    }

    const totalTransactions = transactionCount || 0
    const transactionsWithInvoices = transactions?.filter(t => t.mx_invoice_number !== null).length || 0
    const standaloneTransactions = totalTransactions - transactionsWithInvoices
    const approvedTransactions = transactions?.filter(t => t.status === 'Approved').length || 0
    const declinedTransactions = transactions?.filter(t => t.status === 'Declined').length || 0

    return NextResponse.json({
      success: true,
      data: {
        // Invoice data - bypass user filtering
        totalInvoices: totalInvoices || 0,
        invoicesWithProducts: 0, // Skip for setup
        pendingProductSync: 0, // Skip for setup
        
        // New transaction data
        totalTransactions,
        transactionsWithInvoices,
        standaloneTransactions,
        approvedTransactions,
        declinedTransactions,
        
        // Last sync information - skip for setup
        lastSync: null,
        
        // Summary statistics
        dataCompleteness: {
          invoiceCoverage: totalInvoices && totalInvoices > 0 ? (transactionsWithInvoices / totalInvoices) * 100 : 0,
          transactionCoverage: totalTransactions > 0 ? ((transactionsWithInvoices + standaloneTransactions) / totalTransactions) * 100 : 100,
          missingTransactions: Math.max(0, (totalInvoices || 0) - transactionsWithInvoices)
        }
      }
    })

  } catch (error) {
    console.error('Transaction sync status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
