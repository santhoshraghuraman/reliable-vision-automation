import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { DashboardStats } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const supabase = getSupabaseAdmin()
    const [leadsResult, conversationsResult, followUpsResult, aiScoresResult] = await Promise.all([
      supabase.from('leads').select('status'),
      supabase.from('conversations').select('status').eq('status', 'active'),
      supabase.from('followups').select('status').eq('status', 'pending'),
      supabase.from('ai_scores').select('score, classification'),
    ])

    if (leadsResult.error) {
      return NextResponse.json(
        {
          stats: {
            totalLeads: 0,
            hotLeads: 0,
            warmLeads: 0,
            coldLeads: 0,
            contactedLeads: 0,
            interestedLeads: 0,
            notInterestedLeads: 0,
            convertedLeads: 0,
            activeConversations: 0,
            pendingFollowUps: 0,
          },
          error: leadsResult.error.message,
        },
        { status: 500 }
      )
    }

    const leads = leadsResult.data ?? []
    const scores = aiScoresResult.data ?? []

    const totalScored = scores.length
    const scoreSum = scores.reduce((acc, curr) => acc + (curr.score || 0), 0)
    const averageScore = totalScored > 0 ? Math.round(scoreSum / totalScored) : 0
    const aiHotCount = scores.filter((s) => s.classification === 'HOT' || s.score >= 80).length
    const aiWarmCount = scores.filter((s) => s.classification === 'WARM' || (s.score >= 50 && s.score < 80)).length
    const aiColdCount = scores.filter((s) => s.classification === 'COLD' || s.score < 50).length

    const stats: DashboardStats = {
      totalLeads: leads.length,
      hotLeads: leads.filter((l) => l.status === 'HOT').length,
      warmLeads: leads.filter((l) => l.status === 'WARM').length,
      coldLeads: leads.filter((l) => l.status === 'COLD').length,
      contactedLeads: leads.filter((l) => l.status === 'CONTACTED').length,
      interestedLeads: leads.filter((l) => l.status === 'INTERESTED').length,
      notInterestedLeads: leads.filter((l) => l.status === 'NOT_INTERESTED').length,
      convertedLeads: leads.filter((l) => l.status === 'CONVERTED').length,
      activeConversations: conversationsResult.data?.length ?? 0,
      pendingFollowUps: followUpsResult.data?.length ?? 0,
      totalScored,
      averageScore,
      aiHotCount,
      aiWarmCount,
      aiColdCount,
    }

    return NextResponse.json({ stats, error: null })
  } catch (err) {
    return NextResponse.json(
      {
        stats: {
          totalLeads: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          contactedLeads: 0,
          interestedLeads: 0,
          notInterestedLeads: 0,
          convertedLeads: 0,
          activeConversations: 0,
          pendingFollowUps: 0,
        },
        error: (err as Error).message,
      },
      { status: 500 }
    )
  }
}
