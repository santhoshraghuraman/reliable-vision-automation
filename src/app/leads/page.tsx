'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Plus,
  Flame,
  Zap,
  Snowflake,
  MoreVertical,
  Phone,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { MOCK_LEADS } from '@/lib/mockData';
import { Lead, LeadTemperature } from '@/types';
import { formatDate } from '@/lib/utils';
import { AddLeadModal } from '@/components/modules/AddLeadModal';
import { ImportExcelModal } from '@/components/modules/ImportExcelModal';

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState<'all' | LeadTemperature>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredLeads = MOCK_LEADS.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTemp =
      temperatureFilter === 'all' || lead.temperature === temperatureFilter;

    const matchesCat =
      categoryFilter === 'all' || lead.category === categoryFilter;

    return matchesSearch && matchesTemp && matchesCat;
  });

  return (
    <DashboardLayout
      title="Leads Management & CRM"
      subtitle="View, filter, and manage business lead profiles and AI qualification status"
    >
      {/* Top Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setTemperatureFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              temperatureFilter === 'all'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Leads (1,248)
          </button>
          <button
            onClick={() => setTemperatureFilter('hot')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              temperatureFilter === 'hot'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            🔥 HOT (43)
          </button>
          <button
            onClick={() => setTemperatureFilter('warm')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              temperatureFilter === 'warm'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            ⚡ WARM (185)
          </button>
          <button
            onClick={() => setTemperatureFilter('cold')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              temperatureFilter === 'cold'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-sky-400 hover:bg-sky-500/10'
            }`}
          >
            ❄️ COLD (420)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
          >
            Import Excel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            + Add Lead
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search lead name, phone (+91), business, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <div>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Industries & Categories' },
                  { value: 'Textile & Retail', label: 'Textile & Retail' },
                  { value: 'Beauty & Wellness', label: 'Beauty & Wellness' },
                  { value: 'Food & Agriculture', label: 'Food & Agriculture' },
                  { value: 'Automobile & Spares', label: 'Automobile & Spares' },
                  { value: 'IT & Services', label: 'IT & Services' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Contact</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Category / City</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-slate-850/80">
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">{lead.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{lead.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <span className="text-slate-200 text-sm font-medium">{lead.business}</span>
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <div className="flex flex-col text-xs">
                        <span className="text-slate-300">{lead.category}</span>
                        <span className="text-slate-500">{lead.city}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <Badge variant="temperature" temperature={lead.temperature} />
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <Badge variant="status" status={lead.status} />
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)}>
                      <span className="text-xs text-slate-400">{formatDate(lead.lastMessageAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          title="View Details"
                          className="px-2"
                        >
                          <Eye className="h-4 w-4 text-slate-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No leads found matching query.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Detail Modal Dialog */}
      {selectedLead && (
        <Modal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={`Lead Profile: ${selectedLead.name}`}
          description={`Details for ${selectedLead.business}`}
          size="lg"
          footer={
            <Button variant="primary" onClick={() => setSelectedLead(null)}>
              Close Profile
            </Button>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">AI Qualification</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="temperature" temperature={selectedLead.temperature} />
                  <Badge variant="status" status={selectedLead.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase font-semibold">City</span>
                <p className="text-sm font-semibold text-white mt-1">{selectedLead.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-medium">WhatsApp Phone</span>
                <p className="font-mono text-slate-200">{selectedLead.phone}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-medium">Industry Category</span>
                <p className="text-slate-200">{selectedLead.category}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-brand-400 uppercase">Requirement & Notes</span>
              <p className="text-slate-300 leading-relaxed text-xs italic">
                "{selectedLead.notes || 'No custom notes logged.'}"
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Global Modals */}
      <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ImportExcelModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
    </DashboardLayout>
  );
}
