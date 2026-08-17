import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getValidUser } from '@/lib/supabase/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Authenticate the caller to prevent open internet access
    const user = await getValidUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    const campaignId = params.id;
    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }

    const body = await request.json();
    const { campaign_lead_id } = body;

    if (!campaign_lead_id) {
      return NextResponse.json({ error: 'Missing campaign_lead_id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Perform the atomic state transition returning the updated row
    const { data: updatedRows, error: updateErr } = await supabase
      .from('campaign_leads')
      .update({
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', campaign_lead_id)
      .eq('campaign_id', campaignId)
      .eq('status', 'failed')
      .select();

    if (updateErr) {
      return NextResponse.json(
        { error: 'Database error occurred during retry attempt', details: updateErr.message },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Lead is not eligible for retry. It must exist, belong to this campaign, and have a status of "failed".' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign lead safely transitioned back to pending for retry',
      data: updatedRows[0]
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
