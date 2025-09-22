import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getTexasISOString } from '@/lib/timezone';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoice_id, transaction_id, status, notes } = body;
    
    // Validate that either invoice_id or transaction_id is provided
    if (!invoice_id && !transaction_id) {
      return NextResponse.json(
        { error: 'Either invoice_id or transaction_id must be provided' },
        { status: 400 }
      );
    }
    
    // Validate status
    if (!['yes', 'no'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "yes" or "no"' },
        { status: 400 }
      );
    }
    
    const timestamp = getTexasISOString();
    
    if (invoice_id) {
      // Update invoice table (existing flow)
      console.log(`Updating data sent status for invoice ${invoice_id} to "${status}"`);
      
      const updatePayload = {
        data_sent_status: status,
        data_sent_at: timestamp,
        data_sent_notes: notes || null,
        ordered_by_provider_at: timestamp,
        updated_at: timestamp
      };
      
      const { data, error } = await supabaseAdmin
        .from('invoices')
        .update(updatePayload)
        .eq('id', invoice_id)
        .select()
        .single();
      
      if (error) {
        console.error('Database error updating invoice data sent status:', error);
        return NextResponse.json(
          { error: 'Failed to update invoice data sent status' },
          { status: 500 }
        );
      }
      
      console.log(`Successfully updated data sent status for invoice ${invoice_id}`);
      
      return NextResponse.json({
        success: true,
        message: `Invoice data sent status updated to "${status}"`,
        data: {
          type: 'invoice',
          id: invoice_id,
          data_sent_status: data.data_sent_status,
          data_sent_at: data.data_sent_at,
          ordered_by_provider_at: data.ordered_by_provider_at
        }
      });
      
    } else if (transaction_id) {
      // Update transaction table (new flow)
      console.log(`Updating provider status for transaction ${transaction_id} to "${status}"`);
      
      const updatePayload = {
        ordered_by_provider: status === 'yes',
        ordered_by_provider_at: timestamp,
        updated_at: timestamp
      };
      
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .update(updatePayload)
        .eq('id', transaction_id)
        .select()
        .single();
      
      if (error) {
        console.error('Database error updating transaction provider status:', error);
        return NextResponse.json(
          { error: 'Failed to update transaction provider status' },
          { status: 500 }
        );
      }
      
      console.log(`Successfully updated provider status for transaction ${transaction_id}`);
      
      return NextResponse.json({
        success: true,
        message: `Transaction provider status updated to "${status}"`,
        data: {
          type: 'transaction',
          id: transaction_id,
          ordered_by_provider: data.ordered_by_provider,
          ordered_by_provider_at: data.ordered_by_provider_at
        }
      });
    }
    
  } catch (error) {
    console.error('Error updating data sent status:', error);
    return NextResponse.json(
      { error: 'Failed to update data sent status' },
      { status: 500 }
    );
  }
}