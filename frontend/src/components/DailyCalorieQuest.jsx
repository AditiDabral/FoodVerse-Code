import React from 'react';
import {
  Flame,
  Plus,
  RotateCcw,
  Check,
  Lock,
} from 'lucide-react';

/* 4 Cute Cartoon Avocado Mascot Stages (A, B, C, D) */
export const MilestoneAvocadoCartoon = ({ stage, unlocked }) => (
  <svg 
    viewBox="0 0 110 110" 
    className={`w-16 h-16 sm:w-20 sm:h-20 transition-all duration-500 ${
      unlocked ? 'scale-100 drop-shadow-sm' : 'grayscale opacity-40 scale-95'
    }`}
  >
    {/* Cute Arms (Raised high when unlocked!) */}
    {unlocked ? (
      <>
        <path d="M22 58 Q8 40 16 32" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        <path d="M88 58 Q102 40 94 32" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M22 62 Q12 70 16 78" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        <path d="M88 62 Q98 70 94 78" fill="none" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      </>
    )}

    {/* Cute Little Feet */}
    <ellipse cx="43" cy="99" rx="6" ry="3.5" fill="#0f172a" />
    <ellipse cx="67" cy="99" rx="6" ry="3.5" fill="#0f172a" />

    {/* Avocado Outer Dark Green Body */}
    <path 
      d="M55 16 C34 16, 22 44, 22 70 C22 90, 36 98, 55 98 C74 98, 88 90, 88 70 C88 44, 76 16, 55 16 Z" 
      fill="#15803d" 
      stroke="#0f172a" 
      strokeWidth="4" 
    />
    {/* Avocado Light Green Flesh */}
    <path 
      d="M55 22 C38 22, 28 46, 28 69 C28 85, 39 92, 55 92 C71 92, 82 85, 82 69 C82 46, 72 22, 55 22 Z" 
      fill="#bef264" 
      stroke="#0f172a" 
      strokeWidth="2" 
    />
    {/* Soft Cream Center */}
    <path 
      d="M55 28 C42 28, 34 48, 34 68 C34 81, 43 87, 55 87 C67 87, 76 81, 76 68 C76 48, 68 28, 55 28 Z" 
      fill="#ecfccb" 
    />

    {/* STAGE ACCESSORIES */}
    {stage === 'sprout' && (
      <path d="M55 16 Q65 2 74 10 Q64 18 55 16 Z" fill="#22c55e" stroke="#0f172a" strokeWidth="3" />
    )}
    {stage === 'fitness' && (
      <path d="M31 35 Q55 29 79 35" fill="none" stroke="#ef4444" strokeWidth="5.5" strokeLinecap="round" />
    )}
    {stage === 'chef' && (
      <path d="M40 18 C35 10, 44 3, 50 7 C55 2, 65 4, 67 10 C73 10, 74 17, 69 18 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
    )}
    {stage === 'champion' && (
      <polygon points="40,18 47,6 55,14 63,6 70,18" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    )}

    {/* Eyes */}
    {unlocked ? (
      <>
        <circle cx="44" cy="46" r="3.8" fill="#0f172a" />
        <circle cx="66" cy="46" r="3.8" fill="#0f172a" />
        <circle cx="45.2" cy="44.8" r="1.4" fill="#ffffff" />
        <circle cx="67.2" cy="44.8" r="1.4" fill="#ffffff" />
      </>
    ) : (
      <>
        <path d="M40 46 Q44 49 48 46" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 46 Q66 49 70 46" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      </>
    )}

    {/* Rosy Cheeks */}
    <ellipse cx="37" cy="51" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.8" />
    <ellipse cx="73" cy="51" rx="4.5" ry="2.5" fill="#fb7185" opacity="0.8" />

    {/* Mouth */}
    {unlocked ? (
      <path d="M49 50 Q55 56 61 50" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
    ) : (
      <line x1="51" y1="52" x2="59" y2="52" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
    )}

    {/* Cute Avocado Pit */}
    <circle cx="55" cy="72" r="13.5" fill="#92400e" stroke="#0f172a" strokeWidth="3.5" />
    <path d="M48 65 A8 8 0 0 1 58 62" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const CALORIE_MILESTONES = [
  {
    id: 'A',
    targetKcal: 500,
    title: 'MORNING FUEL',
    subtitle: '500 kcal logged',
    cardBg: 'bg-[#bbf7d0]',
    badgeColor: 'bg-[#86efac]',
    stage: 'sprout'
  },
  {
    id: 'B',
    targetKcal: 1000,
    title: 'HALFWAY HERO',
    subtitle: '1,000 kcal logged',
    cardBg: 'bg-[#fef08a]',
    badgeColor: 'bg-[#fde047]',
    stage: 'fitness'
  },
  {
    id: 'C',
    targetKcal: 1500,
    title: 'MACRO MASTER',
    subtitle: '1,500 kcal logged',
    cardBg: 'bg-[#bae6fd]',
    badgeColor: 'bg-[#7dd3fc]',
    stage: 'chef'
  },
  {
    id: 'D',
    targetKcal: 2000,
    title: 'GOAL CRUSHED!',
    subtitle: '2,000 kcal target',
    cardBg: 'bg-[#fbcfe8]',
    badgeColor: 'bg-[#f472b6]',
    stage: 'champion'
  }
];

export default function DailyCalorieQuest({
  calories = 0,
  dailyGoal = 2000,
  onAddCalories,
  onResetCalories,
}) {
  const progressPercent = Math.min(100, Math.round((calories / dailyGoal) * 100));
  const unlockedCount = CALORIE_MILESTONES.filter((m) => calories >= m.targetKcal).length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-6">
      
      {/* Top Header of Quest Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[#fde047] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-slate-900 text-xs font-black uppercase tracking-wide">
                Daily Calorie Quest 🥑
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-700">
                {unlockedCount} of 4 Milestones Unlocked
              </span>
            </div>

            <span className="text-sm sm:text-base font-black text-slate-900">
              {calories} / {dailyGoal} kcal ({progressPercent}%)
            </span>
          </div>

          {/* Big Progress Bar */}
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border-2 border-slate-900 shadow-inner">
            <div
              className="h-full rounded-full bg-[#86efac] border-r-2 border-slate-900 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons to Test & Unlock Milestones Live */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-0">
          <button
            onClick={() => onAddCalories?.(350)}
            className="px-4 py-2 rounded-full bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Log Meal (+350 kcal)</span>
          </button>

          <button
            onClick={() => onAddCalories?.(500)}
            className="px-4 py-2 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
            <span>Hit Next Goal (+500 kcal)</span>
          </button>

          <button
            onClick={() => onResetCalories?.(0)}
            title="Reset Calories to 0"
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] text-xs font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 4 Cute Cartoon Avocado Milestone Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CALORIE_MILESTONES.map((m) => {
          const isUnlocked = calories >= m.targetKcal;
          return (
            <div
              key={m.id}
              className={`relative rounded-3xl p-4 sm:p-5 border-2 border-slate-900 transition-all duration-200 ease-in-out flex flex-col items-center text-center cursor-pointer ${
                isUnlocked
                  ? `${m.cardBg} shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a]`
                  : 'bg-slate-100 opacity-60 shadow-[2px_2px_0px_#0f172a] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0px_#0f172a]'
              }`}
            >
              {/* Top-Left Letter Badge (A, B, C, D) */}
              <span
                className={`absolute top-3 left-3 w-6 h-6 rounded-full border-2 border-slate-900 text-slate-900 text-[11px] font-black flex items-center justify-center ${
                  isUnlocked ? m.badgeColor : 'bg-slate-300'
                }`}
              >
                {m.id}
              </span>

              {/* Top-Right Status Badge */}
              <span
                className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-slate-900 flex items-center gap-1 ${
                  isUnlocked
                    ? 'bg-white text-slate-900 shadow-[1px_1px_0px_#0f172a]'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> UNLOCKED
                  </>
                ) : (
                  <>
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" /> {m.targetKcal} kcal
                  </>
                )}
              </span>

              {/* Cartoon Avocado Mascot */}
              <div className="my-2 pt-3">
                <MilestoneAvocadoCartoon stage={m.stage} unlocked={isUnlocked} />
              </div>

              <h3 className="text-xs sm:text-sm font-black tracking-wide text-slate-900 uppercase mt-1">
                {m.title}
              </h3>
              <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                {m.subtitle}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
