'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_FOLLOWUPS } from '@/lib/mockData';
import { FollowUp, FollowUpStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>(MOCK_FOLLOWUPS);
  const [statusFilter, setStatusFilter] = useState<'all' | FollowUpStatus>('all');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const filteredFollowups = followups.filter(
    (f) => statusFilter === 'all' || f.status === statusFilter
  );

  const handleCancelFollowup = (id: string) => {
    setFollowups((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'cancelled' as const } : f))
    );
  };

  return (
    <DashboardLayout
      title="Scheduled Follow-up Automation"
      subtitle="Sequence queue for warm and hot leads to boost conversion rates"
    >
      {/* Header Actions & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === 'all'
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Queue ({followups.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            Pending (5)
          </button>
          <button
            onClick={() => setStatusFilter('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              statusFilter === 'sent'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            Sent
          </button>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsScheduleOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          + Schedule Follow-up
        </Button>
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
              {filteredFollowups.map((fol) => (
                <TableRow key={fol.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-white text-xs sm:text-sm">
                        {fol.leadName}
                      </span>
                      <span className="text-slate-400 text-xs">{fol.leadBusiness}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-semibold">
                      Follow-up #{fol.followupNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="temperature" temperature={fol.temperature} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-brand-400" />
                      <span>{formatDate(fol.scheduledAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-slate-400 truncate max-w-xs italic">
                      "{fol.messageTemplate}"
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        fol.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : fol.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
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
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
          <Select
            label="Select Lead *"
            options={[
              { value: 'lead-1', label: 'Arun Kumar (Arun Textiles & Handlooms)' },
              { value: 'lead-4', label: 'Karthik Subramanian (Kovai Organic Foods)' },
              { value: 'lead-2', label: 'Priya Sundaram (Priya Luxe Salon)' },
            ]}
          />
          <Input label="Scheduled Date & Time *" type="datetime-local" defaultValue="2026-08-10T10:00" />
          <Textarea
            label="Follow-up Message Template"
            defaultValue="Hi {{name}}, following up regarding the business website proposal for {{business}}. Let us know if you'd like to jump on a quick call!"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
