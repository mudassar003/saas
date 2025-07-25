import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MXMerchantClient } from '@/lib/mx-merchant-client';
import { DAL, TransactionDAL } from '@/lib/dal';
// Timezone imports removed - unused

export async function GET(request: NextRequest) {
  const startTime = new Date();
  console.log(`🔄 CRON JOB STARTED at ${startTime.toISOString()}`);
  
  try {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ CRON: Unauthorized access attempt');
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
        // Create MX Client
        const mxClient = new MXMerchantClient(config.consumer_key, config.consumer_secret, config.environment as 'sandbox' | 'production');
        
        console.log(`Cron sync: Fetching latest 100 invoices...`);
        // Step 1: Sync latest invoices (no date filter)
        const invoicesResponse = await mxClient.getInvoices({
          limit: 100
        });
        const recentInvoices = invoicesResponse.records || [];
        
        // Filter out existing invoices
        const existingInvoices = await supabaseAdmin
          .from('invoices')
          .select('mx_invoice_id')
          .in('mx_invoice_id', recentInvoices.map(i => i.id));
        
        const existingInvoiceIds = new Set(existingInvoices.data?.map(i => i.mx_invoice_id) || []);
        const newInvoices = recentInvoices.filter(i => !existingInvoiceIds.has(i.id));
        
        console.log(`Cron sync: Inserting ${newInvoices.length} new invoices...`);
        const invoiceResults = await DAL.bulkInsertInvoices(newInvoices);
        
        console.log(`Cron sync: Fetching latest 100 transactions...`);
        // Step 2: Sync latest transactions (no date filter)
        const paymentsResponse = await mxClient.getPayments({
          limit: 100
        });
        const recentPayments = paymentsResponse.records || [];
        
        // Filter out existing transactions
        const existingPayments = await supabaseAdmin
          .from('transactions')
          .select('mx_payment_id')
          .in('mx_payment_id', recentPayments.map(p => p.id));
        
        const existingPaymentIds = new Set(existingPayments.data?.map(p => p.mx_payment_id) || []);
        const newPayments = recentPayments.filter(p => !existingPaymentIds.has(p.id));
        
        console.log(`Cron sync: Inserting ${newPayments.length} new transactions...`);
        const transactionResults = await TransactionDAL.bulkInsertTransactions(newPayments);
        
        // Step 3: Link transactions to invoices
        console.log('Cron sync: Linking transactions to invoices...');
        let linkedCount = 0;
        try {
          const { data: unlinkableTransactions } = await supabaseAdmin
            .from('transactions')
            .select('id, mx_invoice_number')
            .not('mx_invoice_number', 'is', null)
            .is('invoice_id', null)
            .limit(500);
          
          if (unlinkableTransactions && unlinkableTransactions.length > 0) {
            const invoiceNumbers = [...new Set(unlinkableTransactions.map(t => t.mx_invoice_number))];
            
            const { data: matchingInvoices } = await supabaseAdmin
              .from('invoices')
              .select('id, invoice_number')
              .in('invoice_number', invoiceNumbers);
            
            if (matchingInvoices && matchingInvoices.length > 0) {
              const invoiceMap = new Map(
                matchingInvoices.map(inv => [inv.invoice_number, inv.id])
              );
              
              for (const transaction of unlinkableTransactions) {
                const invoiceId = invoiceMap.get(transaction.mx_invoice_number);
                if (invoiceId) {
                  await supabaseAdmin
                    .from('transactions')
                    .update({ invoice_id: invoiceId })
                    .eq('id', transaction.id);
                  linkedCount++;
                }
              }
            }
          }
        } catch (linkError) {
          console.error('Cron sync linking error:', linkError);
        }
        
        const result = {
          success: true,
          invoicesProcessed: invoiceResults.success,
          transactionsProcessed: transactionResults.success,
          linked: linkedCount,
          failed: invoiceResults.failed + transactionResults.failed,
          errors: [...invoiceResults.errors, ...transactionResults.errors]
        };
        
        results.push({
          configId: config.id,
          result
        });
        
        console.log(`Cron sync complete: ${invoiceResults.success} invoices, ${transactionResults.success} transactions, ${linkedCount} linked`);

      } catch (configError) {
        console.error(`Cron sync failed for config ${config.id}:`, configError);
        results.push({
          configId: config.id,
          error: configError instanceof Error ? configError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-sync completed for invoices and transactions',
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