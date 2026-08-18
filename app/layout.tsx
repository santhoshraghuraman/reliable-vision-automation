import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from '@/components/layout/Sidebar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Reliable Vision CRM — AI-Powered Lead Automation',
  description:
    'Reliable Vision CRM: AI-powered lead management with WhatsApp automation, n8n workflows, and Gemini intelligence.',
  keywords: ['CRM', 'Lead Management', 'WhatsApp', 'AI Automation'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-gray-950 text-gray-200 antialiased font-sans">
        <div className="flex h-full min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#e5e7eb',
              border: '1px solid #374151',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#1f2937' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#1f2937' },
            },
          }}
        />
      </body>
    </html>
  )
}
