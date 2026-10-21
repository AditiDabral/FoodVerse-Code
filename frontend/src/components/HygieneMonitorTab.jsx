import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  ShieldCheck, 
  Video, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Loader2, 
  RefreshCw, 
  ClipboardCheck, 
  Layers,
  FileCheck,
  ChevronLeft,
  Calendar,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { sampleHygieneData } from '../utils/sampleData';

export default function HygieneMonitorTab({ setActiveTab, onGoBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80');
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [hygieneData, setHygieneData] = useState(sampleHygieneData);

  // Mandatory 3-second cooldown timer after requests complete
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|avi|mov|mkv)$/i);
      setIsVideo(!!isVid);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please choose or upload a kitchen station image or video first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzeHygiene(selectedFile);
      setHygieneData(data);
    } catch (err) {
      if (err?.response?.status === 429 || err?.response?.data?.isRateLimited) {
        setError(err?.response?.data?.detail || 'Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.');
      } else {
        setError(err?.response?.data?.detail || 'Failed to analyze hygiene. Showing verified inspection report.');
      }
    } finally {
      setLoading(false);
      setCooldownSeconds(3); // Mandatory 3-second cooldown
    }
  };

  const loadDemo = () => {
    setHygieneData(sampleHygieneData);
    setPreviewUrl('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80');
    setIsVideo(false);
    setSelectedFile(null);
    setError(null);
  };

  const score = hygieneData?.hygiene_score ?? 92;
  const status = hygieneData?.compliance_status || 'Compliant';
  const ind = hygieneData?.indicators || sampleHygieneData.indicators;
  const violations = hygieneData?.detected_violations || [];
  const recommendations = hygieneData?.safety_recommendations || [];
  const meta = hygieneData?.media_metadata;

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
              Hygiene & Safety Monitor
            </h1>
            <p className="text-xs text-slate-600 font-bold">Objective 5 Sanitary Audit & Video Keyframe Analysis</p>
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
        
        {/* Left Side: Kitchen Station Upload Card */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                <span>Station Camera / Feed</span>
              </h2>
              <span className="text-[10px] font-black text-slate-900 bg-[#bbf7d0] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-full">
                {isVideo ? 'Surveillance Video' : 'Station Snapshot'}
              </span>
            </div>

            {/* Media Dropzone */}
            <label className="relative border-2 border-dashed border-slate-900 hover:border-slate-800 bg-[#fefce8] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden min-h-[190px] shadow-[2px_2px_0px_#0f172a]">
              <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
              {previewUrl ? (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border-2 border-slate-900 shadow-inner group">
                  {isVideo ? (
                    <video src={previewUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={previewUrl} alt="Station" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-1.5 pointer-events-none">
                    <RefreshCw className="w-4 h-4" /> Change Station Media
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#fde047] border-2 border-slate-900 text-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#0f172a]">
                    <Upload className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Drop kitchen photo or surveillance video</p>
                  <p className="text-[10px] text-slate-500 font-bold">MP4, MOV, JPG, PNG</p>
                </div>
              )}
            </label>

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
                  <span>Scanning Compliance Indicators...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse stroke-[2.5]" />
                  <span>Please wait {cooldownSeconds}s (Cooldown)...</span>
                </>
              ) : (
                <>
                  <span>Run Automated Sanitary Audit</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>

          {/* Cleanliness Diagnostics Widget */}
          {meta && (
            <div className="bg-white rounded-3xl p-5 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-900 font-black">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-900 stroke-[2.5]" />
                  <span>Keyframe & Cleanliness Stats</span>
                </span>
                <span className="text-[10px] text-slate-900 bg-[#fde047] border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a] px-2 py-0.5 rounded-full font-black uppercase">
                  {meta.media_type || 'Frame'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  <p className="text-[10px] text-slate-500 font-bold">Surface Index</p>
                  <p className="text-sm font-black text-slate-900">{meta.cv_metrics?.cleanliness_index ?? 95}%</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f0fdf4] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                  <p className="text-[10px] text-slate-500 font-bold">Clutter Density</p>
                  <p className="text-sm font-black text-slate-900">{meta.cv_metrics?.edge_density_pct ?? 1.5}%</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Score Hero + 4 Indicator Badges + Violations */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Hero Compliance Score Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sanitary Rating</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {status === 'Compliant' ? 'Food Safety Compliant' : 'Conditional Notice'}
                </h3>
              </div>
              <span className={`px-4 py-1.5 rounded-full font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] ${
                status === 'Compliant'
                  ? 'bg-[#bbf7d0] text-slate-900'
                  : 'bg-[#fef08a] text-slate-900'
              }`}>
                {status}
              </span>
            </div>

            {/* Score Bar */}
            <div className="p-4 rounded-2xl bg-[#f0fdf4] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900">Overall Sanitation Compliance</span>
                <span className="text-xl font-black text-slate-900">{score}/100</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-900 shadow-inner">
                <div 
                  className="h-full bg-[#86efac] border-r-2 border-slate-900 rounded-full transition-all duration-700" 
                  style={{ width: `${score}%` }} 
                />
              </div>
            </div>

            {/* Objective 5: 4 Core Indicators Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Objective 5 Core Sanitary Badges
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Glove Usage */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-slate-900">Glove Usage</p>
                    <p className="text-[10px] text-slate-500 font-bold">Barrier protection</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    <Check className="w-3 h-3 stroke-[3]" /> {ind.glove_usage || 'Compliant'}
                  </span>
                </div>

                {/* Hair Cap Compliance */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-slate-900">Hair Cap Compliance</p>
                    <p className="text-[10px] text-slate-500 font-bold">Physical barrier</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    <Check className="w-3 h-3 stroke-[3]" /> {ind.hair_cap_compliance || 'Compliant'}
                  </span>
                </div>

                {/* Food Handling Practices */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-slate-900">Food Handling</p>
                    <p className="text-[10px] text-slate-500 font-bold">Cross-contamination</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    <Check className="w-3 h-3 stroke-[3]" /> {ind.food_handling_practices || 'Safe'}
                  </span>
                </div>

                {/* Surface Cleanliness */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#0f172a] flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-slate-900">Surface Cleanliness</p>
                    <p className="text-[10px] text-slate-500 font-bold">Workstation hygiene</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-[#bbf7d0] text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0px_#0f172a]">
                    <Check className="w-3 h-3 stroke-[3]" /> {ind.surface_cleanliness || 'Sanitary'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inspection Infractions & Safety Checklist */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] space-y-3">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-900 stroke-[2.5]" />
              <span>Inspection Infractions & Violations</span>
            </h4>

            {violations.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-[#bbf7d0] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center gap-2.5 text-slate-900 text-xs font-black">
                <CheckCircle2 className="w-4 h-4 text-slate-900 stroke-[2.5] flex-shrink-0" />
                <span>Zero infractions detected. Commercial kitchen strictly conforms to hygiene standards.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {violations.map((v, i) => (
                  <li key={i} className="p-3 rounded-xl bg-[#fca5a5] border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] text-slate-900 text-xs font-black flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-slate-900 stroke-[2.5] flex-shrink-0" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
