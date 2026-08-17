'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Flame,
  Zap,
  Snowflake,
  Send,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FollowUp, FollowUpStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createClient } from '@/lib/supabase/client';

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | FollowUpStatus>('all');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('followups')
        .select('*, leads(name, phone, business, status)')
        .order('scheduled_at', { ascending: true });

      if (!error && data) {
        const mapped: FollowUp[] = data.map((f: any) => {
          const lead = f.leads || {};
          return {
            id: f.id,
            leadId: f.lead_id,
            leadName: lead.name || 'Client Lead',
            leadPhone: lead.phone || '',
            leadBusiness: lead.business || 'Local Business',
            scheduledAt: f.scheduled_at,
            followupNumber: f.followup_number || 1,
            status: f.status === 'scheduled' ? 'pending' : (f.status as FollowUpStatus),
            messageTemplate: f.notes || 'Follow-up outreach reminder',
            temperature: lead.status || 'warm',
            createdAt: f.created_at,
          };
        });
        setFollowups(mapped);
      } else {
        setFollowups([]);
      }
    } catch (_) {
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const filteredFollowups = followups.filter(
    (f) => statusFilter === 'all' || f.status === statusFilter
  );

  const handleCancelFollowup = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from('followups').update({ status: 'cancelled' }).eq('id', id);
      fetchFollowups();
    } catch (_) {
      setFollowups((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' as const } : f))
      );
    }
  };

  const pendingCount = followups.filter((f) => f.status === 'pending').length;
  const sentCount = followups.filter((f) => f.status === 'sent').length;

  return (
    <DashboardLayout
      title="Scheduled Follow-up Automation"
      subtitle="100% Real-time Database Follow-up Queue from Supabase"
      onImportSuccess={fetchFollowups}
    >
      {/* Header Actions & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#101018] rounded-full border border-white/[0.08] overflow-x-auto shadow-md">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white shadow-md shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Queue ({followups.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('sent')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              statusFilter === 'sent'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            Sent ({sentCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFollowups}
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            className="border-white/10 text-xs"
          >
            Refresh DB
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shadow-lg shadow-pink-500/20 text-xs"
          >
            + Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Follow-ups Queue Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead & Business</TableHead>
                <TableHead>Sequence #</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Scheduled Date / Time</TableHead>
                <TableHead>Template Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-zinc-400">
                    Loading follow-up database records...
                  </TableCell>
                </TableRow>
              ) : filteredFollowups.length > 0 ? (
                filteredFollowups.map((fol) => (
                  <TableRow key={fol.id} className="hover:bg-white/[0.03]">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-white text-xs sm:text-sm">
                          {fol.leadName}
                        </span>
                        <span className="text-zinc-400 text-xs font-medium">{fol.leadBusiness}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 font-mono text-xs font-bold border border-white/10">
                        Follow-up #{fol.followupNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="temperature" temperature={fol.temperature} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                        <Clock className="h-3.5 w-3.5 text-pink-400" />
                        <span>{formatDate(fol.scheduledAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-zinc-400 truncate max-w-xs italic font-medium">
                        "{fol.messageTemplate}"
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                          fol.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : fol.status === 'sent'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {fol.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {fol.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelFollowup(fol.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-zinc-400">
                    No follow-up sequences found in database queue.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule Wizard Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="⏰ Schedule Custom Follow-up"
        description="Select lead and schedule automated WhatsApp follow-up reminder."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsScheduleOpen(false)}>
              Confirm Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Scheduled Date & Time *" type="datetime-local" defaultValue="2026-08-15T10:00" />
          <Textarea
            label="Follow-up Message Template"
            defaultValue="Hi {{name}}, following up regarding the website design proposal for {{business}}. Let us know if you would like to jump on a call!"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
