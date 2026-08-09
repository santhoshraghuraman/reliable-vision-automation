'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { MOCK_CAMPAIGNS } from '@/lib/mockData';
import { CreateCampaignModal } from '@/components/modules/CreateCampaignModal';
import { formatDate } from '@/lib/utils';
import { Campaign } from '@/types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const toggleCampaignStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'paused' : 'active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  return (
    <DashboardLayout
      title="Campaign Management"
      subtitle="Automated WhatsApp outreach campaigns targeting Tamil Nadu businesses"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Outreach Campaigns ({campaigns.length})</h2>
          <p className="text-xs text-slate-400">
            Control automated AI message sequences, pause/resume active outreach runs.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          + Create Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp) => {
          const progress = Math.round((camp.contacted / camp.totalTarget) * 100);
          const replyRate =
            camp.contacted > 0 ? Math.round((camp.replied / camp.contacted) * 100) : 0;

          return (
            <Card key={camp.id} className="flex flex-col justify-between hover:border-slate-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        camp.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : camp.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {camp.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {camp.status}
                    </span>
                    <CardTitle className="text-base sm:text-lg">{camp.name}</CardTitle>
                  </div>

                  <Toggle
                    checked={camp.status === 'active'}
                    onChange={() => toggleCampaignStatus(camp.id)}
                  />
                </div>
                <CardDescription className="text-xs">{camp.targetAudience}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Outreach Progress Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Outreach Progress</span>
                    <span className="text-white">
                      {camp.contacted} / {camp.totalTarget} ({progress}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-cyan-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Contacted</span>
                    <p className="text-sm font-bold text-white mt-0.5">{camp.contacted}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-purple-500/30">
                    <span className="text-[10px] text-purple-400 uppercase font-semibold">Reply Rate</span>
                    <p className="text-sm font-bold text-purple-400 mt-0.5">{replyRate}%</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/30">
                    <span className="text-[10px] text-rose-400 uppercase font-semibold">🔥 Hot Leads</span>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{camp.hotLeads}</p>
                  </div>
                </div>

                {/* Message Template Preview Box */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Message Template:</span>
                  <p className="text-slate-300 italic text-[11px] leading-relaxed line-clamp-2">
                    "{camp.messageTemplate}"
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between items-center text-xs text-slate-400">
                <span>Started: {formatDate(camp.startTime)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCampaignStatus(camp.id)}
                  leftIcon={camp.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                >
                  {camp.status === 'active' ? 'Pause Campaign' : 'Start Outreach'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <CreateCampaignModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </DashboardLayout>
  );
}
