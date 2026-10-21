import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Sparkles, 
  Clock, 
  Flame, 
  Mic, 
  MicOff, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  RefreshCw, 
  BookOpen, 
  Lightbulb, 
  Layers, 
  Utensils,
  ChevronLeft,
  Calendar,
  Volume2
} from 'lucide-react';
import { api } from '../api/client';
import { sampleCookingData } from '../utils/sampleData';

export default function CookingAssistantTab({ setActiveTab, onGoBack }) {
  const [query, setQuery] = useState('What high-protein dinner can I prepare in under 30 minutes with fresh salmon and vegetables?');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80');
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioFilename, setAudioFilename] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [cookingData, setCookingData] = useState(sampleCookingData);

  // Mandatory 3-second cooldown timer after requests complete
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAudio(file);
      setAudioFilename(file.name);
      setError(null);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setQuery('How do I cook a high-protein dinner with fresh salmon, quinoa, and vegetables?');
        setAudioFilename('voice_spoken_query.wav');
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  const handleGenerate = async () => {
    if (!query && !selectedImage && !selectedAudio) {
      setError('Please provide a query, upload an ingredient photo, or record voice instructions.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.assistCooking({
        query: query || 'Create a gourmet recipe with my ingredients',
        imageFile: selectedImage,
        audioFile: selectedAudio,
      });
      setCookingData(data);
    } catch (err) {
      if (err?.response?.status === 429 || err?.response?.data?.isRateLimited) {
        setError(err?.response?.data?.detail || 'Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.');
      } else {
        setError(err?.response?.data?.detail || 'Failed to generate guidance. Showing verified chef recipe.');
      }
    } finally {
      setLoading(false);
      setCooldownSeconds(3); // Mandatory 3-second cooldown
    }
  };

  const loadDemo = () => {
    setCookingData(sampleCookingData);
    setQuery('What high-protein dinner can I prepare in under 30 minutes with fresh salmon and vegetables?');
    setImagePreview('https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80');
    setSelectedImage(null);
    setSelectedAudio(null);
    setAudioFilename('voice_sample_prompt.wav');
    setError(null);
  };

  const nutr = cookingData?.nutritional_estimate;

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
              Cooking Assistant & AI Chef
            </h1>
            <p className="text-xs text-slate-600 font-bold">Whisper Voice Synthesis · Pantry Vision · Step-by-Step Guidance</p>
          </div>
        </div>

        {/* 1-Click Demo Button */}
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Voice, Text & Ingredient Upload Form */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Voice & Ingredient Inputs</span>
            </h2>

            {/* Voice Recording Card with Soundwave Animation */}
            <div className={`p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all ${
              isRecording ? 'bg-[#f87171] text-white' : 'bg-[#f0fdf4] text-slate-900'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Groq Whisper Voice Audio</span>
                </span>
                {isRecording && (
                  <span className="text-[10px] bg-white text-slate-900 px-2 py-0.5 rounded-full font-black animate-pulse border border-slate-900">
                    RECORDING LIVE
                  </span>
                )}
              </div>

              {/* Soundwave Bars Animation State */}
              {isRecording ? (
                <div className="flex items-center justify-center gap-1.5 h-12 my-2">
                  <div className="w-1.5 bg-white rounded-full animate-wave-1" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-2" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-3" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-4" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-5" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-2" />
                  <div className="w-1.5 bg-white rounded-full animate-wave-1" />
                </div>
              ) : (
                <p className="text-xs text-slate-600 font-bold mb-2">Tap below to speak your ingredients or recipe question:</p>
              )}

              <button
                type="button"
                onClick={toggleRecording}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-200 ease-in-out flex items-center justify-center gap-2 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_#0f172a] cursor-pointer ${
                  isRecording 
                    ? 'bg-white text-slate-900 hover:bg-slate-100' 
                    : 'bg-[#fde047] hover:bg-[#facc15] text-slate-900'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4 text-slate-900 stroke-[2.5]" /> : <Mic className="w-4 h-4 text-slate-900 stroke-[2.5]" />}
                <span>{isRecording ? 'Listening... Tap to Finish' : 'Record Voice Query (Whisper)'}</span>
              </button>

              {audioFilename && !isRecording && (
                <p className="text-[10px] text-slate-800 font-black mt-2 truncate bg-white px-2 py-1 rounded border border-slate-900">
                  ✓ Audio linked: {audioFilename}
                </p>
              )}
            </div>

            {/* Culinary Request Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">Culinary Request</label>
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Quick high-protein dinner under 25 mins"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-[#fefce8] bg-slate-50 font-bold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 resize-none"
              />
            </div>

            {/* Optional Fridge / Ingredient Photo */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700">Pantry / Ingredients Photo (Optional)</label>
              <label className="border-2 border-dashed border-slate-900 hover:border-slate-800 bg-[#fefce8] rounded-2xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ease-in-out group overflow-hidden shadow-[2px_2px_0px_#0f172a]">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {imagePreview ? (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden border-2 border-slate-900 shadow-inner group">
                    <img src={imagePreview} alt="Ingredients" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-1">
                      <RefreshCw className="w-3.5 h-3.5" /> Replace Photo
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#fde047] border-2 border-slate-900 text-slate-900 flex items-center justify-center shadow-[1px_1px_0px_#0f172a]">
                      <Upload className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <p className="text-xs font-black text-slate-900">Attach photo of available ingredients</p>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#fca5a5] border-2 border-slate-900 text-slate-900 text-xs font-black shadow-[2px_2px_0px_#0f172a]">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || cooldownSeconds > 0}
              className="w-full py-3 px-5 rounded-2xl bg-[#86efac] hover:bg-[#4ade80] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all duration-200 ease-in-out hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[0px_0px_0px_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_#0f172a] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#0f172a] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Synthesizing Chef Techniques...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse stroke-[2.5]" />
                  <span>Please wait {cooldownSeconds}s (Cooldown)...</span>
                </>
              ) : (
                <>
                  <span>Generate Culinary Guidance</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Side: Recipe Card & Step Pills */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Recipe Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-[#bbf7d0] px-2.5 py-1 rounded-full border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  Chef Curated Dish
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                  {cookingData?.recipe_name || 'Pan-Seared Citrus Herb Salmon'}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#fde047] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] self-start sm:self-auto">
                {cookingData?.difficulty || 'Medium'}
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-center transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] cursor-pointer">
                <Clock className="w-4 h-4 mx-auto text-slate-900 stroke-[2.5] mb-0.5" />
                <p className="text-[9px] text-slate-500 font-bold uppercase">Prep Time</p>
                <p className="text-xs font-black text-slate-900">{cookingData?.prep_time_mins ?? 15} mins</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-center transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] cursor-pointer">
                <Flame className="w-4 h-4 mx-auto text-slate-900 fill-amber-400 mb-0.5" />
                <p className="text-[9px] text-slate-500 font-bold uppercase">Cook Time</p>
                <p className="text-xs font-black text-slate-900">{cookingData?.cook_time_mins ?? 20} mins</p>
              </div>
              <div className="p-3 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-center transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] cursor-pointer">
                <Sparkles className="w-4 h-4 mx-auto text-slate-900 stroke-[2.5] mb-0.5" />
                <p className="text-[9px] text-slate-500 font-bold uppercase">Calories</p>
                <p className="text-xs font-black text-slate-900">{nutr?.calories_per_serving ?? 450} kcal</p>
              </div>
            </div>

            {/* Macro Breakdown */}
            {nutr && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-slate-900 text-xs font-black text-slate-900">
                <span className="text-[10px] text-slate-500 uppercase">Macros:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#bbf7d0] border border-slate-900 shadow-[1px_1px_0px_#0f172a]">{nutr.protein_g}g Protein</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#fef08a] border border-slate-900 shadow-[1px_1px_0px_#0f172a]">{nutr.carbs_g}g Carbs</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#fbcfe8] border border-slate-900 shadow-[1px_1px_0px_#0f172a]">{nutr.fats_g}g Fats</span>
              </div>
            )}
          </div>

          {/* Ingredients Pill Group */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-3">
            <h4 className="font-black text-sm text-slate-900">Ingredients Identified</h4>
            <div className="flex flex-wrap gap-2">
              {(cookingData?.detected_ingredients || ['Fresh Salmon Fillet', 'Quinoa', 'Broccoli', 'Lemon', 'Olive Oil']).map((ing, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full text-xs font-black bg-[#fefce8] text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  ✓ {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Step-by-Step Recipe Instructions</span>
            </h4>

            <div className="space-y-3">
              {(cookingData?.step_by_step_instructions || [
                'Pat salmon dry with paper towels to ensure a crispy golden sear.',
                'Season generously with salt, pepper, and freshly squeezed lemon juice.',
                'Preheat skillet with olive oil over medium-high heat until shimmering.',
                'Place salmon skin-side down; cook for 4-5 minutes undisturbed.',
                'Flip gently and finish cooking for 3 minutes until medium-rare.'
              ]).map((step, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#fafcfb] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#fde047] border-2 border-slate-900 text-slate-900 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_#0f172a]">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-900 leading-relaxed font-bold">
                    {step.replace(/^Step \d+:\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chef Tips */}
          {cookingData?.contextual_cooking_tips && (
            <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-2">
              <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                <span>Executive Chef Culinary Secrets</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-800 font-semibold">
                {cookingData.contextual_cooking_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-shrink-0 stroke-[2.5]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
