'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  MessageSquare,
  Flame,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalLeads: 0,
    contactedLeads: 0,
    repliedLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    convertedLeads: 0,
    replyPercentage: 0,
    hotLeadPercentage: 0,
    conversionPercentage: 0,
    categoryBreakdown: [] as { category: string; count: number; percentage: number }[],
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: leads, error } = await supabase.from('leads').select('*');

      if (!error && leads) {
        const total = leads.length;

        if (total === 0) {
          setAnalytics({
            totalLeads: 0,
            contactedLeads: 0,
            repliedLeads: 0,
            hotLeads: 0,
            warmLeads: 0,
            coldLeads: 0,
            convertedLeads: 0,
            replyPercentage: 0,
            hotLeadPercentage: 0,
            conversionPercentage: 0,
            categoryBreakdown: [],
          });
          return;
        }

        let contacted = 0;
        let replied = 0;
        let hot = 0;
        let warm = 0;
        let cold = 0;
        let converted = 0;
        const catMap = new Map<string, number>();

        leads.forEach((item: any) => {
          // Campaign status checks
          if (item.campaign_status && item.campaign_status !== 'pending') contacted++;
          if (item.campaign_status === 'replied') replied++;
          if (item.campaign_status === 'completed') converted++;

          // Temperature checks
          const temp = item.status || 'cold';
          if (temp === 'hot') hot++;
          else if (temp === 'warm') warm++;
          else cold++;

          // Category grouping
          const catName = item.category?.trim() || 'General Business';
          catMap.set(catName, (catMap.get(catName) || 0) + 1);
        });

        const replyPct = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
        const hotPct = Math.round((hot / total) * 100);
        const convPct = Math.round((converted / total) * 100);

        const breakdown = Array.from(catMap.entries()).map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / total) * 100),
        })).sort((a, b) => b.count - a.count);

        setAnalytics({
          totalLeads: total,
          contactedLeads: contacted,
          repliedLeads: replied,
          hotLeads: hot,
          warmLeads: warm,
          coldLeads: cold,
          convertedLeads: converted,
          replyPercentage: replyPct,
          hotLeadPercentage: hotPct,
          conversionPercentage: convPct,
          categoryBreakdown: breakdown,
        });
      } else {
        setAnalytics({
          totalLeads: 0,
          contactedLeads: 0,
          repliedLeads: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          convertedLeads: 0,
          replyPercentage: 0,
          hotLeadPercentage: 0,
          conversionPercentage: 0,
          categoryBreakdown: [],
        });
      }
    } catch (_) {
      setAnalytics({
        totalLeads: 0,
        contactedLeads: 0,
        repliedLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        convertedLeads: 0,
        replyPercentage: 0,
        hotLeadPercentage: 0,
        conversionPercentage: 0,
        categoryBreakdown: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <DashboardLayout
      title="Performance Analytics & Funnel"
      subtitle="100% Real-time Database Metrics calculated from Supabase"
      onImportSuccess={fetchAnalytics}
    >
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-white/20 transition-all duration-200 shadow-xl">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs font-bold text-zinc-400">Total Leads Ingested</span>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {analytics.totalLeads.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Real database records</span>
          </CardContent>
        </Card>

        <Card className="hover:border-white/20 transition-all duration-200 shadow-xl">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs font-bold text-zinc-400">Outreach Reply Rate</span>
            <div className="text-3xl font-extrabold text-pink-400 tracking-tight">
              {analytics.replyPercentage}%
            </div>
            <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
              {analytics.repliedLeads} Replies / {analytics.contactedLeads} Sent
            </span>
          </CardContent>
        </Card>

        <Card className="hover:border-rose-500/40 border-rose-500/30 bg-[#151520] transition-all duration-200 shadow-xl shadow-rose-500/10">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">🔥 Hot Lead Rate</span>
            <div className="text-3xl font-extrabold text-rose-400 tracking-tight">
              {analytics.hotLeadPercentage}%
            </div>
            <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
              {analytics.hotLeads} Hot Leads Total
            </span>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/40 border-emerald-500/30 transition-all duration-200 shadow-xl shadow-emerald-500/10">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Deal Conversion</span>
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {analytics.conversionPercentage}%
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              {analytics.convertedLeads} Signed Contracts
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Lead Conversion Funnel</CardTitle>
          <CardDescription>
            Real-time step-by-step analysis from initial Excel ingestion to completed contracts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3.5">
            {/* Step 1: Total Leads */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-300">1. Total Ingested Leads</span>
                <span className="text-white">{analytics.totalLeads.toLocaleString()} (100%)</span>
              </div>
              <div className="h-6 w-full rounded-xl bg-[#0B0B12] p-1 border border-white/[0.08]">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] transition-all duration-500 flex items-center px-3 text-[10px] text-white font-extrabold"
                  style={{ width: analytics.totalLeads > 0 ? '100%' : '0%' }}
                />
              </div>
            </div>

            {/* Step 2: Contacted */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-300">2. Outbound Sent</span>
                <span className="text-cyan-400">
                  {analytics.contactedLeads} ({analytics.totalLeads > 0 ? Math.round((analytics.contactedLeads / analytics.totalLeads) * 100) : 0}%)
                </span>
              </div>
              <div className="h-6 w-full rounded-xl bg-[#0B0B12] p-1 border border-white/[0.08]">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${analytics.totalLeads > 0 ? Math.round((analytics.contactedLeads / analytics.totalLeads) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Step 3: Replies */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-300">3. Inbound Client Replies</span>
                <span className="text-pink-400">
                  {analytics.repliedLeads} ({analytics.totalLeads > 0 ? Math.round((analytics.repliedLeads / analytics.totalLeads) * 100) : 0}%)
                </span>
              </div>
              <div className="h-6 w-full rounded-xl bg-[#0B0B12] p-1 border border-white/[0.08]">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${analytics.totalLeads > 0 ? Math.round((analytics.repliedLeads / analytics.totalLeads) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Step 4: Hot Leads */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-400">4. 🔥 Qualified Hot Leads</span>
                <span className="text-rose-400">
                  {analytics.hotLeads} ({analytics.hotLeadPercentage}%)
                </span>
              </div>
              <div className="h-6 w-full rounded-xl bg-[#0B0B12] p-1 border border-white/[0.08]">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
                  style={{ width: `${analytics.hotLeadPercentage}%` }}
                />
              </div>
            </div>

            {/* Step 5: Converted */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">5. Signed Web Studio Clients</span>
                <span className="text-emerald-400">
                  {analytics.convertedLeads} ({analytics.conversionPercentage}%)
                </span>
              </div>
              <div className="h-6 w-full rounded-xl bg-[#0B0B12] p-1 border border-white/[0.08]">
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${analytics.conversionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown & Temperature Breakdown Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Industry Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base tracking-tight font-extrabold">Industry Sector Distribution</CardTitle>
            <CardDescription className="text-zinc-400 font-medium">Calculated dynamically from imported leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400">Loading database records...</div>
            ) : analytics.categoryBreakdown.length > 0 ? (
              analytics.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-200">{cat.category}</span>
                    <span className="text-zinc-400 font-medium">
                      {cat.count} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-xl bg-[#0B0B12]">
                No category data available in database.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Temperature Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base tracking-tight font-extrabold">AI Qualification Classification</CardTitle>
            <CardDescription className="text-zinc-400 font-medium">Cold vs Warm vs Hot leads distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#151520] border border-rose-500/30 shadow-lg shadow-rose-500/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">🔥 HOT LEADS</span>
                <p className="text-xs text-zinc-300 mt-0.5 font-medium">High intent, requested call or proposal</p>
              </div>
              <span className="text-2xl font-extrabold text-rose-400 tracking-tight">{analytics.hotLeads}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#151520] border border-amber-500/30 shadow-lg shadow-amber-500/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">⚡ WARM LEADS</span>
                <p className="text-xs text-zinc-300 mt-0.5 font-medium">Replied, inquiring about redesign or pricing</p>
              </div>
              <span className="text-2xl font-extrabold text-amber-400 tracking-tight">{analytics.warmLeads}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#151520] border border-sky-500/30 shadow-lg shadow-sky-500/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">❄️ COLD LEADS</span>
                <p className="text-xs text-zinc-300 mt-0.5 font-medium">No response or initial outreach state</p>
              </div>
              <span className="text-2xl font-extrabold text-sky-400 tracking-tight">{analytics.coldLeads}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
