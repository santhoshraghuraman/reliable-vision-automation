'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BUSINESS_INFO } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@reliablevision.in');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-xl shadow-brand-600/30 mb-2">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {BUSINESS_INFO.name}
          </h1>
          <p className="text-xs sm:text-sm text-brand-400 font-medium">
            AI Lead Automation & Admin Studio Dashboard
          </p>
        </div>

        {/* Demo Credentials Alert Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1 backdrop-blur-md">
          <div className="flex items-center gap-2 text-brand-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Stage 1 UI Preview Mode</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Authentication mock active. Click <strong className="text-white">Sign In</strong> to enter the dashboard.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <Input
              label="Admin Email Address"
              type="email"
              placeholder="admin@reliablevision.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-950 text-brand-600 focus:ring-brand-500"
                />
                Remember this device
              </label>
              <a href="#" className="text-brand-400 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Dashboard
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Reliable Vision | Web Studio • Tamil Nadu, India • Stage 1
        </p>
      </div>
    </div>
  );
}
