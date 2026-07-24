import React, { useState } from 'react';
import { X, Copy, Check, Database, Key, Server, Terminal } from 'lucide-react';

export default function SupabaseGuideModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlSchema = `-- 1. Create table for storing user SRS flashcard progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  repetitions INT DEFAULT 0,
  interval INT DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  last_reviewed_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'new',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for authenticated user access
CREATE POLICY "Users can manage their own vocabulary progress" 
ON public.user_progress
FOR ALL 
USING (auth.uid() = user_id);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 glass-card rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Supabase Setup & Cloud Sync Guide</h3>
            <p className="text-xs text-slate-400">Step-by-step instructions to connect cloud persistence</p>
          </div>
        </div>

        {/* Step 1 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">1</span>
            Create Supabase Project & Table
          </h4>
          <p className="text-xs text-slate-300">
            Sign up at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">supabase.com</a>, create a project, then open the <strong>SQL Editor</strong> tab and execute the SQL snippet below:
          </p>
          
          <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300">
            <button
              onClick={copySql}
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
            <pre className="overflow-x-auto whitespace-pre-wrap">{sqlSchema}</pre>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">2</span>
            Retrieve API Keys & Environment Variables
          </h4>
          <p className="text-xs text-slate-300">
            In your Supabase Dashboard, navigate to <strong>Project Settings &gt; API</strong> and copy your <strong>Project URL</strong> and <strong>anon (public) API key</strong>.
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 space-y-1">
            <div>VITE_SUPABASE_URL=https://your-project-ref.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=your-anon-public-key-here</div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold">3</span>
            Deployment (Vercel or Netlify)
          </h4>
          <p className="text-xs text-slate-300">
            Add <code className="bg-slate-900 text-indigo-300 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="bg-slate-900 text-indigo-300 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> to your deployment environment variables under project settings.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
