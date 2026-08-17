import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getValidUser } from '@/lib/supabase/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require a valid authenticated session.
    // Cookie presence alone is NOT accepted — token is cryptographically
    // verified via supabase.auth.getUser(token).
    const user = await getValidUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session required' },
        { status: 401 }
      );
    }

    const campaignId = params.id;
    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Update status to paused
    const { error: updateErr } = await supabase
      .from('campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to pause campaign', details: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Campaign paused successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
