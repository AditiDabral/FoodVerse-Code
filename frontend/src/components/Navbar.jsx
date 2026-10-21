import React, { useState, useEffect } from 'react';
import { navTabs } from '../App';
import { Flame, Trophy, Sparkles, Plus, Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu if window resizes to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* LEFT: Clean Brand Logo */}
        <div 
          onClick={() => {
            setActiveTab('overview');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
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
            <p className="text-[11px] font-bold text-slate-500 mt-0.5 hidden xs:block">
              Multimodal Food Intelligence Platform
            </p>
          </div>
        </div>

        {/* CENTER: Neo-Brutalist Tab Navigation Pills (Desktop: md and larger) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 bg-slate-100 p-1 lg:p-1.5 rounded-full border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs font-black cursor-pointer ${
                  isActive
                    ? 'bg-[#fde047] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out'
                    : 'text-slate-800 hover:text-slate-900 hover:bg-[#bbf7d0] border-2 border-transparent hover:border-slate-900 transition-colors duration-200 ease-in-out'
                }`}
              >
                <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 stroke-[2.5]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Live Calorie Pill + Quick Action + Mobile Menu Hamburger */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Live Synced Calorie Counter Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] sm:shadow-[3px_3px_0px_#0f172a]">
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
              type="button"
              onClick={() => onQuickAddCalories(250)}
              title="Quick Log +250 kcal Snack"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] sm:shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center font-black cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          )}

          {/* FastAPI Status Badge (Visible on lg+ screens) */}
          <div 
            title="FastAPI Backend Connected"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-[11px] font-black text-slate-900"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-slate-900 animate-pulse" />
            <span>API Online</span>
          </div>

          {/* MOBILE: Neo-Brutalist Hamburger Menu Toggle Button (md:hidden) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] sm:shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center font-black cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            ) : (
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            )}
          </button>

        </div>

      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-[60px] bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE NAVIGATION: Fullscreen / Dropdown Overlay or Horizontal Tab Bar */}
      {mobileMenuOpen ? (
        /* Mobile Dropdown Menu */
        <div className="md:hidden relative z-40 bg-[#fefce8] border-t-2 border-b-4 border-slate-900 shadow-[0_8px_0px_#0f172a] p-4 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
          
          {/* Header inside dropdown */}
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-900">
            <span className="text-xs font-black uppercase text-slate-600 tracking-wider">
              Navigation Menu
            </span>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.bg} text-slate-900 rounded-full border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]`}>
                <Trophy className="w-3 h-3 text-amber-500 fill-amber-500" />
                {badge.rank}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#bbf7d0] border border-slate-900 text-[10px] font-black text-slate-900">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>API Online</span>
              </div>
            </div>
          </div>

          {/* 2-Column Grid of Navigation Tabs */}
          <div className="grid grid-cols-2 gap-2.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl text-xs font-black transition-all duration-200 ease-in-out cursor-pointer ${
                    isActive
                      ? 'bg-[#fde047] text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] translate-x-[2px] translate-y-[2px]'
                      : 'bg-white text-slate-800 hover:text-slate-900 hover:bg-[#bbf7d0] border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0f172a]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-white shadow-[1px_1px_0px_#0f172a]' : 'bg-[#bbf7d0]'
                  }`}>
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col text-left truncate">
                    <span className="leading-tight truncate">{tab.label}</span>
                    {isActive && (
                      <span className="text-[9px] font-black uppercase text-emerald-800">Active</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Daily Calorie Summary inside Dropdown */}
          <div className="pt-2.5 border-t-2 border-slate-900 flex items-center justify-between bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 fill-orange-500 text-slate-900 flex-shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-900">
                  {calories} <span className="text-[10px] font-bold text-slate-500">/ {dailyGoal} kcal</span>
                </p>
                <p className="text-[10px] font-bold text-slate-500">Daily Calorie Target</p>
              </div>
            </div>
            {onQuickAddCalories && (
              <button
                type="button"
                onClick={() => {
                  onQuickAddCalories(250);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+250 kcal</span>
              </button>
            )}
          </div>

        </div>
      ) : (
        /* Mobile Horizontal Scrollable Tab Bar (Beneath Header) */
        <div className="md:hidden border-t-2 border-slate-900 bg-[#fefce8] px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-2 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.04)]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black flex-shrink-0 cursor-pointer transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'bg-[#fde047] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                    : 'bg-white text-slate-800 hover:text-slate-900 hover:bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0f172a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

    </header>
  );
}
