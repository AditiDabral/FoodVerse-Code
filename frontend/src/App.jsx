import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OverviewTab from './components/OverviewTab';
import TrackMealsTab from './components/TrackMealsTab';
import FreshnessCheckTab from './components/FreshnessCheckTab';
import HygieneMonitorTab from './components/HygieneMonitorTab';
import CookingAssistantTab from './components/CookingAssistantTab';
import MealPlannerTab from './components/MealPlannerTab';
import { 
  LayoutDashboard,
  Utensils, 
  Apple, 
  ShieldCheck, 
  ChefHat, 
  CalendarDays
} from 'lucide-react';
import {
  getTodayKey,
  createEmptyDayMeals,
  calculateTotalCalories,
  loadDailyLogsFromStorage,
  saveDailyLogsToStorage,
} from './utils/foodLogManager';

export const navTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'track-meals', label: 'Nutrition', icon: Utensils },
  { id: 'freshness-check', label: 'Freshness', icon: Apple },
  { id: 'hygiene-monitor', label: 'Hygiene', icon: ShieldCheck },
  { id: 'cooking-assistant', label: 'AI Chef', icon: ChefHat },
  { id: 'meal-planner', label: 'Planner', icon: CalendarDays },
];

export default function App() {
  const [activeTab, setActiveTabState] = useState('overview');
  const [tabHistory, setTabHistory] = useState([]);

  // Navigate to a new tab while preserving previous history
  const navigateToTab = (nextTab) => {
    if (!nextTab || nextTab === activeTab) return;
    setTabHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === activeTab) {
        return prev;
      }
      return [...prev, activeTab].slice(-30);
    });
    setActiveTabState(nextTab);
  };

  // Navigate back to the previous tab in history (fallback to overview)
  const handleGoBack = () => {
    setTabHistory((prev) => {
      const newHistory = [...prev];
      let targetTab = 'overview';
      while (newHistory.length > 0) {
        const candidate = newHistory.pop();
        if (candidate && candidate !== activeTab) {
          targetTab = candidate;
          break;
        }
      }
      setActiveTabState(targetTab);
      return newHistory;
    });
  };

  const setActiveTab = navigateToTab;
  const DAILY_GOAL = 2000;

  // Global dynamic food log state initialized from localStorage
  const [dailyLogs, setDailyLogs] = useState(() => loadDailyLogsFromStorage());
  const todayKey = getTodayKey();

  // Ensure current day exists in dailyLogs
  const todayMeals = dailyLogs[todayKey] || createEmptyDayMeals();

  // Dynamic calorie total computed directly from current day's logged foods
  const calories = calculateTotalCalories(todayMeals);

  // Sync state changes to localStorage whenever dailyLogs changes
  useEffect(() => {
    saveDailyLogsToStorage(dailyLogs);
  }, [dailyLogs]);

  // Log a single food item into a meal slot for a specific day (default: today)
  const addFoodItem = ({
    name,
    calories: itemCals,
    protein_g = 0,
    carbs_g = 0,
    fats_g = 0,
    fiber_g = 0,
    mealType = 'lunch',
    dateKey = todayKey,
  }) => {
    const validMealType = ['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType.toLowerCase())
      ? mealType.toLowerCase()
      : 'lunch';

    const newItem = {
      id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: (name || 'Logged Food Item').trim(),
      calories: Math.max(0, Math.round(Number(itemCals) || 0)),
      protein_g: Math.max(0, Math.round((Number(protein_g) || 0) * 10) / 10),
      carbs_g: Math.max(0, Math.round((Number(carbs_g) || 0) * 10) / 10),
      fats_g: Math.max(0, Math.round((Number(fats_g) || 0) * 10) / 10),
      fiber_g: Math.max(0, Math.round((Number(fiber_g) || 0) * 10) / 10),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDailyLogs((prev) => {
      const dayData = prev[dateKey] ? { ...prev[dateKey] } : createEmptyDayMeals();
      const currentSlotItems = Array.isArray(dayData[validMealType]) ? dayData[validMealType] : [];

      const updatedDayData = {
        ...dayData,
        [validMealType]: [...currentSlotItems, newItem],
      };

      const updated = {
        ...prev,
        [dateKey]: updatedDayData,
      };

      saveDailyLogsToStorage(updated);
      return updated;
    });

    return newItem;
  };

  // Log multiple food items at once (e.g., from Nutrition plate scan)
  const addMultipleFoodItems = (items, mealType = 'lunch', dateKey = todayKey) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const validMealType = ['breakfast', 'lunch', 'dinner', 'snacks'].includes(mealType.toLowerCase())
      ? mealType.toLowerCase()
      : 'lunch';

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newItems = items.map((item, idx) => ({
      id: `food_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      name: (item.name || 'Scanned Food').trim(),
      calories: Math.max(0, Math.round(Number(item.calories) || 0)),
      protein_g: Math.max(0, Math.round((Number(item.protein_g) || 0) * 10) / 10),
      carbs_g: Math.max(0, Math.round((Number(item.carbs_g) || 0) * 10) / 10),
      fats_g: Math.max(0, Math.round((Number(item.fats_g) || 0) * 10) / 10),
      fiber_g: Math.max(0, Math.round((Number(item.fiber_g) || 0) * 10) / 10),
      timestamp: timeStr,
    }));

    setDailyLogs((prev) => {
      const dayData = prev[dateKey] ? { ...prev[dateKey] } : createEmptyDayMeals();
      const currentSlotItems = Array.isArray(dayData[validMealType]) ? dayData[validMealType] : [];

      const updatedDayData = {
        ...dayData,
        [validMealType]: [...currentSlotItems, ...newItems],
      };

      const updated = {
        ...prev,
        [dateKey]: updatedDayData,
      };

      saveDailyLogsToStorage(updated);
      return updated;
    });

    return newItems;
  };

  // Remove a food item from a meal slot
  const removeFoodItem = (itemId, mealType, dateKey = todayKey) => {
    setDailyLogs((prev) => {
      if (!prev[dateKey] || !prev[dateKey][mealType]) return prev;

      const updatedSlot = prev[dateKey][mealType].filter((item) => item.id !== itemId);
      const updatedDayData = {
        ...prev[dateKey],
        [mealType]: updatedSlot,
      };

      const updated = {
        ...prev,
        [dateKey]: updatedDayData,
      };

      saveDailyLogsToStorage(updated);
      return updated;
    });
  };

  // Quick calorie logger for Navbar "+" button or Quest buttons
  const addCalories = (amount, mealType = 'snacks') => {
    const numericAmount = Math.round(Number(amount)) || 0;
    if (numericAmount <= 0) return;

    addFoodItem({
      name: `Quick Log (+${numericAmount} kcal)`,
      calories: numericAmount,
      protein_g: Math.round(numericAmount * 0.05),
      carbs_g: Math.round(numericAmount * 0.1),
      fats_g: Math.round(numericAmount * 0.03),
      mealType,
      dateKey: todayKey,
    });
  };

  // Reset today's food log and return calories to 0
  const resetCalories = () => {
    setDailyLogs((prev) => {
      const updated = {
        ...prev,
        [todayKey]: createEmptyDayMeals(),
      };
      saveDailyLogsToStorage(updated);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#fefce8] text-slate-900 flex flex-col font-sans selection:bg-[#fde047] selection:text-slate-900 pb-12">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        calories={calories}
        dailyGoal={DAILY_GOAL}
        onQuickAddCalories={addCalories}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* =====================================================================
              PERSISTENT MODULE WORKSPACE (ALL TABS MOUNTED SO STATE IS PRESERVED)
             ===================================================================== */}
          <div className="unified-tab-workspace">
            <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
              <OverviewTab 
                calories={calories}
                dailyGoal={DAILY_GOAL}
                onAddCalories={addCalories}
                onResetCalories={resetCalories}
                setActiveTab={setActiveTab}
              />
            </div>

            <div className={activeTab === 'track-meals' ? 'block' : 'hidden'}>
              <TrackMealsTab 
                calories={calories} 
                dailyGoal={DAILY_GOAL}
                todayMeals={todayMeals}
                onAddCalories={addCalories} 
                onResetCalories={resetCalories}
                onLogFoodItem={addFoodItem}
                onLogMultipleFoodItems={addMultipleFoodItems}
                setActiveTab={setActiveTab}
                onGoBack={handleGoBack}
              />
            </div>

            <div className={activeTab === 'freshness-check' ? 'block' : 'hidden'}>
              <FreshnessCheckTab 
                setActiveTab={setActiveTab} 
                onGoBack={handleGoBack} 
              />
            </div>

            <div className={activeTab === 'hygiene-monitor' ? 'block' : 'hidden'}>
              <HygieneMonitorTab 
                setActiveTab={setActiveTab} 
                onGoBack={handleGoBack} 
              />
            </div>

            <div className={activeTab === 'cooking-assistant' ? 'block' : 'hidden'}>
              <CookingAssistantTab 
                setActiveTab={setActiveTab} 
                onGoBack={handleGoBack} 
              />
            </div>

            <div className={activeTab === 'meal-planner' ? 'block' : 'hidden'}>
              <MealPlannerTab 
                calories={calories}
                dailyGoal={DAILY_GOAL}
                dailyLogs={dailyLogs}
                todayKey={todayKey}
                onAddFoodItem={addFoodItem}
                onRemoveFoodItem={removeFoodItem}
                onAddCalories={addCalories}
                onResetCalories={resetCalories}
                setActiveTab={setActiveTab} 
                onGoBack={handleGoBack}
              />
            </div>
          </div>

        </div>
      </main>

      {/* Clean Pastel Neo-Brutalist Footer */}
      <footer className="mt-auto border-t-2 border-slate-900 bg-white py-6 shadow-[0_-4px_0px_#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-600">
          <p className="font-black text-slate-900">FoodVerse AI — Multimodal Food Intelligence Platform 🥑</p>
          <p className="mt-1 font-bold text-slate-500">CV Preprocessor & PyTorch Vision · Groq LLaMA & Whisper Multimodal AI</p>
        </div>
      </footer>
    </div>
  );
}
