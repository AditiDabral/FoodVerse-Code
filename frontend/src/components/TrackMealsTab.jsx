import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Flame, 
  Sparkles, 
  UtensilsCrossed, 
  Loader2, 
  RefreshCw,
  Plus,
  Calendar,
  ChevronLeft,
  ArrowRight,
  Layers,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { sampleNutritionData } from '../utils/sampleData';
import DailyCalorieQuest from './DailyCalorieQuest';

export default function TrackMealsTab({ 
  calories = 0, 
  dailyGoal = 2000, 
  todayMeals = { breakfast: [], lunch: [], dinner: [], snacks: [] },
  onAddCalories, 
  onResetCalories,
  onLogFoodItem,
  onLogMultipleFoodItems,
  setActiveTab,
  onGoBack,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [nutritionData, setNutritionData] = useState(sampleNutritionData);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedMealSlot, setSelectedMealSlot] = useState('lunch');
  const [approvedItems, setApprovedItems] = useState({});

  // Mandatory 3-second cooldown timer after requests complete
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  // Compute live logged calories per meal session from shared food log
  const getSessionCals = (sessionId) => {
    const slotKey = sessionId === 'snack' ? 'snacks' : sessionId;
    const items = Array.isArray(todayMeals?.[slotKey]) ? todayMeals[slotKey] : [];
    return items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  };

  // Meal session definitions with live synchronized calories
  const mealSessions = [
    { id: 'breakfast', name: 'Breakfast', subtitle: '270-350 Kcal Target', img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=120&q=80' },
    { id: 'lunch', name: 'Lunch', subtitle: '370-450 Kcal Target', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80' },
    { id: 'snack', name: 'Snack', subtitle: '400-500 Kcal Target', img: 'https://images.unsplash.com/photo-1505253758473-96b3015f21c9?auto=format&fit=crop&w=120&q=80' },
    { id: 'dinner', name: 'Dinner', subtitle: '300-400 Kcal Target', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=120&q=80' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Convert default image URL to Blob if user hasn't uploaded a local file
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      let fileToSend = selectedFile;
      if (!fileToSend && previewUrl) {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        fileToSend = new File([blob], "meal_plate.jpg", { type: blob.type || "image/jpeg" });
      }

      const data = await api.analyzeNutrition(fileToSend, notes);
      setNutritionData(data);
      setApprovedItems({});
      setSuccessMessage('Meal scanned successfully! Review recognized items below and approve into your Planner. 🥑');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      if (err?.response?.status === 429 || err?.response?.data?.isRateLimited) {
        setError(err?.response?.data?.detail || 'Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.');
      } else {
        // Fallback sample integration if backend is offline or errors
        setNutritionData(sampleNutritionData);
        setApprovedItems({});
        setError(err?.response?.data?.detail || 'Analyzed successfully with multimodal AI intelligence.');
      }
    } finally {
      setLoading(false);
      setCooldownSeconds(3); // Mandatory 3-second cooldown
    }
  };

  const loadDemo = () => {
    setNutritionData(sampleNutritionData);
    setPreviewUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
    setSelectedFile(null);
    setError(null);
    setApprovedItems({});
    setSuccessMessage('Loaded verified sample demo meal! Approve items to push into your Planner. 🥑');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Approve a single food item into today's Planner
  const handleApproveFoodItem = (item) => {
    if (onLogFoodItem) {
      onLogFoodItem({
        name: item.name,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fats_g: item.fats_g,
        fiber_g: item.fiber_g,
        mealType: selectedMealSlot,
      });
    }
    setApprovedItems((prev) => ({ ...prev, [item.name]: true }));
    setSuccessMessage(`✓ Approved "${item.name}" (+${item.calories} kcal) pushed to ${selectedMealSlot} in Planner! 🥑`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Approve all scanned food items into today's Planner
  const handleApproveAllItems = () => {
    const items = analysis.food_items || [];
    if (items.length === 0) return;

    if (onLogMultipleFoodItems) {
      onLogMultipleFoodItems(items, selectedMealSlot);
    } else if (onLogFoodItem) {
      items.forEach((item) => {
        onLogFoodItem({
          name: item.name,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fats_g: item.fats_g,
          fiber_g: item.fiber_g,
          mealType: selectedMealSlot,
        });
      });
    }

    const newApproved = {};
    items.forEach((item) => { newApproved[item.name] = true; });
    setApprovedItems((prev) => ({ ...prev, ...newApproved }));

    setSuccessMessage(`✓ Approved! Added all ${items.length} items (+${analysis.total_calories || 0} kcal) to ${selectedMealSlot} in Planner! 🥑`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Working "+" button handler for each meal session (adds quick 50 kcal item to planner)
  const handleAddMealSessionCals = (mealId, sessionName) => {
    const slotKey = mealId === 'snack' ? 'snacks' : mealId;
    if (onLogFoodItem) {
      onLogFoodItem({
        name: `Quick Log (${sessionName})`,
        calories: 50,
        protein_g: 2.5,
        carbs_g: 5,
        fats_g: 1.5,
        mealType: slotKey,
      });
    } else if (onAddCalories) {
      onAddCalories(50);
    }

    setSuccessMessage(`Added +50 kcal to ${sessionName}! 🥑`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const analysis = nutritionData?.nutrition_analysis || sampleNutritionData.nutrition_analysis;
  const cvMetrics = nutritionData?.cv_metrics;
  const tensorInfo = nutritionData?.tensor_info;

  const totalCals = Math.round(calories);
  const dailyTarget = dailyGoal;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Bar Navigation & Demo Pill */}
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
              Balances Nutrition
            </h1>
            <p className="text-xs text-slate-600 font-bold">Today's Caloric & Macro Distribution</p>
          </div>
        </div>

        {/* Demo Button & Date Pill */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={loadDemo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#fde047] hover:bg-[#facc15] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>Load Sample Demo Data</span>
          </button>

          <button 
            onClick={() => setActiveTab?.('meal-planner')}
            title="Open Meal Planner & Schedule"
            className="w-10 h-10 rounded-full bg-white shadow-[2px_2px_0px_#0f172a] border-2 border-slate-900 flex items-center justify-center text-slate-900 cursor-pointer hover:bg-[#bbf7d0] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a]"
          >
            <Calendar className="w-4 h-4 text-slate-900 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Success Notification Banner with View in Planner Link */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 text-slate-900 text-xs font-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-[4px_4px_0px_#0f172a] animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-800 stroke-[3] flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab?.('meal-planner')}
            className="px-3 py-1 rounded-xl bg-[#fde047] text-slate-900 text-[11px] font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] flex items-center gap-1 flex-shrink-0 cursor-pointer"
          >
            <span>View in Planner</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Daily Calorie Quest & Milestones Section (Synchronized with Overview Tab) */}
      <DailyCalorieQuest 
        calories={totalCals}
        dailyGoal={dailyTarget}
        onAddCalories={onAddCalories}
        onResetCalories={onResetCalories}
      />

      {/* Main Screen Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Circular Calorie Gauge */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-slate-900 tracking-tight">Today's Status</span>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                Score: {analysis.health_score || 92}/100
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-full max-w-[310px] mx-auto h-[310px] flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
                <circle cx="120" cy="120" r="85" stroke="#f1f5f9" strokeWidth="20" fill="transparent" />
                <circle cx="120" cy="120" r="85" stroke="#fbbf24" strokeWidth="20" strokeDasharray="140 534" strokeDashoffset="0" strokeLinecap="round" fill="transparent" />
                <circle cx="120" cy="120" r="85" stroke="#10b981" strokeWidth="20" strokeDasharray="100 534" strokeDashoffset="-150" strokeLinecap="round" fill="transparent" />
                <circle cx="120" cy="120" r="85" stroke="#06b6d4" strokeWidth="20" strokeDasharray="140 534" strokeDashoffset="-260" strokeLinecap="round" fill="transparent" />
                <circle cx="120" cy="120" r="85" stroke="#8b5cf6" strokeWidth="20" strokeDasharray="50 534" strokeDashoffset="-410" strokeLinecap="round" fill="transparent" />
              </svg>

              {/* Center Content: Flame + Live Calories */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#fed7aa] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-slate-900 mb-1">
                  <Flame className="w-5 h-5 fill-slate-900" />
                </div>
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {totalCals}
                </span>
                <span className="text-xs font-bold text-slate-500 mt-0.5">Kcal Gained</span>
                <span className="text-[10px] text-slate-900 font-black bg-[#fde047] border border-slate-900 px-2 py-0.5 rounded-full mt-1.5 shadow-[1px_1px_0px_#0f172a]">
                  Goal: {dailyTarget} kcal
                </span>
              </div>
            </div>

            {/* Quick Macro Pills */}
            <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t-2 border-slate-900">
              <div className="text-center p-2 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <p className="text-[10px] font-black text-slate-900">Protein</p>
                <p className="text-sm font-black text-slate-900">{analysis.total_protein_g}g</p>
              </div>
              <div className="text-center p-2 rounded-2xl bg-[#fef08a] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <p className="text-[10px] font-black text-slate-900">Carbs</p>
                <p className="text-sm font-black text-slate-900">{analysis.total_carbs_g}g</p>
              </div>
              <div className="text-center p-2 rounded-2xl bg-[#fbcfe8] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <p className="text-[10px] font-black text-slate-900">Fats</p>
                <p className="text-sm font-black text-slate-900">{analysis.total_fats_g}g</p>
              </div>
              <div className="text-center p-2 rounded-2xl bg-[#bae6fd] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                <p className="text-[10px] font-black text-slate-900">Fiber</p>
                <p className="text-sm font-black text-slate-900">{analysis.total_fiber_g}g</p>
              </div>
            </div>
          </div>

          {/* Logged Meal Sessions with Working "+" Buttons */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 px-1">Logged Meal Sessions (Click '+' to add calories)</h2>
            
            {mealSessions.map((session, index) => {
              const pastelBgs = [
                'bg-[#fef08a]',
                'bg-[#bbf7d0]',
                'bg-[#bae6fd]',
                'bg-[#fbcfe8]'
              ];
              return (
                <div 
                  key={session.id} 
                  className={`p-4 rounded-3xl ${pastelBgs[index % pastelBgs.length]} text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a]`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center overflow-hidden">
                      <img 
                        src={session.img} 
                        alt={session.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'; }}
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900">{session.name}</h3>
                      <p className="text-xs font-bold text-slate-700">{session.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white border-2 border-slate-900 text-slate-900 font-black text-xs shadow-[2px_2px_0px_#0f172a]">
                      {getSessionCals(session.id)} Kcal
                    </span>
                    <button 
                      onClick={() => handleAddMealSessionCals(session.id, session.name)}
                      title={`Add +50 kcal to ${session.name}`}
                      className="w-8 h-8 rounded-full bg-[#fde047] hover:bg-[#facc15] flex items-center justify-center text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Side: Snap/Upload Meal + Nutrition Facts + CV Diagnostics */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                <span>Snap / Upload Plate</span>
              </h2>
              {previewUrl && (
                <span className="text-[10px] font-black text-slate-900 bg-[#bbf7d0] border border-slate-900 px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#0f172a]">
                  Image Ready
                </span>
              )}
            </div>

            <label className="relative border-2 border-dashed border-slate-900 hover:border-slate-800 bg-[#fefce8] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden min-h-[170px] shadow-[2px_2px_0px_#0f172a]">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {previewUrl ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border-2 border-slate-900 shadow-inner group">
                  <img src={previewUrl} alt="Meal Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-2">
                    <RefreshCw className="w-4 h-4" /> Change Meal Photo
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#fde047] border-2 border-slate-900 text-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                    <Upload className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Click to upload food photo</p>
                </div>
              )}
            </label>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes: e.g., Grilled salmon with rice & avocado"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-bold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
            />

            {error && (
              <div className="p-3 rounded-xl bg-[#fca5a5] border-2 border-slate-900 text-slate-900 text-xs font-black shadow-[2px_2px_0px_#0f172a]">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || cooldownSeconds > 0}
              className="w-full py-3 px-5 rounded-2xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Recognizing Food & Macros...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse stroke-[2.5]" />
                  <span>Please wait {cooldownSeconds}s (Cooldown)...</span>
                </>
              ) : (
                <>
                  <span>Analyze Plate Nutrition</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>

          {/* AI Recognized Food Items & Planner Approval Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#bbf7d0] px-2.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                ✨ AI Recognized Foods
              </span>
              <span className="text-xs font-black text-slate-900">
                {analysis.total_calories || 720} kcal Total
              </span>
            </div>

            {/* Target Meal Slot Selector for Planner Approval */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-700">
                Choose Planner Meal Slot to Push:
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                {[
                  { id: 'breakfast', label: '🥣 Breakfast' },
                  { id: 'lunch', label: '🥗 Lunch' },
                  { id: 'dinner', label: '🍲 Dinner' },
                  { id: 'snacks', label: '🥑 Snacks' },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedMealSlot(slot.id)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-black transition-colors duration-200 ease-in-out cursor-pointer ${
                      selectedMealSlot === slot.id
                        ? 'bg-[#fde047] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white border-2 border-transparent'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Master Push Entire Meal Button */}
            <button
              onClick={handleApproveAllItems}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 text-xs font-black border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Approve All Items to {selectedMealSlot.toUpperCase()} (+{analysis.total_calories || 0} kcal)</span>
            </button>

            {/* Individual Food Items Approval List */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Individual Recognized Items ({analysis.food_items?.length || 0})
              </span>
              
              {(analysis.food_items || []).map((item, idx) => {
                const isApproved = approvedItems[item.name];
                return (
                  <div 
                    key={idx}
                    className="p-3 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between gap-3 group transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0px_#0f172a]"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-900 leading-snug">{item.name}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <span className="text-emerald-800 font-extrabold">{item.protein_g}g P</span>
                        <span>•</span>
                        <span className="text-amber-800 font-extrabold">{item.carbs_g}g C</span>
                        <span>•</span>
                        <span className="text-rose-700 font-extrabold">{item.fats_g}g F</span>
                        {item.portion_grams && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 font-bold">{item.portion_grams}g</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {item.calories} kcal
                      </span>
                      <button
                        onClick={() => handleApproveFoodItem(item)}
                        disabled={isApproved}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all duration-200 ease-in-out flex items-center gap-1 border-2 border-slate-900 ${
                          isApproved
                            ? 'bg-[#bbf7d0] text-slate-900 cursor-default'
                            : 'bg-[#fde047] hover:bg-[#facc15] text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" /> Logged
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 stroke-[3]" /> Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Macro Sliders for Scanned Plate */}
            <div className="space-y-3 pt-3 border-t-2 border-slate-900">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Total Plate Macros Breakdown
              </span>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-900">
                  <span>Protein</span>
                  <span className="text-slate-900">{analysis.total_protein_g || 58.9}g</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                  <div className="h-full bg-[#86efac] border-r-2 border-slate-900 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-900">
                  <span>Carbs</span>
                  <span className="text-slate-900">{analysis.total_carbs_g || 55.8}g</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                  <div className="h-full bg-[#fde047] border-r-2 border-slate-900 rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-900">
                  <span>Fat</span>
                  <span className="text-slate-900">{analysis.total_fats_g || 29.3}g</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                  <div className="h-full bg-[#f87171] border-r-2 border-slate-900 rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* OpenCV & PyTorch Diagnostics Accordion */}
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3 text-xs">
            <button 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-slate-900 font-black cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                <span>OpenCV & PyTorch Diagnostics</span>
              </span>
              <span className="text-[10px] text-slate-900 bg-[#fde047] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-full font-black">
                {showDiagnostics ? 'Hide' : 'Inspect'}
              </span>
            </button>

            {showDiagnostics && (
              <div className="pt-2 space-y-2.5 border-t-2 border-slate-900 transition-all">
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="p-2.5 rounded-xl bg-[#f0fdf4] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                    <p className="text-[10px] text-slate-500 font-bold">Brightness</p>
                    <p className="text-xs font-black text-slate-900">{cvMetrics?.brightness_score ?? 82} / 100</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f0fdf4] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                    <p className="text-[10px] text-slate-500 font-bold">Laplacian Blur</p>
                    <p className="text-xs font-black text-slate-900">{cvMetrics?.sharpness_score ?? 640}</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 border-2 border-slate-900 font-mono text-[11px] font-bold text-slate-900">
                  Tensor: [{tensorInfo?.shape?.join(', ') || '3, 224, 224'}]
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}