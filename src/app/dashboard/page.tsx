'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Send,
  MessageSquareReply,
  Flame,
  Zap,
  Snowflake,
  Megaphone,
  ArrowUpRight,
  Sparkles,
  PhoneCall,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import {
  MOCK_SUMMARY_METRICS,
  MOCK_LEADS,
  MOCK_CONVERSATIONS,
  MOCK_CAMPAIGNS,
} from '@/lib/mockData';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { BUSINESS_INFO } from '@/lib/constants';

export default function DashboardPage() {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  const filteredLeads = MOCK_LEADS.filter((l) => {
    if (selectedCategoryFilter === 'All') return true;
    return l.category === selectedCategoryFilter;
  });

  return (
    <DashboardLayout
      title="Admin Dashboard Overview"
      subtitle="Reliable Vision | Web Studio • AI Automation Control Center"
    >
      {/* Top Banner: Active Campaign Quick Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900/90 via-slate-900 to-slate-900 p-5 sm:p-6 border border-brand-500/30 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="h-48 w-48 text-brand-400" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Active Campaign
              </span>
              <span className="text-xs text-slate-400">• Tamil Nadu Outreach</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {MOCK_SUMMARY_METRICS.activeCampaignName}
            </h2>
            <p className="text-xs text-slate-300">
              Automated WhatsApp outreach running via AI rules for business website inquiries in Tamil Nadu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/campaigns">
              <Button variant="primary" size="sm" leftIcon={<Megaphone className="h-4 w-4" />}>
                Manage Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of 6 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Leads */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Leads</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {MOCK_SUMMARY_METRICS.totalLeads.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium">↑ +14% this week</span>
          </CardContent>
        </Card>

        {/* Contacted */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Contacted</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {MOCK_SUMMARY_METRICS.contacted.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">68.1% of total</span>
          </CardContent>
        </Card>

        {/* Replies */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Replies</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <MessageSquareReply className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {MOCK_SUMMARY_METRICS.replies.toLocaleString()}
            </div>
            <span className="text-[11px] text-purple-400 font-medium">40.2% reply rate</span>
          </CardContent>
        </Card>

        {/* Cold Leads */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Cold Leads</span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Snowflake className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-sky-400">
              {MOCK_SUMMARY_METRICS.coldLeads.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Initial / No reply</span>
          </CardContent>
        </Card>

        {/* Warm Leads */}
        <Card className="hover:border-slate-700 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Warm Leads</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-400">
              {MOCK_SUMMARY_METRICS.warmLeads.toLocaleString()}
            </div>
            <span className="text-[11px] text-amber-400 font-medium">Inquiring / Nurturing</span>
          </CardContent>
        </Card>

        {/* Hot Leads */}
        <Card className="hover:border-slate-700 border-rose-500/30 bg-rose-500/5 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400">Hot Leads</span>
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 animate-pulse">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-400">
              {MOCK_SUMMARY_METRICS.hotLeads}
            </div>
            <span className="text-[11px] text-rose-300 font-bold">🔥 Call / Action Ready</span>
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
                <CardTitle>Recent Business Leads</CardTitle>
                <CardDescription>
                  Latest target clients from Tamil Nadu for web studio services.
                </CardDescription>
              </div>
              <Link href="/leads">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  View All Leads
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead & Business</TableHead>
                    <TableHead>Category / City</TableHead>
                    <TableHead>AI Status</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.slice(0, 5).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-xs sm:text-sm">
                            {lead.name}
                          </span>
                          <span className="text-slate-400 text-xs">{lead.business}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="text-slate-300">{lead.category}</span>
                          <span className="text-slate-500">{lead.city}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="status" status={lead.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="temperature" temperature={lead.temperature} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/conversations">
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2">
                            Chat
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
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
                <CardTitle className="text-base">Recent AI Conversations</CardTitle>
                <CardDescription>Real-time WhatsApp messages</CardDescription>
              </div>
              <Link href="/conversations">
                <Button variant="ghost" size="sm">
                  View Chat
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {MOCK_CONVERSATIONS.map((conv) => (
                <div
                  key={conv.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{conv.leadName}</span>
                      <Badge variant="temperature" temperature={conv.temperature} />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {formatTimeAgo(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed italic">
                    "{conv.lastMessage}"
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                    <span>{conv.leadBusiness}</span>
                    {conv.needsHuman ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <PhoneCall className="h-3 w-3" /> Needs Handoff
                      </span>
                    ) : (
                      <span className="text-brand-400 font-medium">AI Responded</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
