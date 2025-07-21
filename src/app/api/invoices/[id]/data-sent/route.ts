import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTexasISOString } from '@/lib/timezone';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;
    
    // Validate status
    if (!['yes', 'no'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "yes" or "no"' },
        { status: 400 }
      );
    }
    
    const timestamp = getTexasISOString();
    console.log(`Updating data sent status for invoice ${id} to "${status}"`);
    console.log(`Setting ordered_by_provider_at to: ${timestamp}`);
    
    const updatePayload = {
      data_sent_status: status,
      data_sent_at: timestamp,
      data_sent_notes: notes || null,
      ordered_by_provider_at: timestamp,
      updated_at: timestamp
    };
    
    console.log('Update payload:', updatePayload);
    
    // Update the database record - always update ordered_by_provider_at timestamp
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Database error updating data sent status:', error);
      return NextResponse.json(
        { error: 'Failed to update data sent status' },
        { status: 500 }
      );
    }
    
    console.log(`Successfully updated data sent status for invoice ${id}`);
    console.log('Database response data:', data);
    console.log('Updated ordered_by_provider_at in DB:', data.ordered_by_provider_at);
    
    return NextResponse.json({
      success: true,
      message: `Data sent status updated to "${status}"`,
      data: {
        data_sent_status: data.data_sent_status,
        data_sent_by: data.data_sent_by,
        data_sent_at: data.data_sent_at,
        data_sent_notes: data.data_sent_notes,
        ordered_by_provider_at: data.ordered_by_provider_at
      }
    });
    
  } catch (error) {
    console.error('Error updating data sent status:', error);
    return NextResponse.json(
      { error: 'Failed to update data sent status' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch the current status from database
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('data_sent_status, data_sent_by, data_sent_at, data_sent_notes')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Database error fetching data sent status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data sent status' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching data sent status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sent status' },
      { status: 500 }
    );
  }
}