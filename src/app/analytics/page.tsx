'use client';

import React from 'react';
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
import { MOCK_ANALYTICS_DATA, MOCK_SUMMARY_METRICS } from '@/lib/mockData';

export default function AnalyticsPage() {
  const data = MOCK_ANALYTICS_DATA;

  return (
    <DashboardLayout
      title="Performance Analytics & Funnel"
      subtitle="Insights into WhatsApp outreach response rates, lead temperatures, and conversions"
    >
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-400">Total Leads Ingested</span>
            <div className="text-2xl font-extrabold text-white">{data.totalLeads.toLocaleString()}</div>
            <span className="text-[11px] text-emerald-400 font-medium">100% database coverage</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-400">Outreach Reply Rate</span>
            <div className="text-2xl font-extrabold text-purple-400">{data.replyPercentage}%</div>
            <span className="text-[11px] text-purple-400 font-medium">Above industry avg (25%)</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-rose-400">🔥 Hot Lead Qualification Rate</span>
            <div className="text-2xl font-extrabold text-rose-400">{data.hotLeadPercentage}%</div>
            <span className="text-[11px] text-rose-300 font-medium">43 high-intent business leads</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-emerald-400">Website Deal Conversion</span>
            <div className="text-2xl font-extrabold text-emerald-400">{data.conversionPercentage}%</div>
            <span className="text-[11px] text-emerald-400 font-medium">18 signed website packages</span>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel Section */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Conversion Funnel</CardTitle>
          <CardDescription>
            Step-by-step drop-off analysis from initial Excel ingestion to paid web studio contracts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Step 1: Total Leads */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">1. Total Ingested Leads</span>
                <span className="text-white">1,248 (100%)</span>
              </div>
              <div className="h-6 w-full rounded-lg bg-slate-950 p-1 border border-slate-800">
                <div className="h-full rounded bg-brand-600 w-full flex items-center px-3 text-[10px] text-white font-bold" />
              </div>
            </div>

            {/* Step 2: Contacted */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">2. WhatsApp Outbound Sent</span>
                <span className="text-cyan-400">850 (68.1%)</span>
              </div>
              <div className="h-6 w-full rounded-lg bg-slate-950 p-1 border border-slate-800">
                <div className="h-full rounded bg-cyan-500 w-[68%]" />
              </div>
            </div>

            {/* Step 3: Replies */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">3. Inbound Client Replies</span>
                <span className="text-purple-400">342 (40.2%)</span>
              </div>
              <div className="h-6 w-full rounded-lg bg-slate-950 p-1 border border-slate-800">
                <div className="h-full rounded bg-purple-500 w-[40%]" />
              </div>
            </div>

            {/* Step 4: Hot Leads */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-rose-400">4. 🔥 Qualified Hot Leads</span>
                <span className="text-rose-400">43 (12.6%)</span>
              </div>
              <div className="h-6 w-full rounded-lg bg-slate-950 p-1 border border-slate-800">
                <div className="h-full rounded bg-rose-500 w-[12.6%]" />
              </div>
            </div>

            {/* Step 5: Converted */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-400">5. Signed Web Studio Clients</span>
                <span className="text-emerald-400">18 (5.1%)</span>
              </div>
              <div className="h-6 w-full rounded-lg bg-slate-950 p-1 border border-slate-800">
                <div className="h-full rounded bg-emerald-500 w-[5.1%]" />
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
            <CardTitle className="text-base">Industry Sector Distribution</CardTitle>
            <CardDescription>Breakdown by business sector in Tamil Nadu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-slate-400">
                    {cat.count} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Temperature Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Qualification Classification</CardTitle>
            <CardDescription>Cold vs Warm vs Hot leads distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-400">🔥 HOT LEADS</span>
                <p className="text-xs text-slate-300 mt-0.5">High intent, requested call or proposal</p>
              </div>
              <span className="text-xl font-extrabold text-rose-400">{data.temperatureDistribution.hot.count}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400">⚡ WARM LEADS</span>
                <p className="text-xs text-slate-300 mt-0.5">Replied, inquiring about redesign or pricing</p>
              </div>
              <span className="text-xl font-extrabold text-amber-400">{data.temperatureDistribution.warm.count}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-400">❄️ COLD LEADS</span>
                <p className="text-xs text-slate-300 mt-0.5">No response or initial outreach state</p>
              </div>
              <span className="text-xl font-extrabold text-sky-400">{data.temperatureDistribution.cold.count}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
