import { NextRequest, NextResponse } from 'next/server'
import { getAutomationConfig } from '@/services/whatsapp.service'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const config = getAutomationConfig()
    const supabase = getSupabaseAdmin()

    const [convRes, whRes] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
      supabase.from('webhook_events').select('id', { count: 'exact' }),
    ])

    return NextResponse.json({
      status: {
        testMode: config.isTestMode,
        testPhoneNumber: config.testPhone,
        whatsappConfigured: config.hasWhatsAppCreds,
        n8nConfigured: config.hasN8n,
        geminiConfigured: config.hasGemini,
        activeConversationsCount: convRes.count ?? 0,
        totalWebhookEventsCount: whRes.count ?? 0,
      },
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ status: null, error: (err as Error).message }, { status: 500 })
  }
}
