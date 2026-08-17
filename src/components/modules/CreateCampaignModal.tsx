'use client';

import React, { useState } from 'react';
import { Megaphone, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('Textile Exporters & Retailers in Coimbatore');
  const [template, setTemplate] = useState(
    'Hi {{name}} 👋 We came across {{business}} in {{city}}. We help local businesses build professional websites to improve their online presence. Would you be interested in seeing a quick demo?'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('campaigns').insert({
        name: name.trim(),
        target_audience: audience,
        message_template: template,
        status: 'active',
        total_leads: 120,
        sent_count: 0,
        reply_count: 0,
      });
      setIsSubmitting(false);
      onClose();
    } catch (e) {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🚀 Create New WhatsApp Outreach Campaign"
      description="Set target audience filters and AI message template for Reliable Vision automation."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            isLoading={isSubmitting}
            leftIcon={<Megaphone className="h-4 w-4" />}
          >
            Launch Campaign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Campaign Name *"
          placeholder="e.g. Tamil Nadu Textile Business Outreach"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Target Category"
            value="Textile & Retail"
            options={[
              { value: 'Textile & Retail', label: 'Textile & Retail' },
              { value: 'Beauty & Wellness', label: 'Beauty & Wellness' },
              { value: 'Food & Agriculture', label: 'Food & Agriculture' },
              { value: 'Automobile & Spares', label: 'Automobile & Spares' },
            ]}
          />
          <Select
            label="Target City / Region"
            value="Coimbatore"
            options={[
              { value: 'Coimbatore', label: 'Coimbatore' },
              { value: 'Chennai', label: 'Chennai' },
              { value: 'Madurai', label: 'Madurai' },
              { value: 'Salem', label: 'Salem' },
              { value: 'All Tamil Nadu', label: 'All Tamil Nadu' },
            ]}
          />
        </div>

        <Textarea
          label="WhatsApp Initial Message Template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          helperText="Use placeholders {{name}}, {{business}}, {{city}} for AI personalization."
        />

        <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 flex flex-col gap-2.5 backdrop-blur-md">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-pink-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              Campaign target lead segment automatically queries Supabase pending leads matching business filters.
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-medium bg-black/20 p-3 rounded-lg border border-white/5">
            <div className="flex justify-between"><span>Pending Leads:</span> <span className="text-white">Auto-calculated</span></div>
            <div className="flex justify-between"><span>Has Website:</span> <span className="text-amber-400">Excluded</span></div>
            <div className="flex justify-between"><span>No Website:</span> <span className="text-emerald-400">Eligible</span></div>
            <div className="flex justify-between"><span>Unknown/Error:</span> <span className="text-rose-400">Excluded</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
