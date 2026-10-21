import React from 'react';
import { navTabs } from '../App';
import { Flame, Trophy, Sparkles, Plus } from 'lucide-react';

/* Mini Cute Cartoon Avocado SVG for Header Logo */
const HeaderAvocadoLogo = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8">
    <path 
      d="M50 10 C30 10, 16 38, 16 64 C16 84, 30 94, 50 94 C70 94, 84 84, 84 64 C84 38, 70 10, 50 10 Z" 
      fill="#15803d" 
      stroke="#0f172a" 
      strokeWidth="6" 
    />
    <path 
      d="M50 18 C34 18, 24 42, 24 63 C24 79, 35 86, 50 86 C65 86, 76 79, 76 63 C76 42, 66 18, 50 18 Z" 
      fill="#bef264" 
    />
    {/* Eyes & Smile */}
    <circle cx="39" cy="42" r="4.5" fill="#0f172a" />
    <circle cx="61" cy="42" r="4.5" fill="#0f172a" />
    <path d="M43 47 Q50 53 57 47" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
    {/* Avocado Pit */}
    <circle cx="50" cy="68" r="14" fill="#92400e" stroke="#0f172a" strokeWidth="5" />
    <path d="M44 62 A7 7 0 0 1 53 59" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  calories = 0, 
  dailyGoal = 2000, 
  onQuickAddCalories 
}) {
  // Calculate current Milestone Rank (A, B, C, D)
  const getMilestoneBadge = () => {
    if (calories >= 2000) return { rank: 'RANK D · CHAMPION', bg: 'bg-[#dce4f2]' };
    if (calories >= 1500) return { rank: 'RANK C · CHEF AVO', bg: 'bg-[#fbcfe8]' };
    if (calories >= 1000) return { rank: 'RANK B · FIT AVO', bg: 'bg-[#fef08a]' };
    if (calories >= 500)  return { rank: 'RANK A · SPROUT', bg: 'bg-[#bbf7d0]' };
    return { rank: 'STARTER AVO', bg: 'bg-slate-200' };
  };

  const badge = getMilestoneBadge();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-900 shadow-[0_4px_0px_#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* LEFT: Clean Brand Logo */}
        <div 
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center transition-all duration-200 ease-in-out group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a]">
            <HeaderAvocadoLogo />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                FoodVerse<span className="text-emerald-600">.</span>
              </span>
              <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.bg} text-slate-900 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]`}>
                <Trophy className="w-3 h-3 text-amber-500 fill-amber-500" />
                {badge.rank}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              Multimodal Food Intelligence Platform
            </p>
          </div>
        </div>

        {/* CENTER: Neo-Brutalist Tab Navigation Pills (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-full border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black cursor-pointer ${
                  isActive
                    ? 'bg-[#fde047] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out'
                    : 'text-slate-800 hover:text-slate-900 hover:bg-[#bbf7d0] border-2 border-transparent hover:border-slate-900 transition-colors duration-200 ease-in-out'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Live Calorie Pill + Action Button */}
        <div className="flex items-center gap-2.5">
          
          {/* Live Synced Calorie Counter Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
            <Flame className="w-4 h-4 fill-orange-500 text-slate-900 flex-shrink-0" />
            <div className="text-left leading-none">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                {calories}
              </span>
              <span className="hidden sm:inline text-[11px] font-bold text-slate-500">
                {' '}/ {dailyGoal} kcal
              </span>
            </div>
          </div>

          {/* Quick "+" Snack Log Button */}
          {onQuickAddCalories && (
            <button
              onClick={() => onQuickAddCalories(250)}
              title="Quick Log +250 kcal Snack"
              className="w-9 h-9 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center font-black cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          )}

          {/* FastAPI Status Badge */}
          <div 
            title="FastAPI Backend Connected"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-[11px] font-black text-slate-900"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-slate-900 animate-pulse" />
            <span>API Online</span>
          </div>

        </div>

      </div>
    </header>
  );
}