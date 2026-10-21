import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Flame,
  Zap,
  CalendarDays,
  TrendingUp,
  Heart,
  Leaf,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';

/**
 * OverviewBanner — A premium welcome banner with dynamic name retrieval,
 * live metrics snapshot, and quick-access action pills for tab navigation.
 *
 * Props:
 *  - calories      (number)  Current logged calories
 *  - dailyGoal     (number)  Daily calorie target
 *  - setActiveTab   (fn)     Tab switcher from App
 *  - userName       (string) Optional override for the displayed name
 */
export default function OverviewBanner({
  calories = 0,
  dailyGoal = 2000,
  setActiveTab,
  userName: initialUserName,
}) {
  // 1. State & LocalStorage Integration: default to "(your name)"
  const DEFAULT_NAME_PLACEHOLDER = '(your name)';

  const isPlaceholder = (name) => {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower === 'bhavya' ||
      lower === '(your name)' ||
      lower === 'your name' ||
      lower === 'enter the name' ||
      lower === 'enter name'
    );
  };

  const [userName, setUserName] = useState(DEFAULT_NAME_PLACEHOLDER);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Check localStorage when component mounts, fallback to "(your name)"
  useEffect(() => {
    try {
      const storedName = localStorage.getItem('foodverse_username');
      if (storedName && storedName.trim() && !isPlaceholder(storedName)) {
        setUserName(storedName.trim());
      } else if (initialUserName && initialUserName.trim() && !isPlaceholder(initialUserName)) {
        setUserName(initialUserName.trim());
      } else {
        setUserName(DEFAULT_NAME_PLACEHOLDER);
      }
    } catch {
      setUserName(DEFAULT_NAME_PLACEHOLDER);
    }
  }, [initialUserName]);

  // Save new name to state & localStorage immediately
  const handleSaveName = (nameToSave) => {
    const rawVal = (nameToSave !== undefined ? nameToSave : tempName).trim();
    const finalName = rawVal && !isPlaceholder(rawVal) ? rawVal : DEFAULT_NAME_PLACEHOLDER;
    setUserName(finalName);
    setIsEditingName(false);
    try {
      if (finalName === DEFAULT_NAME_PLACEHOLDER) {
        localStorage.removeItem('foodverse_username');
      } else {
        localStorage.setItem('foodverse_username', finalName);
      }
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save username to localStorage', e);
    }
  };

  const handleStartEdit = () => {
    setTempName(isPlaceholder(userName) ? '' : userName);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setTempName(isPlaceholder(userName) ? '' : userName);
    setIsEditingName(false);
  };

  // --------------- Derived Metrics --------------- //
  const tdee = 2150; // Active TDEE estimate (could be computed from profile)
  const remaining = Math.max(0, dailyGoal - calories);
  const progressPct = Math.min(100, Math.round((calories / dailyGoal) * 100));

  // Freshness AI status (could be wired to a health check later)
  const [aiStatus] = useState('Optimal');

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] overflow-hidden relative">
      {/* ============================================================
          TOP SECTION: Welcome + Quick Actions
         ============================================================ */}
      <div className="relative px-6 sm:px-8 pt-7 pb-5">
        {/* Decorative neo-brutalist accent stripe */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#fde047] border-b-2 border-slate-900" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Greeting ("Welcome back, {userName}! 🥑") */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span>Welcome back,</span>
                {isEditingName ? (
                  <span className="inline-flex items-center gap-1.5 bg-[#fefce8] border-2 border-slate-900 rounded-xl px-2.5 py-1 shadow-[2px_2px_0px_#0f172a]">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                      className="text-lg sm:text-xl font-black text-slate-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] rounded-lg px-1 transition-all duration-200 w-32 sm:w-44 placeholder:text-slate-400 placeholder:font-medium placeholder:italic"
                      placeholder="Enter your name"
                    />
                    <button
                      onClick={() => handleSaveName()}
                      title="Save name"
                      className="p-1.5 rounded-lg bg-[#86efac] hover:bg-[#4ade80] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      title="Cancel"
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`cursor-pointer transition-all ${
                        isPlaceholder(userName)
                          ? 'text-emerald-700 hover:text-emerald-900 underline decoration-dashed decoration-slate-900 decoration-2 underline-offset-4'
                          : 'text-emerald-700 hover:text-emerald-900 hover:underline decoration-slate-900 decoration-2 underline-offset-4'
                      }`}
                      title="Click to enter your name"
                      onClick={handleStartEdit}
                    >
                      {userName}
                    </span>
                    <button
                      onClick={handleStartEdit}
                      title="Edit display name"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#fde047] hover:bg-[#facc15] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 stroke-[2.5] text-slate-900" />
                      <span className="text-xs font-black tracking-tight">Edit</span>
                    </button>
                  </span>
                )}
                <span>! 🥑</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-bold">
              Your FoodVerse AI health dashboard is live — track, scan, and plan smarter.
            </p>
          </div>

          {/* Right: Quick-Access Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab?.('freshness-check')}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>⚡ Quick Freshness Scan</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setActiveTab?.('meal-planner')}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>📅 View 7-Day Plan</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          BOTTOM SECTION: 3-Column Metrics Snapshot
         ============================================================ */}
      <div className="border-t-2 border-slate-900 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-900">

          {/* ─── Metric 1: Today's Calories ─── */}
          <div className="px-6 sm:px-8 py-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#fed7aa] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <Flame className="w-4 h-4 text-slate-900 fill-slate-900" />
              </div>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                Today's Calories
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{calories}</span>
              <span className="text-sm font-bold text-slate-500">/ {dailyGoal} kcal</span>
            </div>
            {/* Mini progress bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
              <div
                className="h-full rounded-full bg-[#86efac] border-r-2 border-slate-900 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-600 font-bold">
              {remaining > 0 ? `${remaining} kcal remaining` : '🎉 Daily goal reached!'}
            </p>
          </div>

          {/* ─── Metric 2: Active TDEE ─── */}
          <div className="px-6 sm:px-8 py-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                Active TDEE
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{tdee}</span>
              <span className="text-sm font-bold text-slate-500">kcal/day</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5] text-slate-900" />
              <span className="text-[11px] font-black text-slate-900">
                Moderately Active · BMR × 1.55
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-bold">
              Based on your profile settings
            </p>
          </div>

          {/* ─── Metric 3: System Status ─── */}
          <div className="px-6 sm:px-8 py-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#bae6fd] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                System Status
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900" />
              </span>
              <span className="text-lg font-black text-slate-900">All Systems Go</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Leaf className="w-3 h-3 text-emerald-600 stroke-[2.5]" /> Freshness AI
                </span>
                <span className="text-[11px] font-black text-slate-900 px-1.5 py-0.5 rounded bg-[#bbf7d0] border border-slate-900">{aiStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Heart className="w-3 h-3 text-rose-500 stroke-[2.5]" /> Vision Engine
                </span>
                <span className="text-[11px] font-black text-slate-900 px-1.5 py-0.5 rounded bg-[#bbf7d0] border border-slate-900">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Sparkles className="w-3 h-3 text-amber-500 stroke-[2.5]" /> Groq LLM
                </span>
                <span className="text-[11px] font-black text-slate-900 px-1.5 py-0.5 rounded bg-[#bbf7d0] border border-slate-900">Connected</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
