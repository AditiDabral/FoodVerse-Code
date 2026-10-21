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
  Plus,
  RotateCcw,
  Check,
  Lock,
  Utensils,
  Apple,
  ChefHat,
  ArrowRight,
  Eye,
  CheckCircle2,
  Smile,
  Pencil,
  X
} from 'lucide-react';

import DailyCalorieQuest, { MilestoneAvocadoCartoon, CALORIE_MILESTONES } from './DailyCalorieQuest';
export { MilestoneAvocadoCartoon, CALORIE_MILESTONES };

export default function OverviewTab({
  calories = 0,
  dailyGoal = 2000,
  onAddCalories,
  onResetCalories,
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

  const tdee = 2150;
  const remaining = Math.max(0, dailyGoal - calories);
  const progressPercent = Math.min(100, Math.round((calories / dailyGoal) * 100));
  const unlockedCount = CALORIE_MILESTONES.filter((m) => calories >= m.targetKcal).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ============================================================
          SECTION 1: Welcome Header & Dynamic Name + Action Pills
         ============================================================ */}
      <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#fde047] border-b-2 border-slate-900" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left: Personalized Greeting ("Welcome back, {userName}! 🥑") */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3.5 py-1 rounded-full bg-[#fde047] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-slate-900 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-900" />
                  Daily Overview
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Dynamic Header: "Welcome back, {userName}! 🥑" with prominent inline edit button */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
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
                      className="text-xl sm:text-2xl font-black text-slate-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] rounded-lg px-1 transition-all duration-200 w-36 sm:w-48 placeholder:text-slate-400 placeholder:font-medium placeholder:italic"
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
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 font-bold max-w-2xl">
                Your FoodVerse AI health dashboard is live — track, scan, and plan smarter.
              </p>
            </div>

            {/* Right: Quick-Access Action Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab?.('freshness-check')}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Quick Freshness Scan</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab?.('meal-planner')}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>View 7-Day Plan</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

          </div>
        </div>

        {/* ============================================================
            SECTION 2: Metrics Snapshot (3-Column Layout)
           ============================================================ */}
        <div className="border-t-2 border-slate-900 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-slate-900">
            
            {/* ─── Column 1: Today's Calories ─── */}
            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#fed7aa] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                    <Flame className="w-4 h-4 fill-amber-500 text-slate-900" />
                  </div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Today's Calories
                  </span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-[#fde047] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-2.5 py-0.5 rounded-lg">
                  {progressPercent}%
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{calories}</span>
                <span className="text-sm font-bold text-slate-500">/ {dailyGoal} kcal</span>
              </div>

              {/* Progress bar with strict black border */}
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner p-0.5">
                <div
                  className="h-full rounded-full bg-[#86efac] border-r-2 border-slate-900 transition-all duration-700 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span>{remaining > 0 ? `${remaining} kcal remaining` : '🎉 Goal achieved!'}</span>
                <span className="text-slate-900 font-black">{calories >= 1000 ? 'On Track' : 'Needs Fuel'}</span>
              </div>
            </div>

            {/* ─── Column 2: Active TDEE ─── */}
            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                  <Activity className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Active TDEE
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{tdee}</span>
                <span className="text-sm font-bold text-slate-500">kcal/day</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef08a] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-slate-900 text-xs font-black">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-900" />
                  <span>Moderately Active · BMR × 1.55</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-bold">
                Calibrated to your metabolic expenditure & goals
              </p>
            </div>

            {/* ─── Column 3: System Status ─── */}
            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#bae6fd] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  System Status
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-900" />
                </span>
                <span className="text-xl font-black text-slate-900">All Systems Go</span>
              </div>

              <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Freshness AI
                  </span>
                  <span className="font-black text-slate-900 bg-[#bbf7d0] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-md text-[10px]">
                    Optimal
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Eye className="w-3.5 h-3.5 text-teal-600" /> Vision Engine
                  </span>
                  <span className="font-black text-slate-900 bg-[#bae6fd] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-md text-[10px]">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Groq LLM
                  </span>
                  <span className="font-black text-slate-900 bg-[#fde047] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-md text-[10px]">
                    Connected
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: Daily Calorie Quest & Milestones Section
         ============================================================ */}
      <DailyCalorieQuest 
        calories={calories}
        dailyGoal={dailyGoal}
        onAddCalories={onAddCalories}
        onResetCalories={onResetCalories}
      />

      {/* ============================================================
          SECTION 4: Quick Module Navigation Cards
         ============================================================ */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Explore FoodVerse AI Capabilities
          </h2>
          <p className="text-xs text-slate-500 font-bold">
            Jump directly into any multimodal vision or intelligent meal planning module
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          
          {/* Card 1: Nutrition */}
          <div 
            onClick={() => setActiveTab?.('track-meals')}
            className="group p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-[#fefce8] hover:bg-[#fde047] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#fed7aa] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <Utensils className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Track Meals
              </h3>
              <p className="text-[11px] text-slate-700 font-semibold leading-snug">
                1420 kcal ring chart, macronutrient bars & food logging.
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open Nutrition <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>

          {/* Card 2: Freshness */}
          <div 
            onClick={() => setActiveTab?.('freshness-check')}
            className="group p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-[#f0fdf4] hover:bg-[#bbf7d0] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#86efac] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <Apple className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Freshness Check
              </h3>
              <p className="text-[11px] text-slate-700 font-semibold leading-snug">
                OpenCV discoloration, shelf-life days & spoilage grading.
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Check Produce <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>

          {/* Card 3: Hygiene */}
          <div 
            onClick={() => setActiveTab?.('hygiene-monitor')}
            className="group p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-[#f0f9ff] hover:bg-[#bae6fd] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#7dd3fc] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Hygiene Monitor
              </h3>
              <p className="text-[11px] text-slate-700 font-semibold leading-snug">
                Kitchen PPE compliance, video frame audits & violations.
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Scan Kitchen <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>

          {/* Card 4: AI Chef */}
          <div 
            onClick={() => setActiveTab?.('cooking-assistant')}
            className="group p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-[#fdf2f8] hover:bg-[#fbcfe8] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#f472b6] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <ChefHat className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                AI Chef Assistant
              </h3>
              <p className="text-[11px] text-slate-700 font-semibold leading-snug">
                Voice/text cooking tips, ingredient matching & instructions.
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Ask AI Chef <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>

          {/* Card 5: Planner */}
          <div 
            onClick={() => setActiveTab?.('meal-planner')}
            className="group p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-[#faf5ff] hover:bg-[#e9d5ff] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#c084fc] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900">
                <CalendarDays className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Meal Planner
              </h3>
              <p className="text-[11px] text-slate-700 font-semibold leading-snug">
                Target calories, macros & 7-day adaptive dietary schedules.
              </p>
            </div>
            <span className="text-[11px] font-black text-slate-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Generate Plan <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
