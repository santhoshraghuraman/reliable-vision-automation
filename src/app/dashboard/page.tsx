'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Send,
  MessageSquareReply,
  Flame,
  Zap,
  Snowflake,
  Megaphone,
  Sparkles,
  PhoneCall,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatTimeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    contacted: 0,
    replies: 0,
    coldLeads: 0,
    warmLeads: 0,
    hotLeads: 0,
    activeCampaignName: 'No Active Campaign',
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Total leads count
      const { count: totalCount, error: totalErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      if (!totalErr) {
        // 2. Contacted count
        const { count: contactedCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_status', 'contacted');

        // 3. Replies count
        const { count: repliesCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_status', 'replied');

        // 4. Temperature counts
        const { count: coldCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cold');

        const { count: warmCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'warm');

        const { count: hotCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hot');

        // 5. Active campaign
        const { data: activeCamp } = await supabase
          .from('campaigns')
          .select('name')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        const activeName = activeCamp && activeCamp.length > 0 ? activeCamp[0].name : 'No Active Campaign';

        // 6. Recent 5 leads
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        // 7. Recent conversations
        const { data: convsData } = await supabase
          .from('conversations')
          .select('*, leads(name, business, phone)')
          .order('last_message_at', { ascending: false })
          .limit(5);

        setMetrics({
          totalLeads: totalCount || 0,
          contacted: contactedCount || 0,
          replies: repliesCount || 0,
          coldLeads: coldCount || 0,
          warmLeads: warmCount || 0,
          hotLeads: hotCount || 0,
          activeCampaignName: activeName,
        });

        setRecentLeads(leadsData || []);
        setRecentConversations(convsData || []);
      } else {
        setMetrics({
          totalLeads: 0,
          contacted: 0,
          replies: 0,
          coldLeads: 0,
          warmLeads: 0,
          hotLeads: 0,
          activeCampaignName: 'No Active Campaign',
        });
        setRecentLeads([]);
        setRecentConversations([]);
      }
    } catch (_) {
      setMetrics({
        totalLeads: 0,
        contacted: 0,
        replies: 0,
        coldLeads: 0,
        warmLeads: 0,
        hotLeads: 0,
        activeCampaignName: 'No Active Campaign',
      });
      setRecentLeads([]);
      setRecentConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <DashboardLayout
      title="Admin Dashboard Overview"
      subtitle="Reliable Vision | Web Studio • 100% Real-time Database Powered"
      onImportSuccess={fetchDashboardData}
    >
      {/* Top Banner: Active Campaign Quick Status */}
      <div className="relative overflow-hidden rounded-2xl bg-[#101018] p-6 border border-white/[0.08] shadow-2xl">
        {/* Ambient backdrop gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#833AB4]/15 via-[#E1306C]/10 to-[#F77737]/10 pointer-events-none" />
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="h-48 w-48 text-pink-400" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Active Campaign
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                • Supabase PostgreSQL Database Connected
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {metrics.activeCampaignName}
            </h2>
            <p className="text-xs text-zinc-300 font-normal">
              Automated lead management and campaign status for local business outreach.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/campaigns">
              <Button variant="primary" size="sm" leftIcon={<Megaphone className="h-4 w-4" />} className="shadow-lg shadow-pink-500/20">
                Manage Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of 6 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Leads */}
        <Card className="hover:border-white/20 transition-all duration-200 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Leads</span>
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.totalLeads.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Supabase Real DB</span>
          </CardContent>
        </Card>

        {/* Contacted */}
        <Card className="hover:border-white/20 transition-all duration-200 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Contacted</span>
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.contacted.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Outreach Sent</span>
          </CardContent>
        </Card>

        {/* Replies */}
        <Card className="hover:border-white/20 transition-all duration-200 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Replies</span>
              <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/20">
                <MessageSquareReply className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-white tracking-tight">
              {metrics.replies.toLocaleString()}
            </div>
            <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Inbound Replies</span>
          </CardContent>
        </Card>

        {/* Cold Leads */}
        <Card className="hover:border-white/20 transition-all duration-200 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Cold Leads</span>
              <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
                <Snowflake className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-sky-400 tracking-tight">
              {metrics.coldLeads.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Initial / No reply</span>
          </CardContent>
        </Card>

        {/* Warm Leads */}
        <Card className="hover:border-white/20 transition-all duration-200 shadow-lg">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Warm Leads</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
              {metrics.warmLeads.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Inquiring / Nurturing</span>
          </CardContent>
        </Card>

        {/* Hot Leads */}
        <Card className="hover:border-rose-500/40 border-rose-500/30 bg-[#151520] transition-all duration-200 shadow-lg shadow-rose-500/10">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Hot Leads</span>
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/30">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
              {metrics.hotLeads.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-300 font-extrabold uppercase tracking-wider">🔥 Call / Action Ready</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Section: Recent Leads & Live Conversations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Leads Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold tracking-tight">Recent Database Leads</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Newly imported or added client leads</CardDescription>
              </div>
              <Link href="/leads">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />} className="text-xs text-pink-400 hover:text-pink-300">
                  View All Leads
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Contact</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Location / City</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-zinc-400">
                        Loading database records...
                      </TableCell>
                    </TableRow>
                  ) : recentLeads.length > 0 ? (
                    recentLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-white/[0.03]">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs">{lead.name}</span>
                            <span className="text-[11px] text-zinc-400 font-mono">{lead.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-200 font-medium">{lead.business}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-400 font-medium">{lead.city || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="temperature" temperature={lead.status as any || 'cold'} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-zinc-400">
                        No lead records imported yet. Upload an Excel file to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Live Conversations Feed */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold tracking-tight">Live Conversations</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Inbound client messages</CardDescription>
              </div>
              <Link href="/conversations">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />} className="text-xs text-purple-400 hover:text-purple-300">
                  Inbox
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-6 text-center text-xs text-zinc-400">Loading conversations...</div>
              ) : recentConversations.length > 0 ? (
                recentConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href="/conversations"
                    className="flex flex-col p-3 rounded-xl bg-[#151520] border border-white/[0.08] hover:border-white/20 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{conv.leads?.name || 'Client'}</span>
                      <span className="text-[10px] text-zinc-500 font-medium">{formatTimeAgo(conv.last_message_at)}</span>
                    </div>
                    <span className="text-xs text-zinc-300 font-medium">{conv.leads?.business}</span>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-xl bg-[#0B0B12]">
                  <MessageSquare className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  No active conversations found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
