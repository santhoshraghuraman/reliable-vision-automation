import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { verifyWebsite } from '@/lib/website-verifier';

/**
 * POST /api/discovery/website
 * 
 * Verifies the website URLs for a specific import batch.
 * Expects: { batch_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { batch_id } = await request.json();

    if (!batch_id) {
      return NextResponse.json({ error: 'Missing batch_id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch leads for this batch that haven't been verified yet
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, website_url, website_status')
      .eq('import_batch_id', batch_id)
      .eq('website_status', 'UNKNOWN');

    if (leadsErr || !leads) {
      return NextResponse.json({ error: 'Failed to fetch leads for verification', details: leadsErr }, { status: 500 });
    }

    if (leads.length === 0) {
      return NextResponse.json({ success: true, verified: 0, message: 'No leads require verification.' });
    }

    console.log(`[Website Verification] Starting verification for ${leads.length} leads in batch ${batch_id}`);

    // Concurrency limit to prevent overwhelming the server or causing timeouts
    const concurrencyLimit = 10;
    let verifiedCount = 0;

    for (let i = 0; i < leads.length; i += concurrencyLimit) {
      const chunk = leads.slice(i, i + concurrencyLimit);
      
      const verificationPromises = chunk.map(async (lead) => {
        if (!lead.website_url) {
          // No URL provided, and no external discovery API available yet.
          // Keep as UNKNOWN, but update checked_at timestamp.
          await supabase
            .from('leads')
            .update({ 
              website_checked_at: new Date().toISOString(),
              website_check_error: 'No URL provided in Excel and no automated discovery API configured.'
            })
            .eq('id', lead.id);
          return;
        }

        const result = await verifyWebsite(lead.website_url);

        await supabase
          .from('leads')
          .update({
            website_status: result.status,
            website_url: result.finalUrl || lead.website_url, // Update to normalized/redirected URL if available
            website_check_error: result.error || null,
            website_checked_at: new Date().toISOString()
          })
          .eq('id', lead.id);
          
        verifiedCount++;
      });

      await Promise.all(verificationPromises);
      
      // Small delay between chunks to avoid rate limits / connection drops
      if (i + concurrencyLimit < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      verified: verifiedCount,
      total_processed: leads.length,
      message: `Successfully processed ${leads.length} leads. Verified ${verifiedCount} URLs.`
    });

  } catch (err: any) {
    console.error('[Website Verification] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during website verification.' },
      { status: 500 }
    );
  }
}
