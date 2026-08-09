# Reliable Vision | Web Studio - AI Automation Admin Dashboard

Production-ready AI-powered lead generation, WhatsApp conversation, and lead qualification dashboard built for **Reliable Vision | Web Studio** (Tamil Nadu, India).

## 🚀 Stage 1 Completed: Frontend UI Foundation

This project is currently in **Stage 1 (Frontend Foundation)**. All pages, components, layouts, search filters, state modals, and interactive workflows are built with rich, realistic mock data for Reliable Vision.

### 🏢 Business Information Integrated
- **Business Name**: Reliable Vision | Web Studio
- **Description**: Professional Website Development Services
- **Services**: Business Websites, Landing Pages, Portfolio Websites, Website Redesign
- **Service Area**: Tamil Nadu, India
- **Portfolio**: [santhosh-portfolio-gamma.vercel.app](https://santhosh-portfolio-gamma.vercel.app/)
- **Email**: santhosh.rv.work@gmail.com
- **WhatsApp**: +91 9597482991

---

## 🛠️ Technology Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom sleek dark SaaS theme)
- **Icons**: Lucide React
- **State & Architecture**: Clean modular component architecture with reusable UI components and typed mock data handlers.

---

## 📑 Admin Dashboard Pages (Stage 1)

1. **🔑 Login (`/login`)**: SaaS-style authentication screen with quick demo login preview credentials (`admin@reliablevision.in` / `demo123`).
2. **📊 Dashboard (`/dashboard` & `/`)**: High-level executive overview featuring:
   - Metric cards: Total Leads (1,248), Contacted (850), Replies (342), Cold Leads (420), Warm Leads (185), Hot Leads (43).
   - Active Campaign summary widget.
   - Lead Qualification Distribution bar.
   - Recent Leads table & Recent Conversations feed.
3. **👥 Leads (`/leads`)**: Full CRM lead management with search, qualification status filter (🔥 Hot, ⚡ Warm, ❄️ Cold), category filters, lead detail inspection modal, Excel import modal trigger, and Add Lead modal.
4. **🚀 Campaigns (`/campaigns`)**: Campaign management dashboard with campaign creation, status toggle (Active/Paused/Completed), audience targeting, and progress meters.
5. **💬 Conversations (`/conversations`)**: Two-column WhatsApp chat simulation showing live lead conversations, message logs, AI qualification badges, intent detection, and Human Takeover toggle.
6. **⏰ Follow-ups (`/follow-ups`)**: Scheduled follow-up queue with status filters (Pending, Sent, Cancelled), countdown timers, sequence templates, and scheduling wizard modal.
7. **📈 Analytics (`/analytics`)**: Visual metrics displaying reply rates, conversion funnel, lead source performance breakdown, and response times.
8. **⚙️ Settings (`/settings`)**: Business AI knowledge configuration tab to update services, service area, AI bot guidelines, notification rules, and custom prompt rules.

---

## 🧩 Reusable Component Architecture

- **`src/components/layout/`**: `Sidebar`, `Header`, `DashboardLayout`
- **`src/components/ui/`**: `Button`, `Card`, `Table`, `Badge`, `Input`, `Select`, `Textarea`, `Toggle`, `Modal`, `LoadingSkeleton`, `EmptyState`, `ErrorAlert`
- **`src/components/modules/`**: `AddLeadModal`, `ImportExcelModal`, `CreateCampaignModal`
- **`src/types/`**: Strongly-typed interfaces for `Lead`, `Campaign`, `Conversation`, `Message`, `FollowUp`, `Analytics`, `BusinessSettings`.
- **`src/lib/`**: `constants.ts`, `mockData.ts`, `utils.ts`

---

## 💻 How to Run the Project locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to explore the dashboard.

### 3. TypeScript & Build Checks
```bash
npm run build
```

---

## 🔒 Security & Data Note
- **No live API keys or secrets** are included.
- Supabase, n8n, WhatsApp Cloud API, and OpenAI integrations remain disconnected until subsequent stage approvals.
