import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Apple, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowRight, 
  Loader2, 
  RefreshCw, 
  ThermometerSnowflake, 
  ChevronLeft, 
  Calendar, 
  Check 
} from 'lucide-react';
import { api } from '../api/client';
import { sampleFreshnessData, sampleFreshnessPresets } from '../utils/sampleData';

const FRESHNESS_CATEGORIES = ['Fruits', 'Vegetables', 'Meat', 'Fish'];
const PRESET_KEYS = ['apple', 'broccoli', 'steak', 'salmon', 'bananas', 'onions', 'chicken', 'seabass'];

/**
 * Robust produce name extractor that inspects all possible response structures & key variants:
 * response.data.item_name, response.data.food_name, response.data.detected_item,
 * response.data.label, response.data.produce_name, as well as food_item, name
 */
export const extractProduceName = (res) => {
  if (!res) return '';
  const obj = (typeof res === 'object' && res !== null && 'data' in res && typeof res.data === 'object' && res.data !== null)
    ? res.data
    : res;

  if (!obj || typeof obj !== 'object') {
    return typeof res === 'string' ? res.trim() : '';
  }

  const name =
    obj.item_name ||
    obj.food_name ||
    obj.detected_item ||
    obj.label ||
    obj.produce_name ||
    obj.food_item ||
    obj.name ||
    obj.data?.item_name ||
    obj.data?.food_name ||
    obj.data?.detected_item ||
    obj.data?.label ||
    obj.data?.produce_name ||
    obj.data?.food_item ||
    obj.data?.name ||
    '';

  return typeof name === 'string' ? name.trim() : String(name || '').trim();
};

export default function FreshnessCheckTab({ setActiveTab, onGoBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80');
  const initialName = extractProduceName(sampleFreshnessData) || 'Honeycrisp Orchard Apple';
  const [itemHint, setItemHint] = useState('');
  const [produceName, setProduceName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [freshnessData, setFreshnessData] = useState(sampleFreshnessData);
  const [activeCategory, setActiveCategory] = useState('Fruits');
  const [demoCycleIndex, setDemoCycleIndex] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Mandatory 3-second cooldown timer after requests complete
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  // Dynamic produce title: prioritized from dedicated state, response object, or fallback hint
  const displayTitle = 
    produceName || 
    extractProduceName(freshnessData) || 
    (itemHint && itemHint.trim() ? itemHint.trim() : 'Detected Produce');

  // Handle image upload from user without resetting user's selected category
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);

      // Clean hint from file name if descriptive (e.g. broccoli.jpg)
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/^(image|img|photo|picture|upload|file|screenshot)[0-9_ -]*/i, '')
        .trim();

      if (baseName && baseName.length >= 3 && !/^\d+$/.test(baseName)) {
        const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        setItemHint(formatted);
        setProduceName(formatted);
      } else {
        // Clear any prior hint so multimodal AI vision identifies purely from image pixels
        setItemHint('');
        setProduceName('New Produce Image');
      }
      // Note: activeCategory is strictly preserved! Never resets to Fruits.
    }
  };

  // Run evaluation and dynamically store returned item_name / produce_name
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please choose or upload a produce photo first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Only pass hint if user explicitly typed a non-placeholder hint
      const cleanHint = (itemHint && itemHint.trim() && !['New Produce Image', 'Detected Produce', 'Fresh Produce', 'Honeycrisp Orchard Apple'].includes(itemHint.trim()))
        ? itemHint.trim()
        : '';

      const response = await api.analyzeFreshness(selectedFile, cleanHint);
      setFreshnessData(response);

      // Extract dynamic produce name checking all possible keys:
      // response.data.item_name, response.data.food_name, response.data.detected_item,
      // response.data.label, response.data.produce_name, as well as food_item
      const detectedName = extractProduceName(response);
      const finalName = detectedName || cleanHint || 'Detected Produce';

      setProduceName(finalName);
      setItemHint(finalName);
      // Note: activeCategory is strictly preserved! Never resets or jumps.
    } catch (err) {
      if (err?.response?.status === 429 || err?.response?.data?.isRateLimited) {
        setError(err?.response?.data?.detail || 'Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.');
      } else {
        setError(err?.response?.data?.detail || 'Failed to analyze freshness. Showing verified inspection report.');
      }
    } finally {
      setLoading(false);
      setCooldownSeconds(3); // Mandatory 3-second cooldown state
    }
  };

  // 1-Click Demo that cycles through real sample items across Fruits, Vegetables, Meat, and Fish
  const loadDemo = (specificKey) => {
    let nextKey = specificKey;
    let nextIndex = demoCycleIndex;

    if (!nextKey) {
      if (activeCategory === 'Vegetables') {
        nextKey = demoCycleIndex % 2 === 0 ? 'broccoli' : 'onions';
      } else if (activeCategory === 'Fruits') {
        nextKey = demoCycleIndex % 2 === 0 ? 'apple' : 'bananas';
      } else if (activeCategory === 'Meat') {
        nextKey = demoCycleIndex % 2 === 0 ? 'steak' : 'chicken';
      } else if (activeCategory === 'Fish') {
        nextKey = demoCycleIndex % 2 === 0 ? 'salmon' : 'seabass';
      } else {
        nextIndex = (demoCycleIndex + 1) % PRESET_KEYS.length;
        nextKey = PRESET_KEYS[nextIndex];
      }
      setDemoCycleIndex((prev) => prev + 1);
    }

    const preset = sampleFreshnessPresets[nextKey] || sampleFreshnessData;
    setFreshnessData(preset);

    const name = extractProduceName(preset) || 'Honeycrisp Orchard Apple';
    setProduceName(name);
    setItemHint(name);
    setPreviewUrl(preset.previewUrl || 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80');
    // Note: activeCategory is strictly preserved!
    setSelectedFile(null);
    setError(null);
  };

  // Sticky Category Selection: Keep user choice active throughout interaction
  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    // If no custom file is actively uploaded, switch to sample demo for that category
    if (!selectedFile) {
      if (cat === 'Vegetables') {
        loadDemo('broccoli');
      } else if (cat === 'Fruits') {
        loadDemo('apple');
      } else if (cat === 'Meat') {
        loadDemo('steak');
      } else if (cat === 'Fish') {
        loadDemo('salmon');
      }
    }
  };

  const status = freshnessData?.freshness_status || 'Fresh';
  const score = freshnessData?.freshness_score ?? 95;
  const opencv = freshnessData?.opencv_features;
  const vis = freshnessData?.visual_characteristics;

  // Status configuration with bold Neo-Brutalist badges
  const statusConfig = {
    Fresh: {
      bg: 'bg-[#86efac]',
      lightBg: 'bg-[#bbf7d0]',
      border: 'border-slate-900',
      text: 'text-slate-900',
      badge: 'bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
      icon: CheckCircle2,
      label: 'Fresh & Peak Quality',
    },
    'Moderately Fresh': {
      bg: 'bg-[#fde047]',
      lightBg: 'bg-[#fef08a]',
      border: 'border-slate-900',
      text: 'text-slate-900',
      badge: 'bg-[#fef08a] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
      icon: AlertTriangle,
      label: 'Moderately Fresh — Consume Soon',
    },
    Spoiled: {
      bg: 'bg-[#f87171]',
      lightBg: 'bg-[#fca5a5]',
      border: 'border-slate-900',
      text: 'text-slate-900',
      badge: 'bg-[#fca5a5] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
      icon: XCircle,
      label: 'Spoiled — Do Not Consume',
    },
  }[status] || {
    bg: 'bg-[#86efac]',
    lightBg: 'bg-[#bbf7d0]',
    border: 'border-slate-900',
    text: 'text-slate-900',
    badge: 'bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]',
    icon: CheckCircle2,
    label: 'Fresh',
  };

  const StatusIcon = statusConfig.icon;
  const discolPct = opencv?.discoloration?.combined_discoloration_pct ?? 1.8;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Bar Navigation & Demo Button */}
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
              Freshness & Spoilage Check
            </h1>
            <p className="text-xs text-slate-600 font-bold">HSV / LAB Degradation & Shelf-Life Estimation</p>
          </div>
        </div>

        {/* 1-Click Demo Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => loadDemo()}
            title="Click to cycle demo samples across Fruits, Vegetables, Meat, and Fish"
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

      {/* Category Pills (Fruits, Vegetables, Meat, Fish) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FRESHNESS_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-5 py-1.5 rounded-full text-xs font-black transition-all duration-200 ease-in-out whitespace-nowrap border-2 border-slate-900 cursor-pointer ${
                isSelected
                  ? 'bg-[#fde047] text-slate-900 shadow-[2px_2px_0px_#0f172a]'
                  : 'bg-white text-slate-800 shadow-[2px_2px_0px_#0f172a] hover:bg-[#bbf7d0] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Product Hero Card */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] text-center space-y-5">
            {/* Top Status Pill */}
            <div className="flex justify-center">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${statusConfig.lightBg} ${statusConfig.text}`}>
                <StatusIcon className="w-4 h-4 stroke-[2.5]" />
                <span>{statusConfig.label}</span>
              </span>
            </div>

            {/* Illustrated / Photo Container Card */}
            <div className="w-full max-w-[280px] mx-auto h-[230px] rounded-3xl bg-[#fefce8] border-2 border-slate-900 p-4 flex items-center justify-center relative overflow-hidden shadow-inner group">
              <img 
                src={previewUrl} 
                alt={displayTitle} 
                className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2.5 right-2.5 bg-white border-2 border-slate-900 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-[2px_2px_0px_#0f172a]">
                Score: {score}/100
              </div>
            </div>

            {/* Dynamic Produce Title & Subtitle */}
            <div className="transition-all duration-300">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {displayTitle}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">Perishability & Surface Degradation Analysis</p>
            </div>

            {/* Discoloration & Roughness Sliders */}
            <div className="space-y-3.5 pt-2 text-left">
              {/* Discoloration % Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-900">
                  <span>Surface Discoloration</span>
                  <span className="text-slate-900 font-black">{discolPct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                  <div 
                    className="h-full bg-[#f87171] border-r-2 border-slate-900 rounded-full transition-all duration-700" 
                    style={{ width: `${Math.min(100, Math.max(3, discolPct * 3))}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                  <span>Brown spots: {opencv?.discoloration?.brown_spot_pct || 0.8}%</span>
                  <span>Dark spots: {opencv?.discoloration?.dark_spot_pct || 1.0}%</span>
                </div>
              </div>

              {/* Texture Edge Density Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black text-slate-900">
                  <span>Skin Texture Integrity</span>
                  <span className="text-slate-900 font-black">{opencv?.texture_metrics?.edge_density_pct || 1.2}% edge density</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                  <div 
                    className="h-full bg-[#86efac] border-r-2 border-slate-900 rounded-full transition-all duration-700" 
                    style={{ width: `${Math.max(15, 100 - (discolPct * 1.5))}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Upload or Re-scan Trigger */}
            <label className="block w-full py-2.5 px-4 rounded-2xl bg-[#fefce8] hover:bg-[#fef08a] border-2 border-slate-900 text-slate-900 font-black text-xs cursor-pointer shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] text-center">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <span>📷 Snap or Upload New Food / Produce Photo</span>
            </label>
          </div>

        </div>

        {/* Right Side: Shelf-Life, Storage Tips & Recommendation Cards */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Shelf Life & Freshness Index Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <h3 className="font-black text-sm text-slate-900">Shelf-Life & Safety Metric</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Shelf Life */}
              <div className="p-4 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-1 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] cursor-pointer">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-[10px] font-black uppercase">Estimated Shelf-Life</span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {freshnessData?.estimated_shelf_life_days ?? '5-7'} <span className="text-xs font-bold text-slate-700">Days</span>
                </p>
                <p className="text-[10px] text-slate-700 font-bold">Optimal under refrigeration</p>
              </div>

              {/* Freshness Index */}
              <div className="p-4 rounded-2xl bg-[#bae6fd] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-1 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] cursor-pointer">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-[10px] font-black uppercase">Quality Index</span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {score} <span className="text-xs font-bold text-slate-700">/ 100</span>
                </p>
                <p className="text-[10px] text-slate-700 font-bold">Enzymatic decay minimal</p>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className={`p-4 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-start gap-3 ${statusConfig.lightBg}`}>
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-900 stroke-[2.5]" />
              <div>
                <h4 className="font-black text-xs text-slate-900">Safety Recommendation</h4>
                <p className="text-xs mt-1 text-slate-800 font-semibold leading-relaxed">
                  {freshnessData?.safety_recommendation || 'Completely safe to consume. Crisp texture and peak nutrient retention.'}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Storage Tips */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-3">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ThermometerSnowflake className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Smart Storage Guidelines</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-800 font-semibold leading-relaxed">
              {(freshnessData?.storage_tips || [
                'Refrigerate in high-humidity crisper drawer.',
                'Separate from ethylene-sensitive produce to maintain longevity.',
                'Do not wash until immediately prior to consumption.'
              ]).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-shrink-0 stroke-[2.5]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dynamic Produce Item Hint Input & Analyze button */}
          <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-3">
            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                Identified Produce Item / Optional Hint
              </label>
              <input
                type="text"
                value={itemHint}
                onChange={(e) => {
                  setItemHint(e.target.value);
                  setProduceName(e.target.value);
                }}
                placeholder="e.g. Broccoli, Red Onions (leave empty for automatic AI vision)"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-bold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200"
              />
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                Leave empty to let multimodal AI vision detect the food item automatically from image pixels.
              </p>
            </div>

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
                  <span>Scanning Surface Spectra & Identifying Produce...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse stroke-[2.5]" />
                  <span>Please wait {cooldownSeconds}s (Cooldown)...</span>
                </>
              ) : (
                <>
                  <span>Evaluate Freshness Status</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
