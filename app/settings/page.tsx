'use client'

import { Header } from '@/components/layout/Header'
import { Lock, Webhook } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" subtitle="System configuration" />
      <div className="flex-1 p-6 space-y-4 max-w-2xl">
        {/* Upcoming settings sections */}
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            Security
          </h3>
          <div className="space-y-3">
            <SettingRow
              label="Supabase URL"
              value="Configured via NEXT_PUBLIC_SUPABASE_URL"
              status="env"
            />
            <SettingRow
              label="Supabase Anon Key"
              value="Configured via NEXT_PUBLIC_SUPABASE_ANON_KEY"
              status="env"
            />
            <SettingRow
              label="Supabase Service Role Key"
              value="Configured via SUPABASE_SERVICE_ROLE_KEY (server-side only)"
              status="env"
            />
          </div>
        </div>

        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-5 opacity-60">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-gray-500" />
            Future Integrations (Coming Soon)
          </h3>
          <div className="space-y-3">
            <SettingRow label="n8n Webhook URL" value="Not configured" status="pending" />
            <SettingRow label="Meta Webhook Token" value="Not configured" status="pending" />
            <SettingRow label="WhatsApp Access Token" value="Not configured" status="pending" />
            <SettingRow label="Gemini API Key" value="Not configured" status="pending" />
          </div>
        </div>

        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <p className="text-xs text-indigo-400">
            <strong>Security Note:</strong> All API keys and secrets must be stored as environment variables.
            Never commit credentials to source control. The service role key is only used server-side in API routes.
          </p>
        </div>
      </div>
    </div>
  )
}

function SettingRow({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: 'env' | 'pending' | 'active'
}) {
  const statusColors = {
    env: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    pending: 'bg-gray-700/40 text-gray-600 border-gray-700/20',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/30 last:border-0">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-xs text-gray-600 mt-0.5 font-mono">{value}</p>
      </div>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[status]}`}
      >
        {status === 'env' ? 'ENV' : status === 'pending' ? 'Soon' : 'Active'}
      </span>
    </div>
  )
}
