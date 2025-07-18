import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, notes } = body;
    
    // Validate status
    if (!['yes', 'no'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "yes" or "no"' },
        { status: 400 }
      );
    }
    
    console.log(`Updating data sent status for invoice ${id} to "${status}"`);
    
    // Update the database record
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        data_sent_status: status,
        data_sent_by: 'admin-user', // Would come from auth context
        data_sent_at: new Date().toISOString(),
        data_sent_notes: notes || null,
        updated_at: new Date().toISOString()
      })
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
    
    return NextResponse.json({
      success: true,
      message: `Data sent status updated to "${status}"`,
      data: {
        data_sent_status: data.data_sent_status,
        data_sent_by: data.data_sent_by,
        data_sent_at: data.data_sent_at,
        data_sent_notes: data.data_sent_notes
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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