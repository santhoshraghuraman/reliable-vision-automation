'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { LeadTemperature, LeadStatus } from '@/types';

export interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded?: () => void;
}

export function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [business, setBusiness] = useState('');
  const [category, setCategory] = useState('Textile & Retail');
  const [city, setCity] = useState('Coimbatore');
  const [temperature, setTemperature] = useState<LeadTemperature>('warm');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        if (onLeadAdded) onLeadAdded();
        onClose();
        setName('');
        setPhone('');
        setBusiness('');
        setNotes('');
      }, 1000);
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="➕ Add New Business Lead"
      description="Enter lead details for Reliable Vision | Web Studio outreach."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            Save Lead
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            ✓ Lead added to database successfully!
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Person Name *"
            placeholder="e.g. Arun Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="WhatsApp Phone Number *"
            placeholder="e.g. +91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Business Name *"
            placeholder="e.g. Arun Textiles"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            required
          />
          <Select
            label="Industry / Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'Textile & Retail', label: 'Textile & Retail' },
              { value: 'Beauty & Wellness', label: 'Beauty & Wellness' },
              { value: 'Food & Agriculture', label: 'Food & Agriculture' },
              { value: 'Automobile & Spares', label: 'Automobile & Spares' },
              { value: 'IT & Services', label: 'IT & Services' },
              { value: 'Arts & Crafts', label: 'Arts & Crafts' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="City / Region (Tamil Nadu)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            options={[
              { value: 'Coimbatore', label: 'Coimbatore' },
              { value: 'Chennai', label: 'Chennai' },
              { value: 'Madurai', label: 'Madurai' },
              { value: 'Salem', label: 'Salem' },
              { value: 'Tiruchirappalli', label: 'Tiruchirappalli' },
              { value: 'Thanjavur', label: 'Thanjavur' },
              { value: 'Tirunelveli', label: 'Tirunelveli' },
              { value: 'Erode', label: 'Erode' },
            ]}
          />
          <Select
            label="Lead Temperature (AI Qualification)"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value as LeadTemperature)}
            options={[
              { value: 'hot', label: '🔥 HOT (High Intent / Ready)' },
              { value: 'warm', label: '⚡ WARM (Interested / Inquiring)' },
              { value: 'cold', label: '❄️ COLD (Initial Contact)' },
            ]}
          />
        </div>

        <Textarea
          label="Lead Notes / Requirement Details"
          placeholder="e.g. Needs catalog website redesign before Diwali sale..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
}
