# Reliable Vision CRM

**AI-Powered Lead Automation System**

A production-ready CRM frontend built with Next.js, TypeScript, Tailwind CSS, and Supabase. Designed as the frontend for a larger AI automation pipeline involving n8n, Gemini, and WhatsApp Cloud API.

---

## Current Status: Milestone 1 — Excel → CRM → Supabase ✅

**What works right now:**
- Upload Excel files (.xlsx, .xls, .csv) with leads
- Preview and validate rows before importing
- Detect duplicate phone numbers (within file + existing in Supabase)
- Import valid leads into Supabase `leads` table
- View all leads in a searchable, filterable table
- Click any lead to see full details
- Dashboard with real-time stats from Supabase

**What is NOT yet implemented:**
- WhatsApp messaging
- n8n workflow triggers
- Gemini AI scoring
- Meta webhook processing
- Campaign management
- Analytics charts

---

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project named `reliable-vision` (already created)
- The following tables already exist in Supabase:
  - `leads`, `campaigns`, `campaign_leads`, `conversations`, `messages`, `follow_ups`, `ai_scores`, `webhook_events`, `settings`, `audit_logs`

---

## Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd reliable-vision

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Then edit .env.local with your Supabase credentials (see below)

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Your Supabase project URL
# Found in: Supabase Dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Your Supabase anon/public key (safe for browser)
# Found in: Supabase Dashboard → Project Settings → API → Project API keys → anon (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Your Supabase service role key (SERVER-SIDE ONLY — NEVER expose in browser)
# Found in: Supabase Dashboard → Project Settings → API → Project API keys → service_role
# This is used ONLY in /api/leads/import (Next.js API route)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> ⚠️ **Security**: Never commit `.env.local` to git. Never expose the service role key in browser code. The `.gitignore` already excludes all `.env*` files.

---

## Supabase Setup

### Required: Row Level Security for Reads

The frontend uses the **anon key** for reading data. Make sure RLS policies allow SELECT from the `leads` table. Example policy:

```sql
-- Allow public reads on leads (or restrict to authenticated users)
CREATE POLICY "Allow anon select on leads"
ON public.leads FOR SELECT
USING (true);
```

### Required: Lead Import via Service Role

The `/api/leads/import` route uses the **service role key** server-side. This bypasses RLS for inserts. No additional RLS setup needed for inserts.

### Column Requirements for `leads` table

The importer expects these columns to exist:

| Column | Type | Description |
|---|---|---|
| `id` | uuid (auto-generated) | Primary key |
| `name` | text | Lead name |
| `phone` | text | Normalized phone number |
| `business` | text (nullable) | Business name |
| `category` | text (nullable) | Business category |
| `status` | text | HOT / WARM / COLD |
| `source` | text | Import source (excel, api, etc.) |
| `is_eligible` | boolean | Whether lead can be contacted |
| `opted_out` | boolean | Whether lead opted out |
| `requirement` | text (nullable) | Lead requirement notes |
| `last_contacted` | timestamptz (nullable) | Last contact timestamp |
| `last_replied` | timestamptz (nullable) | Last reply timestamp |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

---

## Excel Import Flow

1. **Click "Upload Excel"** on the Leads page
2. **Select file** (.xlsx, .xls, or .csv)
3. **File is parsed client-side** — no server upload for parsing
4. **Column normalization**: `Name/name/NAME → name`, `Phone/phone/PHONE → phone`, etc.
5. **Row validation**:
   - Missing name → invalid
   - Missing phone → invalid
   - Malformed phone → invalid
   - Duplicate within file → skipped
6. **Supabase duplicate check**: phones already in the `leads` table → skipped
7. **Import preview dialog** shows:
   - Total rows
   - Valid rows (ready to import)
   - Duplicates (skipped)
   - Invalid rows with reasons
8. **Click Import** → valid rows are sent to `/api/leads/import` (server-side)
9. **Results shown** — imported count, failed count, any errors
10. **Leads page refreshes** automatically

### Supported Excel Column Names

| Normalized | Accepted Variants |
|---|---|
| `name` | name, Name, NAME, Full Name, fullname |
| `phone` | phone, Phone, PHONE, Mobile, mobile, contact |
| `business` | business, Business, BUSINESS, Company, company, firm |
| `category` | category, Category, CATEGORY, type, Type, industry |

---

## Project Structure

```
reliable-vision/
├── app/                          # Next.js App Router
│   ├── api/leads/import/route.ts # Secure import API (service role)
│   ├── layout.tsx                # Root layout with sidebar
│   ├── page.tsx                  # Dashboard
│   ├── leads/
│   │   ├── page.tsx              # Leads list + upload
│   │   └── [id]/page.tsx         # Lead detail
│   ├── campaigns/page.tsx        # Stub
│   ├── conversations/page.tsx    # Stub
│   ├── follow-ups/page.tsx       # Stub
│   ├── analytics/page.tsx        # Stub
│   └── settings/page.tsx         # Settings
├── components/
│   ├── dashboard/StatsCard.tsx
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   ├── leads/
│   │   ├── LeadTable.tsx
│   │   └── LeadDetail.tsx
│   ├── ui/                       # Design system components
│   └── upload/
│       ├── ExcelUploader.tsx
│       └── ImportPreview.tsx
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── supabase.ts               # Browser client (anon key)
│   ├── supabase-server.ts        # Server client (service role)
│   ├── excel-parser.ts           # xlsx parsing
│   ├── validators.ts             # Row validation + dedup
│   └── phone-utils.ts            # Phone normalization
├── services/
│   ├── leads.service.ts          # Supabase CRUD + import
│   ├── campaigns.service.ts      # Stub
│   ├── conversations.service.ts  # Stub
│   ├── ai.service.ts             # Stub (future Gemini)
│   └── webhook.service.ts        # Stub (future n8n)
└── .env.local.example
```

---

## Future Integration Points

The codebase is structured to add these integrations without rebuilding:

### n8n Automation
- **File**: `services/webhook.service.ts`
- **API Route**: Create `app/api/webhooks/n8n/route.ts`
- **Trigger**: After lead import, POST to n8n webhook → start qualification workflow

### Gemini AI Scoring
- **File**: `services/ai.service.ts`
- **API Route**: Create `app/api/ai/score/route.ts`
- **Flow**: n8n calls Gemini → updates `ai_scores` table → updates `leads.status` (HOT/WARM/COLD)

### WhatsApp Cloud API
- **File**: `services/conversations.service.ts`
- **API Route**: Create `app/api/webhooks/meta/route.ts` for inbound messages
- **Flow**: Outbound via n8n → Meta Cloud API; Inbound via Meta Webhook → our route → Supabase

### Architecture Flow (Future)
```
CRM (Excel Upload)
    ↓
Supabase (leads table)
    ↓
n8n (workflow trigger)
    ↓
Gemini (qualification)
    ↓
WhatsApp Cloud API (outbound)
    ↓
Customer
    ↓
Meta Webhook (inbound)
    ↓
n8n (process reply)
    ↓
Supabase (update conversation)
    ↓
Gemini (classify HOT/WARM/COLD)
    ↓
Human takeover (if HOT)
```

---

## Development Commands

```bash
# Start development server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
npm run build
```

---

## Security Checklist

- [x] Supabase service role key is server-side only (`lib/supabase-server.ts`)
- [x] Browser client uses anon key only (`lib/supabase.ts`)
- [x] `.env.local` is gitignored
- [x] No credentials hard-coded in source
- [ ] RLS policies configured in Supabase (do this before going to production)
- [ ] Add authentication before exposing to the internet

---

## Known Limitations (Milestone 1)

1. No user authentication — anyone who can access the URL can view/import leads
2. The `leads` table RLS must allow anon SELECT for the dashboard to work
3. No real-time push updates — must click Refresh to see new data
4. Supabase Realtime subscription can be added to `services/leads.service.ts` without breaking changes
5. Large Excel files (10,000+ rows) may be slow in the browser — consider chunked upload for production scale

---

*Reliable Vision CRM — Milestone 1 Complete*
*Built with Next.js 15, TypeScript, Tailwind CSS, Supabase*
