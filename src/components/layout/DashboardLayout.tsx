'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AddLeadModal } from '@/components/modules/AddLeadModal';
import { ImportExcelModal } from '@/components/modules/ImportExcelModal';
import { CreateCampaignModal } from '@/components/modules/CreateCampaignModal';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onImportSuccess?: () => void;
}

export function DashboardLayout({ children, title, subtitle, onImportSuccess }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07070B] text-zinc-100 font-sans antialiased flex">
      {/* Navigation Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        {/* Top Header Navbar */}
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          onOpenAddLead={() => setIsAddLeadOpen(true)}
          onOpenImportExcel={() => setIsImportExcelOpen(true)}
          title={title}
          subtitle={subtitle}
        />

        {/* Dynamic Page Children */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Global Action Modals */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
      />
      <ImportExcelModal
        isOpen={isImportExcelOpen}
        onClose={() => setIsImportExcelOpen(false)}
        onImportSuccess={onImportSuccess}
      />
      <CreateCampaignModal
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
      />
    </div>
  );
}
