'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { BUSINESS_INFO, DEFAULT_AI_INSTRUCTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [recordId, setRecordId] = useState<string | null>(null);
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('business_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          setRecordId(data.id);
          setBusinessName(data.business_name || BUSINESS_INFO.name);
          setDescription(data.description || BUSINESS_INFO.description);
          setServiceArea(data.service_area || BUSINESS_INFO.serviceArea);
          setWebsite(data.website || BUSINESS_INFO.website);
          setEmail(data.email || BUSINESS_INFO.email);
          setWhatsapp(data.whatsapp_number || BUSINESS_INFO.whatsapp);
          setAiInstructions(data.ai_instructions || DEFAULT_AI_INSTRUCTIONS);
          if (data.services && Array.isArray(data.services)) {
            setSelectedServices(data.services);
          }
        }
      } catch (e) {
        // Fallback default
      }
    }
    loadSettings();
  }, []);

  const handleToggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const supabase = createClient();
      const payload = {
        business_name: businessName,
        description,
        services: selectedServices,
        service_area: serviceArea,
        website,
        email,
        whatsapp_number: whatsapp,
        ai_instructions: aiInstructions,
      };

      if (recordId) {
        const { error } = await supabase
          .from('business_settings')
          .update(payload)
          .eq('id', recordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('business_settings')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setRecordId(data.id);
      }

      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save settings to Supabase.');
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Business & AI Knowledge Base Settings"
      subtitle="Connected to Supabase `business_settings` PostgreSQL table"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm font-semibold animate-in zoom-in-95">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>Business Settings & AI Knowledge Base saved to Supabase!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm font-semibold">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Business Info Settings */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2 text-pink-400">
              <Building2 className="h-5 w-5" />
              <CardTitle className="text-lg tracking-tight font-extrabold text-white">Business Profile & Details</CardTitle>
            </div>
            <CardDescription className="text-zinc-400 font-medium">
              Primary business identity stored in Supabase for automated AI context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <label className="block text-xs font-bold text-zinc-300">
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
                      className={`flex items-center gap-2.5 p-3.5 rounded-2xl border cursor-pointer transition-all text-xs font-bold ${
                        isChecked
                          ? 'bg-[#151520] border-purple-500/60 text-white shadow-md shadow-purple-500/10'
                          : 'bg-[#0B0B12] border-white/[0.08] text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded-lg border-white/20 bg-[#101018] text-pink-500 focus:ring-purple-500/40"
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
                leftIcon={<Globe className="h-4 w-4 text-zinc-500" />}
              />
              <Input
                label="Business Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-zinc-500" />}
              />
              <Input
                label="Business WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                leftIcon={<Phone className="h-4 w-4 text-zinc-500" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: AI Bot Custom System Instructions */}
        <Card className="border border-purple-500/30 bg-[#101018] shadow-2xl shadow-purple-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-lg tracking-tight font-extrabold text-white">AI Conversation Agent & Guidelines</CardTitle>
              </div>
              <Toggle
                checked={autoReplyEnabled}
                onChange={setAutoReplyEnabled}
                label="Auto AI Replies"
              />
            </div>
            <CardDescription className="text-zinc-400 font-medium">
              Custom system instructions given to AI when responding to WhatsApp client leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="System AI Prompt & Rules"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="min-h-[160px] font-mono text-xs text-zinc-200"
              helperText="The AI will strictly follow these guidelines when qualifying incoming lead replies."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
              className="shadow-lg shadow-pink-500/25"
            >
              Save Settings to Supabase
            </Button>
          </CardFooter>
        </Card>
      </form>
    </DashboardLayout>
  );
}
