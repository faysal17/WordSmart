import React from 'react';
import { Flame, Brain, CheckCircle, Clock, Database, CloudCheck, User, LogOut } from 'lucide-react';

export default function StatsHeader({ stats, user, onOpenAuth, onOpenGuide, onLogout }) {
  return (
    <div className="w-full space-y-4 mb-6">
      {/* Top Banner & User Profile */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              WordSmart
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal border border-indigo-500/30">
                SM-2 Active Recall
              </span>
            </h1>
            <p className="text-xs text-slate-400">Spaced Repetition & Vocabulary Mastery</p>
          </div>
        </div>

        {/* User Account State */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {user.email ? user.email[0].toUpperCase() : 'U'}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">{user.email}</p>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CloudCheck className="w-3 h-3" /> Cloud Synced
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition active:scale-95"
              >
                <User className="w-4 h-4" />
                Sign In / Sync Cloud
              </button>

              <button
                onClick={onOpenGuide}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs border border-slate-700"
                title="Supabase Setup Guide"
              >
                <Database className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SRS Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">{stats.dueToday}</div>
            <div className="text-[11px] font-medium text-slate-400">Due Today</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">{stats.mastered}</div>
            <div className="text-[11px] font-medium text-slate-400">Mastered</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">{stats.learning}</div>
            <div className="text-[11px] font-medium text-slate-400">In Progress</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-white">{stats.streak} Days</div>
            <div className="text-[11px] font-medium text-slate-400">Active Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}
