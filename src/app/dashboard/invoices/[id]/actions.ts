'use server';

import { DataSentUpdate } from '@/types/invoice';
import { supabaseAdmin } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getTexasISOString } from '@/lib/timezone';

export async function updateDataSentStatus(update: DataSentUpdate) {
  try {
    console.log('Server action - Update status:', update);
    
    // Validate status
    if (!['yes', 'no'].includes(update.status)) {
      return { success: false, error: 'Invalid status. Must be "yes" or "no"' };
    }
    
    const timestamp = getTexasISOString();
    console.log(`Server action - Setting ordered_by_provider_at to: ${timestamp}`);
    
    const updatePayload = {
      data_sent_status: update.status,
      data_sent_at: timestamp,
      data_sent_notes: update.notes || null,
      ordered_by_provider_at: timestamp,
      updated_at: timestamp
    };
    
    console.log('Server action - Update payload:', updatePayload);
    
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updatePayload)
      .eq('id', update.invoice_id)
      .select()
      .single();
    
    if (error) {
      console.error('Server action - Database error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Server action - Database response data:', data);
    console.log('Server action - Updated ordered_by_provider_at in DB:', data.ordered_by_provider_at);
    
    // Revalidate the current page to refresh the data
    revalidatePath(`/dashboard/invoices/${data.mx_invoice_id}`);
    
    return { 
      success: true, 
      data: {
        data_sent_status: data.data_sent_status,
        data_sent_by: data.data_sent_by,
        data_sent_at: data.data_sent_at,
        data_sent_notes: data.data_sent_notes,
        ordered_by_provider_at: data.ordered_by_provider_at
      }
    };
  } catch (error) {
    console.error('Failed to update status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}