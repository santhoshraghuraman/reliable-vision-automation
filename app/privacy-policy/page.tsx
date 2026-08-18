import Link from 'next/link'
import { Shield, ArrowLeft, Lock, Database, Sparkles, MessageSquare, Trash2, Mail, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | Reliable Vision Web Studio',
  description: 'Privacy Policy for Reliable Vision Web Studio CRM and WhatsApp Communication Services.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 14, 2026'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-100">Reliable Vision Web Studio</h1>
              <p className="text-xs text-gray-400">Legal & Privacy Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/data-deletion"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Data Deletion Instructions →
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Lock className="w-3.5 h-3.5" /> Official Privacy Notice
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-400">
            Last Updated: <span className="text-gray-300 font-medium">{lastUpdated}</span>
          </p>
        </div>

        {/* Intro */}
        <section className="space-y-4 text-gray-300 leading-relaxed text-sm">
          <p>
            At <strong className="text-white">Reliable Vision Web Studio</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we are committed to protecting the privacy, confidentiality, and security of the personal data shared with us. This Privacy Policy explains how our Customer Relationship Management (CRM) platform collects, processes, stores, and protects information when interacting with leads, clients, and partners via our website, WhatsApp messaging, and associated communication services.
          </p>
        </section>

        {/* Section 1: Data We Collect */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> 1. Information We Collect
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 text-sm text-gray-300">
            <p>We only collect information necessary to provide web design and CRM services:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-gray-100">Contact Information:</strong> Phone numbers (including WhatsApp mobile numbers), business names, contact persons, and email addresses.</li>
              <li><strong className="text-gray-100">Communication History:</strong> Inbound and outbound WhatsApp messages, timestamps, message delivery statuses, and customer inquiries.</li>
              <li><strong className="text-gray-100">CRM Lead Records:</strong> Business category, website requirements, service preferences, interaction notes, and conversation classification metadata.</li>
              <li><strong className="text-gray-100">Opt-out Preferences:</strong> Records of unsubscribe or opt-out requests to ensure zero unwanted communications.</li>
            </ul>
          </div>
        </section>

        {/* Section 2: How We Use Your Data */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" /> 2. How We Use Information
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-3 text-sm text-gray-300">
            <p>We process personal and business data strictly for the following purposes:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-gray-950/60 border border-gray-800/80 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-200 mb-1">WhatsApp Communications</h3>
                <p className="text-xs text-gray-400">Sending project updates, design mockups, and customer support responses via WhatsApp Cloud API.</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800/80 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-200 mb-1">Automated Follow-ups</h3>
                <p className="text-xs text-gray-400">Sending timely, respectful follow-up notifications regarding active design proposals (max 2 attempts).</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800/80 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-200 mb-1">AI-Assisted Classification</h3>
                <p className="text-xs text-gray-400">Categorizing incoming inquiries to assist human team members in providing accurate and helpful responses.</p>
              </div>
              <div className="bg-gray-950/60 border border-gray-800/80 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-200 mb-1">Opt-Out & Compliance</h3>
                <p className="text-xs text-gray-400">Honoring user preferences and immediately blocking messaging for opted-out contacts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Third-Party Processors */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> 3. Third-Party Service Providers
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 text-sm text-gray-300">
            <p>We work with trusted third-party cloud infrastructure providers to operate our services:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-gray-100">Meta Platforms, Inc. (WhatsApp Cloud API):</strong> Used for secure delivery of WhatsApp messages in compliance with Meta&apos;s Business Messaging Terms.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-gray-100">Supabase:</strong> Encrypted cloud database and PostgreSQL infrastructure used to store CRM records and conversation logs.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-gray-100">Google Cloud / Gemini AI:</strong> Used to generate suggested draft responses and analyze inquiry intent. Customer data is processed ephemerally and is not used to train public foundation models.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-gray-100">Vercel:</strong> Cloud hosting infrastructure providing HTTPS encryption and serverless application hosting.
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Opt-Out & User Rights */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" /> 4. Opt-Out & Your Rights
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 text-sm text-gray-300">
            <p>You have full control over your communication preferences:</p>
            <div className="space-y-3">
              <div className="p-3 bg-gray-950/80 border border-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-200">Immediate WhatsApp Opt-Out</h3>
                <p className="text-xs text-gray-400 mt-1">
                  You can opt out at any time by replying <strong className="text-rose-400">&quot;STOP&quot;</strong>, <strong className="text-rose-400">&quot;UNSUBSCRIBE&quot;</strong>, or <strong className="text-rose-400">&quot;NOT INTERESTED&quot;</strong> to any of our WhatsApp messages. Our system will immediately mark your profile as opted out and cancel all pending communications.
                </p>
              </div>

              <div className="p-3 bg-gray-950/80 border border-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-200">Data Access & Deletion Requests</h3>
                <p className="text-xs text-gray-400 mt-1">
                  You have the right to request access to, correction of, or permanent deletion of your personal data from our systems. For detailed instructions, visit our{' '}
                  <Link href="/data-deletion" className="text-indigo-400 underline hover:text-indigo-300 font-medium">
                    Data Deletion Page
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Security & Retention */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" /> 5. Data Security & Retention
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-3 text-sm text-gray-300">
            <p>
              We implement industry-standard encryption protocols (HTTPS/TLS in transit and AES-256 at rest) to safeguard all data. Access to CRM records is restricted via role-based access control and secure API tokens. We retain customer data only as long as necessary to fulfill project requirements, provide customer support, and maintain legal compliance.
            </p>
          </div>
        </section>

        {/* Section 6: Contact */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" /> 6. Contact Information
          </h2>
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-2 text-sm text-gray-300">
            <p>For any privacy inquiries, data requests, or support, please contact:</p>
            <div className="pt-2 text-gray-200 font-mono text-xs space-y-1">
              <p><strong>Reliable Vision Web Studio</strong></p>
              <p>WhatsApp Business: +91 95974 82991</p>
              <p>Website: https://reliable-vision.vercel.app</p>
            </div>
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
