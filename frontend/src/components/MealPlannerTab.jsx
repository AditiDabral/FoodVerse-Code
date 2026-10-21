import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Activity, 
  Flame, 
  Heart, 
  ArrowRight, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Plus,
  Check,
  Clock,
  Trash2,
  X,
  Utensils,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { sampleMealPlanData } from '../utils/sampleData';
import {
  calculateTotalCalories,
  calculateTotalMacros,
  createEmptyDayMeals,
  getTodayKey,
} from '../utils/foodLogManager';

// Generate dynamic current week days (Sunday to Saturday) based on today's real date
const getCurrentWeekDays = () => {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate Sunday of the current week
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - currentDayOfWeek);

  const daysMeta = [
    { short: 'S', day: 'Sunday' },
    { short: 'M', day: 'Monday' },
    { short: 'T', day: 'Tuesday' },
    { short: 'W', day: 'Wednesday' },
    { short: 'T', day: 'Thursday' },
    { short: 'F', day: 'Friday' },
    { short: 'S', day: 'Saturday' },
  ];

  return daysMeta.map((meta, index) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + index);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayNum}`;

    return {
      short: meta.short,
      day: meta.day,
      date: d.getDate(),
      dateKey,
      isToday: d.toDateString() === now.toDateString(),
    };
  });
};

// Defensive helper to parse backend/FastAPI error responses into clean user-facing strings
const parseErrorMessage = (err) => {
  if (!err) return null;
  if (typeof err === 'string') return err;

  // Check for HTTP 429 or rate limit flag from axios interceptor
  if (err?.response?.status === 429 || err?.response?.data?.isRateLimited) {
    return (
      (typeof err?.response?.data?.detail === 'string' && err.response.data.detail) ||
      'Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.'
    );
  }

  const detail = err?.response?.data?.detail || err?.response?.data?.message;

  // If detail is already a clean string
  if (typeof detail === 'string') {
    return detail;
  }

  // If FastAPI/Pydantic validation error array: [{ loc: [...], msg: "..." }]
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        const field = Array.isArray(item?.loc)
          ? item.loc.filter((part) => part !== 'body').join(' ')
          : '';
        const msg = item?.msg || JSON.stringify(item);
        return field ? `${field}: ${msg}` : msg;
      })
      .join('. ');
  }

  // If detail is an object
  if (detail && typeof detail === 'object') {
    return detail.message || detail.error || JSON.stringify(detail);
  }

  return err?.message || 'Failed to calibrate meal plan. Please verify your inputs and try again.';
};

export default function MealPlannerTab({ 
  calories = 0,
  dailyGoal = 2000,
  dailyLogs = {},
  todayKey = getTodayKey(),
  onAddFoodItem,
  onRemoveFoodItem,
  onAddCalories,
  onResetCalories,
  setActiveTab,
  onGoBack,
}) {
  const [profile, setProfile] = useState({
    age: 28,
    gender: 'male',
    weight_kg: 78,
    height_cm: 178,
    activity_level: 'Moderately Active',
    goal: 'Weight Loss',
    daily_calorie_target: 2150,
    dietary_preference: 'Balanced',
    allergies: ['Peanuts'],
  });

  const [weekDays] = useState(() => getCurrentWeekDays());
  // Defaults to today's day of week (e.g. 1 for Monday)
  const [activeDayIndex, setActiveDayIndex] = useState(() => new Date().getDay());
  const [allergyInput, setAllergyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [planData, setPlanData] = useState(sampleMealPlanData);
  const [successMsg, setSuccessMsg] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Dynamic food logging inline form state
  const [activeAddMealSlot, setActiveAddMealSlot] = useState(null); // 'breakfast' | 'lunch' | 'dinner' | 'snacks' | null
  const [foodForm, setFoodForm] = useState({
    name: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fats_g: '',
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !profile.allergies.includes(allergyInput.trim())) {
      setProfile((prev) => ({ ...prev, allergies: [...prev.allergies, allergyInput.trim()] }));
      setAllergyInput('');
    }
  };

  const removeAllergy = (item) => {
    setProfile((prev) => ({ ...prev, allergies: prev.allergies.filter((a) => a !== item) }));
  };

  const handleGenerate = async () => {
    if (loading || cooldownSeconds > 0) return;
    setErrorMessage(null);

    const parsedAge = parseInt(profile.age, 10);
    const parsedWeight = parseFloat(profile.weight_kg);
    const parsedHeight = parseFloat(profile.height_cm);

    // Frontend Biometric Validation
    if (isNaN(parsedAge) || parsedAge < 12) {
      setErrorMessage('Biometric calibration is optimized for ages 12–100. Please enter an age of at least 12.');
      return;
    }
    if (parsedAge > 100) {
      setErrorMessage('Please enter an age between 12 and 100.');
      return;
    }
    if (isNaN(parsedWeight) || parsedWeight < 30) {
      setErrorMessage('Clinical TDEE calculation requires a minimum weight of 30 kg.');
      return;
    }
    if (parsedWeight > 250) {
      setErrorMessage('Please enter a weight of 250 kg or less.');
      return;
    }
    if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      setErrorMessage('Please enter a height between 100 cm and 250 cm.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.generateMealPlan({
        ...profile,
        age: parsedAge,
        weight_kg: parsedWeight,
        height_cm: parsedHeight,
        daily_calorie_target: profile.daily_calorie_target ? parseInt(profile.daily_calorie_target, 10) : undefined,
      });

      // Defensive check: ensure data is a valid plan object with expected properties
      if (data && typeof data === 'object' && (data.user_summary || data.daily_meal_plan)) {
        setPlanData(data);
      } else {
        setErrorMessage('Received unexpected meal plan format from server. Showing verified clinical meal plan.');
      }
    } catch (err) {
      const safeErrorMsg = parseErrorMessage(err);
      setErrorMessage(safeErrorMsg);
    } finally {
      setLoading(false);
      setCooldownSeconds(3);
    }
  };

  const loadDemo = () => {
    setPlanData(sampleMealPlanData);
    setProfile({
      age: 28,
      gender: 'male',
      weight_kg: 78,
      height_cm: 178,
      activity_level: 'Moderately Active',
      goal: 'Weight Loss',
      daily_calorie_target: 2150,
      dietary_preference: 'Balanced',
      allergies: ['Peanuts'],
    });
    setErrorMessage(null);
  };

  // Selected Day Calculations
  const selectedDay = weekDays[activeDayIndex] || weekDays[0];
  const selectedDateKey = selectedDay?.dateKey || todayKey;
  const selectedDayMeals = dailyLogs[selectedDateKey] || createEmptyDayMeals();
  const selectedDayCalories = calculateTotalCalories(selectedDayMeals);
  const selectedDayMacros = calculateTotalMacros(selectedDayMeals);

  // Trigger inline modal/input for a meal slot
  const handleOpenAddFood = (slot) => {
    if (activeAddMealSlot === slot) {
      setActiveAddMealSlot(null);
      setFormError(null);
    } else {
      setActiveAddMealSlot(slot);
      setFoodForm({ name: '', calories: '', protein_g: '', carbs_g: '', fats_g: '' });
      setFormError(null);
    }
  };

  // Save dynamically entered food item
  const handleSaveFoodItem = (slot) => {
    if (!foodForm.name.trim()) {
      setFormError('Please enter a food name.');
      return;
    }
    const calVal = Number(foodForm.calories);
    if (!foodForm.calories || isNaN(calVal) || calVal < 0) {
      setFormError('Please enter a valid calorie amount (e.g. 350).');
      return;
    }

    if (onAddFoodItem) {
      onAddFoodItem({
        name: foodForm.name.trim(),
        calories: calVal,
        protein_g: Number(foodForm.protein_g) || 0,
        carbs_g: Number(foodForm.carbs_g) || 0,
        fats_g: Number(foodForm.fats_g) || 0,
        mealType: slot,
        dateKey: selectedDateKey,
      });
    }

    setSuccessMsg(`Added "${foodForm.name.trim()}" (+${calVal} kcal) to ${slot}! 🥑`);
    setTimeout(() => setSuccessMsg(null), 3000);

    setActiveAddMealSlot(null);
    setFoodForm({ name: '', calories: '', protein_g: '', carbs_g: '', fats_g: '' });
    setFormError(null);
  };

  // 1-Click Adopt AI recommendation into user's live log
  const handleAdoptAIMeal = (dishName, cals, p = 0, c = 0, f = 0, slot = 'lunch') => {
    if (onAddFoodItem) {
      onAddFoodItem({
        name: dishName,
        calories: cals,
        protein_g: p,
        carbs_g: c,
        fats_g: f,
        mealType: slot,
        dateKey: selectedDateKey,
      });
    }
    setSuccessMsg(`Adopted "${dishName}" (+${cals} kcal) into ${slot}! 🥑`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Working Add Food handler that updates global calories & Milestones
  const handleAddMealFood = (mealName, cals) => {
    if (onAddCalories) {
      onAddCalories(cals);
    }
    setSuccessMsg(`Added ${mealName} (+${cals} kcal) to daily log! 🥑`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const us = planData?.user_summary || sampleMealPlanData.user_summary;
  const dmp = planData?.daily_meal_plan || sampleMealPlanData.daily_meal_plan;
  const ar = planData?.adaptive_recommendations || sampleMealPlanData.adaptive_recommendations;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Bar Navigation & Calendar Icon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof onGoBack === 'function') onGoBack();
              else if (typeof setActiveTab === 'function') setActiveTab('overview');
            }}
            title="Back to previous tab"
            aria-label="Back to previous tab"
            className="w-10 h-10 rounded-full bg-white shadow-[2px_2px_0px_#0f172a] border-2 border-slate-900 flex items-center justify-center text-slate-900 hover:bg-[#bbf7d0] hover:shadow-[0px_0px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all duration-200 ease-in-out cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Personalized Meal Plan
            </h1>
            <p className="text-xs text-slate-600 font-bold">Mifflin-St Jeor TDEE · Macro Calibration · 7-Day Schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div 
            title="Meal Planner & 7-Day Schedule"
            className="w-10 h-10 rounded-full bg-white shadow-[2px_2px_0px_#0f172a] border-2 border-slate-900 flex items-center justify-center text-slate-900 cursor-pointer transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a]"
          >
            <Calendar className="w-4 h-4 text-slate-900 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 text-slate-900 text-xs font-black flex items-center gap-2 shadow-[4px_4px_0px_#0f172a] animate-bounce">
          <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
          {successMsg}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Biometric Form & TDEE Metabolic Card */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Biometric Parameters</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">Gender</label>
                <select
                  value={profile.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={profile.weight_kg}
                  onChange={(e) => handleChange('weight_kg', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={profile.height_cm}
                  onChange={(e) => handleChange('height_cm', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">Fitness Goal</label>
              <select
                value={profile.goal}
                onChange={(e) => handleChange('goal', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
              >
                <option value="Weight Loss">Weight Loss (Deficit -500 kcal)</option>
                <option value="Muscle Gain">Muscle Gain (Surplus +350 kcal)</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Diabetic Friendly">Diabetic Friendly</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">Dietary Preference</label>
              <select
                value={profile.dietary_preference}
                onChange={(e) => handleChange('dietary_preference', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
              >
                <option value="Balanced">Balanced</option>
                <option value="Vegan">Vegan</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Keto">Keto</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Gluten-Free">Gluten-Free</option>
              </select>
            </div>

            {/* Allergies tags */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">Allergies / Exclusions</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  placeholder="e.g. Peanuts, Shellfish"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-3 py-1.5 rounded-xl bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(Array.isArray(profile?.allergies) ? profile.allergies : []).map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#fbcfe8] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    {a} <button type="button" onClick={() => removeAllergy(a)} className="font-black ml-0.5 hover:text-rose-700">×</button>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || cooldownSeconds > 0}
              className="w-full py-3 px-5 rounded-2xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Computing Metabolic Targets...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Please wait {cooldownSeconds}s (Cooldown)...</span>
                </>
              ) : (
                <>
                  <span>Calibrate Adaptive Meal Plan</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Neo-Brutalist In-UI Error Display */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#fca5a5] border-2 border-slate-900 text-slate-900 text-xs font-black shadow-[3px_3px_0px_#0f172a] flex items-start justify-between gap-2 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-900 flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="p-1 rounded-lg hover:bg-white/40 text-slate-900 transition-all flex-shrink-0 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            )}
          </div>

          {/* Metabolic Summary Card */}
          {us && (
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-900 font-black">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-slate-900 fill-amber-400 stroke-[2.5]" />
                  <span>Mifflin-St Jeor Energy Target</span>
                </span>
                <span className="text-[10px] text-slate-900 bg-[#bbf7d0] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-full font-black">
                  Clinical TDEE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">BMR</p>
                  <p className="text-xs font-black text-slate-900">{us?.bmr_kcal ?? 0} kcal</p>
                </div>
                <div className="p-2 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">TDEE</p>
                  <p className="text-xs font-black text-slate-900">{us?.tdee_kcal ?? 0} kcal</p>
                </div>
                <div className="p-2 rounded-xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer">
                  <p className="text-[9px] text-slate-900 font-bold uppercase">Target</p>
                  <p className="text-xs font-black text-slate-900">{us?.target_calories ?? 0} kcal</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#fafcfb] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex justify-between font-black text-xs text-slate-900">
                <span className="text-emerald-800">{us?.target_macros?.protein_g ?? 0}g Protein</span>
                <span className="text-amber-800">{us?.target_macros?.carbs_g ?? 0}g Carbs</span>
                <span className="text-rose-700">{us?.target_macros?.fats_g ?? 0}g Fats</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Day Picker + Dynamic Meal Breakdown Cards with Inline Food Logging */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Pastel Neo-Brutalist Hero Card */}
          <div className="rounded-3xl p-6 sm:p-7 bg-[#fde047] border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] text-slate-900 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-3 z-10">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">Feeling Better</h3>
                <p className="text-xs text-slate-800 font-bold">Keep your healthy life with nutritious food</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] rounded-2xl px-4 py-2.5">
                  <div className="text-lg font-black text-slate-900">{selectedDayMacros?.protein_g || 0}g</div>
                  <div className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Protein ({selectedDayMacros?.protein_g || 0} / {us?.target_macros?.protein_g || 188}g)
                  </div>
                </div>
                <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] rounded-2xl px-4 py-2.5">
                  <div className="text-lg font-black text-slate-900">{selectedDayCalories || 0}</div>
                  <div className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Calories ({selectedDayCalories || 0} / {us?.target_calories || 2150} kcal)
                  </div>
                </div>
              </div>
            </div>

            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] p-1.5 flex items-center justify-center flex-shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80" 
                alt="Healthy Meal" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          {/* Weekly Day Picker */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  {selectedDay?.day || 'Schedule'}
                </span>
                {selectedDay?.isToday && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    Today
                  </span>
                )}
              </div>
              <span className="text-xs font-black text-slate-600">
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
              {weekDays.map((w, idx) => {
                const isActive = activeDayIndex === idx;
                const dayLog = dailyLogs[w.dateKey];
                const dayTotal = dayLog ? calculateTotalCalories(dayLog) : 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveDayIndex(idx)}
                    className={`flex flex-col items-center justify-center py-2 sm:py-3 rounded-2xl border-2 border-slate-900 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#fde047] text-slate-900 shadow-[3px_3px_0px_#0f172a] scale-105 font-black'
                        : 'bg-white hover:bg-slate-100 text-slate-800 shadow-[2px_2px_0px_#0f172a]'
                    }`}
                  >
                    <span className={`text-[11px] font-black ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {w.short}
                    </span>
                    <span className="text-sm sm:text-base font-black mt-0.5 flex items-center justify-center gap-0.5">
                      <span>{w.date}</span>
                      {w.isToday && !isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 inline-block mb-1" />
                      )}
                    </span>
                    {dayTotal > 0 && !isActive && (
                      <span className="text-[9px] font-black text-emerald-800 mt-0.5">
                        {dayTotal} kcal
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Meal Breakdown Cards with Inline Food Logging */}
          <div className="space-y-4">
            
            {/* Meal Slot Array for Clean Dynamic Rendering */}
            {[
              {
                id: 'breakfast',
                title: 'Breakfast',
                icon: '🥣',
                bgIcon: 'bg-[#fef08a]',
                targetKcal: 450,
                aiSuggest: dmp?.breakfast,
              },
              {
                id: 'lunch',
                title: 'Lunch',
                icon: '🥗',
                bgIcon: 'bg-[#bbf7d0]',
                targetKcal: 650,
                aiSuggest: dmp?.lunch,
              },
              {
                id: 'dinner',
                title: 'Dinner',
                icon: '🍲',
                bgIcon: 'bg-[#bae6fd]',
                targetKcal: 600,
                aiSuggest: dmp?.dinner,
              },
              {
                id: 'snacks',
                title: 'Healthy Snacks & Satiety',
                icon: '🥑',
                bgIcon: 'bg-[#fbcfe8]',
                targetKcal: 450,
                aiSuggest: Array.isArray(dmp?.snacks) ? dmp.snacks[0] : dmp?.snacks,
              },
            ].map((section) => {
              const slotItems = Array.isArray(selectedDayMeals?.[section.id]) ? selectedDayMeals[section.id] : [];
              const slotCalories = slotItems.reduce((acc, curr) => acc + (Number(curr?.calories) || 0), 0);
              const isAddFormOpen = activeAddMealSlot === section.id;

              return (
                <div key={section.id} className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3">
                  
                  {/* Meal Slot Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-lg ${section.bgIcon}`}>
                        {section.icon}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{section.title}</h4>
                        <p className="text-xs text-slate-600 font-bold">
                          {slotCalories} kcal logged · Target {section.targetKcal} kcal
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenAddFood(section.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer ${
                        isAddFormOpen 
                          ? 'bg-slate-200 text-slate-900' 
                          : 'bg-[#86efac] hover:bg-[#4ade80] text-slate-900'
                      }`}
                    >
                      {isAddFormOpen ? (
                        <>
                          <X className="w-3.5 h-3.5 stroke-[2.5]" /> Cancel
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Food
                        </>
                      )}
                    </button>
                  </div>

                  {/* Inline Manual Food Entry Form */}
                  {isAddFormOpen && (
                    <div className="p-4 rounded-2xl bg-[#fefce8] border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-slate-900 stroke-[2.5]" />
                          Log Food Item to {section.title}
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold">
                          Date: {selectedDay?.day} ({selectedDateKey})
                        </span>
                      </div>

                      {formError && (
                        <div className="p-2 rounded-xl bg-[#fca5a5] border-2 border-slate-900 text-slate-900 text-xs font-black">
                          {formError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Food name (e.g., Avocado Toast with Poached Egg)"
                          value={foodForm.name}
                          onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-white font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                          autoFocus
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-700 mb-0.5">Calories (kcal) *</label>
                            <input
                              type="number"
                              placeholder="e.g. 320"
                              value={foodForm.calories}
                              onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-white font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-700 mb-0.5">Protein (g)</label>
                            <input
                              type="number"
                              placeholder="e.g. 18"
                              value={foodForm.protein_g}
                              onChange={(e) => setFoodForm({ ...foodForm, protein_g: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-white font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-700 mb-0.5">Carbs (g)</label>
                            <input
                              type="number"
                              placeholder="e.g. 25"
                              value={foodForm.carbs_g}
                              onChange={(e) => setFoodForm({ ...foodForm, carbs_g: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-white font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-700 mb-0.5">Fats (g)</label>
                            <input
                              type="number"
                              placeholder="e.g. 10"
                              value={foodForm.fats_g}
                              onChange={(e) => setFoodForm({ ...foodForm, fats_g: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-white font-black text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveFoodItem(section.id)}
                            className="px-4 py-2 rounded-xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                          >
                            Save & Log Food
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAddMealSlot(null);
                              setFormError(null);
                            }}
                            className="px-3 py-2 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-xs font-black shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] hover:bg-slate-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamically Logged Items for this Meal */}
                  {slotItems.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {slotItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-3 rounded-2xl bg-[#fafcfb] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between group transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0px_#0f172a]"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-900">{item.name}</p>
                              {item.timestamp && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  · {item.timestamp}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-700">
                              <span className="text-emerald-800">{item.protein_g || 0}g Protein</span>
                              <span>•</span>
                              <span className="text-amber-800">{item.carbs_g || 0}g Carbs</span>
                              <span>•</span>
                              <span className="text-rose-700">{item.fats_g || 0}g Fats</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                              {item.calories} kcal
                            </span>
                            {onRemoveFoodItem && (
                              <button
                                onClick={() => onRemoveFoodItem(item.id, section.id, selectedDateKey)}
                                title="Remove item"
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-700 hover:text-rose-600 hover:bg-rose-100 border border-transparent hover:border-slate-900 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Clean Empty State */
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-900 text-center space-y-1 bg-slate-50">
                      <p className="text-xs font-black text-slate-700">
                        No foods logged for {section.title} yet
                      </p>
                      <p className="text-[11px] text-slate-500 font-bold">
                        Click <span className="font-black text-slate-900">+ Add Food</span> above or scan a plate in the Nutrition tab.
                      </p>
                    </div>
                  )}

                  {/* AI Clinical Recommendation */}
                  {section.aiSuggest && (
                    <div className="pt-2 border-t-2 border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="text-[11px] text-slate-600 font-bold">
                        <span className="font-black text-slate-900">✨ AI Suggestion: </span>
                        <span className="font-bold text-slate-800">{section.aiSuggest?.dish_name || 'Recommended Balanced Dish'}</span>
                        <span className="text-slate-500 font-bold"> ({section.aiSuggest?.calories || section.targetKcal} kcal)</span>
                      </div>
                      <button
                        onClick={() => handleAdoptAIMeal(
                          section.aiSuggest?.dish_name || 'Recommended Balanced Dish',
                          section.aiSuggest?.calories || section.targetKcal,
                          section.aiSuggest?.protein_g || 0,
                          section.aiSuggest?.carbs_g || 0,
                          section.aiSuggest?.fats_g || 0,
                          section.id
                        )}
                        className="px-2.5 py-1 rounded-xl bg-[#fde047] hover:bg-[#facc15] text-slate-900 text-[10px] font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                      >
                        + Adopt AI Meal
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

          </div>

          {/* Adaptive Insights & Hydration Banner */}
          {ar && (
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                  <span>Adaptive Dietary Insights</span>
                </h5>
                <span className="text-[10px] font-black text-slate-900 bg-[#bae6fd] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-full">
                  💧 Hydration: {ar?.hydration_target_liters || 2.8} L/day
                </span>
              </div>
              <p className="text-xs text-slate-700 font-bold leading-relaxed">
                {Array.isArray(ar?.dietary_insights)
                  ? (ar.dietary_insights[0] || 'Keep protein intake distributed evenly to maintain lean muscle mass.')
                  : (typeof ar?.dietary_insights === 'string' ? ar.dietary_insights : 'Keep protein intake distributed evenly to maintain lean muscle mass.')}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}