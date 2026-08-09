'use client';

import React, { useState } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Sparkles,
  Save,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { BUSINESS_INFO, DEFAULT_AI_INSTRUCTIONS } from '@/lib/constants';

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(BUSINESS_INFO.name);
  const [description, setDescription] = useState(BUSINESS_INFO.description);
  const [serviceArea, setServiceArea] = useState(BUSINESS_INFO.serviceArea);
  const [website, setWebsite] = useState(BUSINESS_INFO.website);
  const [email, setEmail] = useState(BUSINESS_INFO.email);
  const [whatsapp, setWhatsapp] = useState(BUSINESS_INFO.whatsapp);
  const [aiInstructions, setAiInstructions] = useState(DEFAULT_AI_INSTRUCTIONS);

  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Business Websites',
    'Landing Pages',
    'Portfolio Websites',
    'Website Redesign',
  ]);

  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 700);
  };

  return (
    <DashboardLayout
      title="Business & AI Knowledge Base Settings"
      subtitle="Configure Reliable Vision business profile, offered services, and AI bot guidelines"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm font-semibold animate-in zoom-in-95">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>Business Settings & AI Knowledge Base saved successfully!</span>
          </div>
        )}

        {/* Section 1: Business Info Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-brand-400">
              <Building2 className="h-5 w-5" />
              <CardTitle>Business Profile & Details</CardTitle>
            </div>
            <CardDescription>
              Primary business identity stored for automated AI conversations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name *"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
              <Input
                label="Service Area *"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Business Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Offered Services Checkboxes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Offered Services (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  'Business Websites',
                  'Landing Pages',
                  'Portfolio Websites',
                  'Website Redesign',
                ].map((service) => {
                  const isChecked = selectedServices.includes(service);
                  return (
                    <label
                      key={service}
                      onClick={() => handleToggleService(service)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${
                        isChecked
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{service}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Portfolio Website URL"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                leftIcon={<Globe className="h-4 w-4 text-slate-400" />}
              />
              <Input
                label="Business Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
              />
              <Input
                label="Business WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: AI Bot Custom System Instructions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-400">
                <Bot className="h-5 w-5" />
                <CardTitle>AI Conversation Agent & Guidelines</CardTitle>
              </div>
              <Toggle
                checked={autoReplyEnabled}
                onChange={setAutoReplyEnabled}
                label="Auto AI Replies"
              />
            </div>
            <CardDescription>
              Custom system instructions given to AI when responding to WhatsApp client leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="System AI Prompt & Rules"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="min-h-[160px] font-mono text-xs"
              helperText="The AI will strictly follow these guidelines when qualifying incoming lead replies."
            />

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-200 block">🔒 Integration Security Status:</span>
              <p>
                Stage 1 Mock Mode. Supabase, n8n, WhatsApp Cloud API & OpenAI API keys remain disconnected until approval.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Business Settings
            </Button>
          </CardFooter>
        </Card>
      </form>
    </DashboardLayout>
  );
}
