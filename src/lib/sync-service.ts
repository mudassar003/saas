import { MXMerchantClient } from './mx-merchant-client'
import { DAL } from './dal'
import { Tables } from './supabase'

export class SyncService {
  private mxClient: MXMerchantClient
  private userId: string
  private config: Tables<'mx_merchant_configs'>

  constructor(userId: string, config: Tables<'mx_merchant_configs'>) {
    this.userId = userId
    this.config = config
    this.mxClient = new MXMerchantClient(config.consumer_key, config.consumer_secret, config.environment as 'sandbox' | 'production')
  }

  // Step 1: Initial sync - fetch all invoices without product details
  async syncAllInvoices(syncType: 'initial' | 'manual' = 'initial'): Promise<{
    success: boolean
    totalProcessed: number
    totalFailed: number
    errors: string[]
    syncLogId: string | null
  }> {
    const syncLog = await DAL.createSyncLog({
      user_id: this.userId,
      sync_type: syncType,
      status: 'started'
    })

    if (!syncLog) {
      return {
        success: false,
        totalProcessed: 0,
        totalFailed: 0,
        errors: ['Failed to create sync log'],
        syncLogId: null
      }
    }

    try {
      let totalProcessed = 0
      let totalFailed = 0
      const allErrors: string[] = []
      let apiCallsCount = 0
      let lastProcessedInvoiceId: number | null = null

      // Fetch all invoices with pagination
      const limit = 100
      let offset = 0
      let hasMore = true

      while (hasMore) {
        console.log(`Fetching invoices: offset=${offset}, limit=${limit}`)
        
        const response = await this.mxClient.getInvoices({ limit, offset })
        apiCallsCount++

        if (!response.success || !response.data?.records) {
          const error = `API call failed at offset ${offset}: ${response.error}`
          allErrors.push(error)
          console.error(error)
          break
        }

        const invoices = response.data.records
        
        if (invoices.length === 0) {
          hasMore = false
          break
        }

        // Insert invoices into database
        const insertResult = await DAL.bulkInsertInvoices(this.userId, invoices)
        totalProcessed += insertResult.success
        totalFailed += insertResult.failed
        allErrors.push(...insertResult.errors)

        // Update last processed invoice ID
        if (invoices.length > 0) {
          lastProcessedInvoiceId = invoices[invoices.length - 1].id
        }

        // Update sync log progress
        await DAL.updateSyncLog(syncLog.id, {
          records_processed: totalProcessed,
          records_failed: totalFailed,
          api_calls_made: apiCallsCount,
          last_processed_invoice_id: lastProcessedInvoiceId
        })

        offset += limit
        
        // Check if we got fewer records than requested (indicates end of data)
        if (invoices.length < limit) {
          hasMore = false
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Final sync log update
      await DAL.updateSyncLog(syncLog.id, {
        status: totalFailed === 0 ? 'completed' : 'failed',
        records_processed: totalProcessed,
        records_failed: totalFailed,
        error_message: allErrors.length > 0 ? allErrors.join('; ') : null,
        api_calls_made: apiCallsCount,
        last_processed_invoice_id: lastProcessedInvoiceId
      })

      return {
        success: totalFailed === 0,
        totalProcessed,
        totalFailed,
        errors: allErrors,
        syncLogId: syncLog.id
      }

    } catch (error) {
      console.error('Sync failed:', error)
      
      await DAL.updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        totalProcessed: 0,
        totalFailed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        syncLogId: syncLog.id
      }
    }
  }

  // Step 2: Sync product details for specific invoices (lazy loading)
  async syncInvoiceProducts(invoiceIds: number[]): Promise<{
    success: boolean
    totalProcessed: number
    totalFailed: number
    errors: string[]
  }> {
    const results = {
      success: true,
      totalProcessed: 0,
      totalFailed: 0,
      errors: [] as string[]
    }

    for (const invoiceId of invoiceIds) {
      try {
        console.log(`Fetching product details for invoice ${invoiceId}`)
        
        const response = await this.mxClient.getInvoiceDetail(invoiceId)
        
        if (!response.success || !response.data) {
          const error = `Failed to fetch details for invoice ${invoiceId}: ${response.error}`
          results.errors.push(error)
          results.totalFailed++
          console.error(error)
          continue
        }

        const invoiceDetail = response.data
        
        // Find the invoice in our database
        const { data: dbInvoice, error: dbError } = await DAL.supabase
          .from('invoices')
          .select('id')
          .eq('mx_invoice_id', invoiceId)
          .eq('user_id', this.userId)
          .single()

        if (dbError || !dbInvoice) {
          const error = `Invoice ${invoiceId} not found in database`
          results.errors.push(error)
          results.totalFailed++
          console.error(error)
          continue
        }

        // Insert product items
        const insertResult = await DAL.insertInvoiceItems(dbInvoice.id, invoiceDetail.purchases)
        
        if (insertResult.success > 0) {
          results.totalProcessed++
        } else {
          results.totalFailed++
          results.errors.push(...insertResult.errors)
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Invoice ${invoiceId}: ${errorMessage}`)
        results.totalFailed++
        console.error(`Error syncing invoice ${invoiceId}:`, error)
      }
    }

    results.success = results.totalFailed === 0

    return results
  }

  // Get sync status for user
  static async getSyncStatus(userId: string): Promise<{
    lastSync: Tables<'sync_logs'> | null
    totalInvoices: number
    invoicesWithProducts: number
    pendingProductSync: number
  }> {
    // Get last sync log
    const { data: lastSync } = await DAL.supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Get total invoices count
    const { count: totalInvoices } = await DAL.supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get invoices with products count
    const { data: invoicesWithProducts } = await DAL.supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
      .in('id', 
        DAL.supabase
          .from('invoice_items')
          .select('invoice_id')
      )

    const pendingProductSync = (totalInvoices || 0) - (invoicesWithProducts?.length || 0)

    return {
      lastSync: lastSync || null,
      totalInvoices: totalInvoices || 0,
      invoicesWithProducts: invoicesWithProducts?.length || 0,
      pendingProductSync
    }
  }

  // Create sync service instance for user
  static async createForUser(userId: string): Promise<SyncService | null> {
    const config = await DAL.getMXMerchantConfig(userId)
    
    if (!config) {
      console.error('No MX Merchant configuration found for user:', userId)
      return null
    }

    return new SyncService(userId, config)
  }
}