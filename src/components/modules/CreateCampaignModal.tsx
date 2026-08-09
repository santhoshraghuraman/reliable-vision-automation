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
    'Hi {{name}}, we noticed {{business}} in {{city}} could gain 3x more customer leads with a modern business website. Take a look at our recent work at https://santhosh-portfolio-gamma.vercel.app/'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 800);
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

        <div className="p-3.5 rounded-lg bg-brand-600/10 border border-brand-500/30 flex items-start gap-2.5">
          <Sparkles className="h-5 w-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-brand-300">
            <p className="font-semibold">AI Personalization Enabled:</p>
            <p className="mt-0.5 text-brand-300/80">
              Each outgoing message will be subtly tailored based on business sector and category rules.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
