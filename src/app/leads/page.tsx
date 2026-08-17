'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Flame,
  Zap,
  Snowflake,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Tag,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Lead, LeadTemperature } from '@/types';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { AddLeadModal } from '@/components/modules/AddLeadModal';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState<'all' | LeadTemperature>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Dynamic Categories & Cities Options
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected Lead for View/Edit/Delete
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch unique categories and cities dynamically from Supabase
  const fetchDynamicFilters = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('leads').select('category, city');

      if (data && data.length > 0) {
        const catSet = new Set<string>();
        const citySet = new Set<string>();

        data.forEach((row: any) => {
          if (row.category && row.category.trim()) catSet.add(row.category.trim());
          if (row.city && row.city.trim()) citySet.add(row.city.trim());
        });

        setAvailableCategories(Array.from(catSet));
        setAvailableCities(Array.from(citySet));
      } else {
        setAvailableCategories([]);
        setAvailableCities([]);
      }
    } catch (_) {
      setAvailableCategories([]);
      setAvailableCities([]);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('leads').select('*', { count: 'exact' });

      // Temperature filter
      if (temperatureFilter !== 'all') {
        query = query.eq('status', temperatureFilter);
      }

      // Category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // City filter
      if (cityFilter !== 'all') {
        query = query.eq('city', cityFilter);
      }

      // Search filter
      if (searchTerm.trim()) {
        query = query.or(
          `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,business.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
        );
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (!error && data) {
        const mappedLeads: Lead[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          business: item.business,
          category: item.category || 'General',
          city: item.city || 'Unknown',
          status: item.campaign_status || 'pending',
          temperature: (item.status as LeadTemperature) || 'cold',
          lastMessageAt: item.last_message_at,
          lastReplyAt: item.last_reply_at,
          nextFollowupAt: item.next_followup_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          notes: item.notes || '',
          importBatchId: item.import_batch_id,
          importBatchName: item.import_batch_name,
        }));

        setLeads(mappedLeads);
        setTotalCount(count || mappedLeads.length);
      } else {
        setLeads([]);
        setTotalCount(0);
      }
    } catch (e) {
      setLeads([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [temperatureFilter, categoryFilter, cityFilter, searchTerm, page]);

  useEffect(() => {
    fetchLeads();
    fetchDynamicFilters();
  }, [fetchLeads, fetchDynamicFilters]);

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to delete lead "${leadName}" from Supabase?`)) return;

    setDeletingLeadId(leadId);
    try {
      const supabase = createClient();
      await supabase.from('leads').delete().eq('id', leadId);
      if (selectedLead?.id === leadId) setSelectedLead(null);
      fetchLeads();
      fetchDynamicFilters();
    } catch (_) {
      alert('Failed to delete lead from database.');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleSaveEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;

    try {
      const supabase = createClient();
      await supabase
        .from('leads')
        .update({
          name: editLead.name,
          business: editLead.business,
          category: editLead.category,
          city: editLead.city,
          status: editLead.temperature,
        })
        .eq('id', editLead.id);

      setIsEditModalOpen(false);
      setEditLead(null);
      fetchLeads();
      fetchDynamicFilters();
    } catch (e) {
      setIsEditModalOpen(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleImportSuccessRefresh = () => {
    fetchLeads();
    fetchDynamicFilters();
  };

  return (
    <DashboardLayout
      title="Leads Management & CRM"
      subtitle="Connected to Supabase PostgreSQL database • 100% Real-time Dynamic"
      onImportSuccess={handleImportSuccessRefresh}
    >
      {/* Top Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#101018] rounded-full border border-white/[0.08] overflow-x-auto shadow-md">
          <button
            onClick={() => {
              setTemperatureFilter('all');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              temperatureFilter === 'all'
                ? 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] text-white shadow-md shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Leads ({totalCount})
          </button>
          <button
            onClick={() => {
              setTemperatureFilter('hot');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              temperatureFilter === 'hot'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            🔥 HOT
          </button>
          <button
            onClick={() => {
              setTemperatureFilter('warm');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              temperatureFilter === 'warm'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            ⚡ WARM
          </button>
          <button
            onClick={() => {
              setTemperatureFilter('cold');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              temperatureFilter === 'cold'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                : 'text-sky-400 hover:bg-sky-500/10'
            }`}
          >
            ❄️ COLD
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchLeads();
              fetchDynamicFilters();
            }}
            leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            className="border-white/10 text-xs"
          >
            Refresh DB
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shadow-lg shadow-pink-500/20 text-xs"
          >
            + Add Lead
          </Button>
        </div>
      </div>

      {/* Search & Dynamic Filters Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by name, phone (+91), business, city, sector..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="h-4 w-4 text-zinc-500" />}
              />
            </div>

            {/* Dynamic Category Select */}
            <div>
              <Select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...availableCategories.map((cat) => ({ value: cat, label: cat })),
                ]}
              />
            </div>

            {/* Dynamic City / Location Select */}
            <div>
              <Select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Cities / Locations' },
                  ...availableCities.map((city) => ({ value: city, label: city })),
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
                <TableHead>Source Dataset</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-zinc-400 font-medium">
                    Fetching real-time database records from Supabase...
                  </TableCell>
                </TableRow>
              ) : leads.length > 0 ? (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-white/[0.03] transition-colors">
                    <TableCell onClick={() => setSelectedLead(lead)} className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-white text-sm tracking-tight">{lead.name}</span>
                        <span className="text-xs text-zinc-400 font-mono font-medium">{lead.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)} className="cursor-pointer">
                      <span className="text-zinc-200 text-sm font-bold">{lead.business}</span>
                    </TableCell>
                    <TableCell onClick={() => setSelectedLead(lead)} className="cursor-pointer">
                      <div className="flex flex-col text-xs space-y-0.5">
                        <span className="text-zinc-300 font-semibold flex items-center gap-1">
                          <Tag className="h-3 w-3 text-pink-400" /> {lead.category}
                        </span>
                        <span className="text-zinc-400 font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-purple-400" /> {lead.city || 'Location N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="temperature" temperature={lead.temperature} />
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-300">
                        {lead.importBatchName || 'Direct Creation'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-400 font-medium">{formatDate(lead.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          title="View Details"
                          className="px-2 text-zinc-400 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditLead(lead);
                            setIsEditModalOpen(true);
                          }}
                          title="Edit Lead"
                          className="px-2 text-purple-400 hover:text-purple-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id, lead.name)}
                          isLoading={deletingLeadId === lead.id}
                          title="Delete Lead"
                          className="px-2 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-zinc-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-sm font-bold text-zinc-300">No lead records found in database.</p>
                      <p className="text-xs text-zinc-500">
                        Upload an Excel file or click "+ Add Lead" to insert dynamic records.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-t border-white/[0.08] text-xs text-zinc-400 font-medium">
            <span>
              Showing Page {page} of {totalPages} ({totalCount} Total Leads)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                className="border-white/10 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
                className="border-white/10 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Lead Detail Modal */}
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
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#151520] border border-white/[0.08]">
              <div>
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">AI Qualification</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="temperature" temperature={selectedLead.temperature} />
                  <Badge variant="status" status={selectedLead.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">City / Location</span>
                <p className="text-sm font-extrabold text-white mt-1">{selectedLead.city || 'Unknown'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#151520] border border-white/[0.08] space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">WhatsApp Phone</span>
                <p className="font-mono text-zinc-100 font-bold">{selectedLead.phone}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#151520] border border-white/[0.08] space-y-1">
                <span className="text-xs text-zinc-400 font-semibold">Category / Sector</span>
                <p className="text-zinc-100 font-bold">{selectedLead.category}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151520] border border-white/[0.08] space-y-1">
              <span className="text-xs text-zinc-400 font-semibold">Source Dataset Import</span>
              <p className="text-zinc-200 font-medium">{selectedLead.importBatchName || 'Direct Form Creation'}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditLead(null);
          }}
          title={`Edit Lead: ${editLead.name}`}
          description="Update lead details in Supabase database."
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEditLead}>
                Save Changes
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveEditLead} className="space-y-4">
            <Input
              label="Contact Person Name"
              value={editLead.name}
              onChange={(e) => setEditLead({ ...editLead, name: e.target.value })}
            />
            <Input
              label="Business Name"
              value={editLead.business}
              onChange={(e) => setEditLead({ ...editLead, business: e.target.value })}
            />
            <Input
              label="City / Location"
              value={editLead.city || ''}
              onChange={(e) => setEditLead({ ...editLead, city: e.target.value })}
            />
            <Select
              label="Lead Temperature (Status)"
              value={editLead.temperature}
              onChange={(e) => setEditLead({ ...editLead, temperature: e.target.value as LeadTemperature })}
              options={[
                { value: 'hot', label: '🔥 HOT' },
                { value: 'warm', label: '⚡ WARM' },
                { value: 'cold', label: '❄️ COLD' },
              ]}
            />
          </form>
        </Modal>
      )}

      {/* Global Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={handleImportSuccessRefresh}
      />
    </DashboardLayout>
  );
}
