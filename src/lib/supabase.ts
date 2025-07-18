import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types for our database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_user_id: string
          email: string
          first_name: string | null
          last_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          mx_invoice_id: number
          user_id: string
          invoice_number: number
          customer_name: string | null
          customer_number: string | null
          customer_email: string | null
          invoice_date: string | null
          due_date: string | null
          api_created: string | null
          status: string | null
          subtotal_amount: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          balance: number | null
          paid_amount: number | null
          currency: string | null
          receipt_number: string | null
          quantity: number | null
          return_quantity: number | null
          return_status: string | null
          source_type: string | null
          type: string | null
          terms: string | null
          memo: string | null
          is_tax_exempt: boolean | null
          merchant_id: number | null
          raw_data: any | null
          data_sent_status: string
          data_sent_by: string | null
          data_sent_at: string | null
          data_sent_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mx_invoice_id: number
          user_id: string
          invoice_number: number
          customer_name?: string | null
          customer_number?: string | null
          customer_email?: string | null
          invoice_date?: string | null
          due_date?: string | null
          api_created?: string | null
          status?: string | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          balance?: number | null
          paid_amount?: number | null
          currency?: string | null
          receipt_number?: string | null
          quantity?: number | null
          return_quantity?: number | null
          return_status?: string | null
          source_type?: string | null
          type?: string | null
          terms?: string | null
          memo?: string | null
          is_tax_exempt?: boolean | null
          merchant_id?: number | null
          raw_data?: any | null
          data_sent_status?: string
          data_sent_by?: string | null
          data_sent_at?: string | null
          data_sent_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mx_invoice_id?: number
          user_id?: string
          invoice_number?: number
          customer_name?: string | null
          customer_number?: string | null
          customer_email?: string | null
          invoice_date?: string | null
          due_date?: string | null
          api_created?: string | null
          status?: string | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          balance?: number | null
          paid_amount?: number | null
          currency?: string | null
          receipt_number?: string | null
          quantity?: number | null
          return_quantity?: number | null
          return_status?: string | null
          source_type?: string | null
          type?: string | null
          terms?: string | null
          memo?: string | null
          is_tax_exempt?: boolean | null
          merchant_id?: number | null
          raw_data?: any | null
          data_sent_status?: string
          data_sent_by?: string | null
          data_sent_at?: string | null
          data_sent_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          mx_purchase_id: number
          product_name: string
          quantity: number | null
          unit_price: number | null
          subtotal_amount: number | null
          tax_amount: number | null
          discount_amount: number | null
          price_discount_amount: number | null
          total_amount: number | null
          quantity_returned: number | null
          tracking_number: number | null
          api_created: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          mx_purchase_id: number
          product_name: string
          quantity?: number | null
          unit_price?: number | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          price_discount_amount?: number | null
          total_amount?: number | null
          quantity_returned?: number | null
          tracking_number?: number | null
          api_created?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          mx_purchase_id?: number
          product_name?: string
          quantity?: number | null
          unit_price?: number | null
          subtotal_amount?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          price_discount_amount?: number | null
          total_amount?: number | null
          quantity_returned?: number | null
          tracking_number?: number | null
          api_created?: string | null
          created_at?: string
        }
      }
      mx_merchant_configs: {
        Row: {
          id: string
          user_id: string
          merchant_id: number
          consumer_key: string
          consumer_secret: string
          environment: string
          webhook_secret: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          merchant_id: number
          consumer_key: string
          consumer_secret: string
          environment?: string
          webhook_secret?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          merchant_id?: number
          consumer_key?: string
          consumer_secret?: string
          environment?: string
          webhook_secret?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sync_logs: {
        Row: {
          id: string
          user_id: string
          sync_type: string
          status: string
          records_processed: number
          records_failed: number
          error_message: string | null
          started_at: string
          completed_at: string | null
          api_calls_made: number
          last_processed_invoice_id: number | null
        }
        Insert: {
          id?: string
          user_id: string
          sync_type: string
          status: string
          records_processed?: number
          records_failed?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          api_calls_made?: number
          last_processed_invoice_id?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          sync_type?: string
          status?: string
          records_processed?: number
          records_failed?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          api_calls_made?: number
          last_processed_invoice_id?: number | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']