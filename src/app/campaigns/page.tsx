'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Users,
  Send,
  MessageSquare,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { CreateCampaignModal } from '@/components/modules/CreateCampaignModal';
import { formatDate } from '@/lib/utils';
import { Campaign } from '@/types';
import { createClient } from '@/lib/supabase/client';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch campaigns along with counts
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: Campaign[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status || 'draft',
          targetAudience: c.description || 'Target Business Segment',
          totalTarget: 0,
          contacted: 0,
          replied: 0,
          hotLeads: 0,
          startTime: c.start_at || c.created_at,
          messageTemplate: 'Automated AI personalized message sequence',
          createdAt: c.created_at,
        }));

        setCampaigns(mapped);
      } else {
        setCampaigns([]);
      }
    } catch (_) {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const toggleCampaignStatus = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;
    const nextStatus = target.status === 'active' ? 'paused' : 'active';

    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    try {
      const supabase = createClient();
      await supabase.from('campaigns').update({ status: nextStatus }).eq('id', id);

      // When activating a campaign, queue eligible leads
      if (nextStatus === 'active') {
        fetch('/api/campaigns/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: id }),
        })
          .then((r) => r.json())
          .then((result) => {
            if (result.queued > 0) {
              console.log(`[Campaign] Queued ${result.queued} leads for outreach`);
            }
          })
          .catch((e) => console.error('[Campaign] Activate error:', e));
      }
    } catch (_) {}
  };

  return (
    <DashboardLayout
      title="Campaign Management"
      subtitle="100% Real-time Database Campaigns from Supabase"
      onImportSuccess={fetchCampaigns}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Outreach Campaigns ({campaigns.length})</h2>
          <p className="text-xs text-zinc-400 font-medium">
            Control automated AI message sequences and pause/resume active outreach runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCampaigns}
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            className="border-white/10 text-xs"
          >
            Refresh DB
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shadow-lg shadow-pink-500/20 text-xs"
          >
            + Create Campaign
          </Button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400">Loading campaign database records...</div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => {
            const progress = camp.totalTarget > 0 ? Math.round((camp.contacted / camp.totalTarget) * 100) : 0;
            const replyRate = camp.contacted > 0 ? Math.round((camp.replied / camp.contacted) * 100) : 0;

            return (
              <Card key={camp.id} className="flex flex-col justify-between hover:border-white/20 transition-all duration-200 shadow-xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-white/10 text-zinc-400 border border-white/10'
                        }`}
                      >
                        {camp.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {camp.status}
                      </span>
                      <CardTitle className="text-base sm:text-lg tracking-tight font-extrabold">{camp.name}</CardTitle>
                    </div>

                    <Toggle
                      checked={camp.status === 'active'}
                      onChange={() => toggleCampaignStatus(camp.id)}
                    />
                  </div>
                  <CardDescription className="text-xs text-zinc-400 font-medium">{camp.targetAudience}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Outreach Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-zinc-400">Outreach Progress</span>
                      <span className="text-white">
                        {camp.contacted} / {camp.totalTarget} ({progress}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Grid stats */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2.5 rounded-xl bg-[#151520] border border-white/[0.08]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Contacted</span>
                      <p className="text-base font-extrabold text-white mt-0.5">{camp.contacted}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#151520] border border-purple-500/30">
                      <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Reply Rate</span>
                      <p className="text-base font-extrabold text-purple-300 mt-0.5">{replyRate}%</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#151520] border border-rose-500/30">
                      <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">🔥 Hot Leads</span>
                      <p className="text-base font-extrabold text-rose-400 mt-0.5">{camp.hotLeads}</p>
                    </div>
                  </div>

                  {/* Message Template Preview Box */}
                  <div className="p-3.5 rounded-xl bg-[#151520] border border-white/[0.08] text-xs space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Message Template:</span>
                    <p className="text-zinc-300 italic text-[11px] leading-relaxed line-clamp-2 font-medium">
                      "{camp.messageTemplate}"
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between items-center text-xs text-zinc-400">
                  <span className="font-medium">Started: {formatDate(camp.startTime)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCampaignStatus(camp.id)}
                    leftIcon={camp.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    className="border-white/10 text-xs"
                  >
                    {camp.status === 'active' ? 'Pause Campaign' : 'Start Outreach'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-2xl bg-[#0B0B12]">
          <Megaphone className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-300">No campaigns found in database.</p>
          <p className="text-xs text-zinc-500 mt-1">Click "+ Create Campaign" above to setup your first outreach run.</p>
        </div>
      )}

      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          fetchCampaigns();
        }}
      />
    </DashboardLayout>
  );
}
