import Link from 'next/link'
import { Trash2, ArrowLeft, Shield, Mail, CheckCircle2, AlertCircle, Phone, Lock, Clock } from 'lucide-react'

export const metadata = {
  title: 'User Data Deletion Instructions | Reliable Vision Web Studio',
  description: 'Instructions on how users can request deletion of their data from Reliable Vision CRM systems.',
}

export default function DataDeletionPage() {
  const lastUpdated = 'August 14, 2026'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-rose-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100">Reliable Vision Web Studio</h1>
              <p className="text-xs text-gray-400">User Data Deletion Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Privacy Policy →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title Header */}
        <div className="space-y-3 border-b border-gray-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <Shield className="w-3.5 h-3.5" /> Meta Platform Compliance
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            User Data Deletion Instructions
          </h1>
          <p className="text-sm text-gray-400">
            Last Updated: <span className="text-gray-300 font-medium">{lastUpdated}</span>
          </p>
        </div>

        {/* Intro */}
        <section className="space-y-4 text-gray-300 leading-relaxed text-sm">
          <p>
            In accordance with Meta Platform Policy and global data protection regulations, <strong className="text-white">Reliable Vision Web Studio</strong> provides a clear and straightforward process for users to request the permanent deletion of their personal data associated with our CRM, WhatsApp messaging services, and lead databases.
          </p>
        </section>

        {/* Step-by-Step Deletion Methods */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" /> How to Request Data Deletion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Method 1: WhatsApp */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-100">Method 1: Instant WhatsApp Request</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Send a WhatsApp message with the keyword <strong className="text-emerald-400">&quot;DELETE MY DATA&quot;</strong> or <strong className="text-emerald-400">&quot;STOP&quot;</strong> to our official business number.
                </p>
                <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-300">
                  WhatsApp: +91 95974 82991
                </div>
              </div>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Immediate automated suppression
              </div>
            </div>

            {/* Method 2: Written Request */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-100">Method 2: Contact Support</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Submit a deletion request specifying your phone number and business name via our support channels.
                </p>
                <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-300">
                  Reliable Vision Data Privacy Officer<br />
                  Website: https://reliable-vision.vercel.app
                </div>
              </div>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                <Clock className="w-4 h-4" /> Processed within 24-48 hours
              </div>
            </div>
          </div>
        </section>

        {/* What gets deleted */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" /> What Information is Deleted?
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-3 text-sm text-gray-300">
            <p>Upon receiving and verifying a deletion request, we permanently purge:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-xs sm:text-sm">
              <li>Your WhatsApp phone number and contact profile.</li>
              <li>Complete inbound and outbound message conversation history stored in our CRM database.</li>
              <li>AI-generated conversation notes and classification metadata.</li>
              <li>All pending follow-up schedules in the automation queue.</li>
            </ul>
          </div>
        </section>

        {/* Verification and Confirmation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Confirmation & Verification
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-3 text-sm text-gray-300">
            <p>
              Once your data has been deleted, our systems will provide an electronic confirmation. Your phone number will remain on a minimal suppression list solely to prevent accidental re-contacting in future outreach campaigns, in accordance with applicable telecommunications compliance standards.
            </p>
            <p className="pt-2 text-xs text-gray-400">
              For additional details regarding our privacy practices, please review our{' '}
              <Link href="/privacy-policy" className="text-indigo-400 underline hover:text-indigo-300 font-medium">
                Privacy Policy
              </Link>.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-gray-950 py-8 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Reliable Vision Web Studio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-200">Privacy Policy</Link>
            <Link href="/data-deletion" className="text-gray-400 hover:text-gray-200">Data Deletion</Link>
            <Link href="/" className="text-gray-400 hover:text-gray-200">CRM Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
