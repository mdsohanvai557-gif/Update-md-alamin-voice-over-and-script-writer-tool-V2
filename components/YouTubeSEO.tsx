import React, { useState } from 'react';
import { Youtube, Search, Sparkles, Copy, CheckCircle2, ArrowRight, Hash, FileText, Type, BarChart2, TrendingUp, Trophy } from 'lucide-react';
import { generateYouTubeSEO, generateTitleFromScript } from '../services/geminiService';
import { YouTubeSEOResult } from '../types';

const YouTubeSEO: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'Title' | 'Script'>('Title');
  const [inputTitle, setInputTitle] = useState('');
  const [inputScript, setInputScript] = useState('');
  const [referenceStyle, setReferenceStyle] = useState('');
  const [shouldGenerateHook, setShouldGenerateHook] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<YouTubeSEOResult | null>(null);
  const [viralHook, setViralHook] = useState('');
  const [generatedTitleFromScript, setGeneratedTitleFromScript] = useState('');

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const processFromTitle = async () => {
    if (!inputTitle.trim()) return;
    
    // Validate hook requirement
    if (shouldGenerateHook && !inputScript.trim()) {
        alert("To generate a Viral Hook, you must provide a script or summary in the box provided.");
        return;
    }

    setIsProcessing(true);
    setResults(null);
    setViralHook('');
    try {
      // Pass script (if available) to help with description generation, and hook flag
      const seoData = await generateYouTubeSEO(inputTitle, referenceStyle, inputScript, shouldGenerateHook);
      setResults(seoData);
      if (seoData.viralHook) setViralHook(seoData.viralHook);
    } catch (error) {
      console.error(error);
      alert("Failed to generate SEO assets. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processFromScript = async () => {
    if (!inputScript.trim()) return;
    setIsProcessing(true);
    setGeneratedTitleFromScript('');
    try {
      const suggestedTitle = await generateTitleFromScript(inputScript);
      setGeneratedTitleFromScript(suggestedTitle);
      setInputTitle(suggestedTitle); // Populate for next step
    } catch (error) {
      console.error(error);
      alert("Failed to analyze script.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <Youtube className="text-red-500" />
           YouTube SEO Studio
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Generate viral titles, optimized descriptions, high-ranking tags, and killer hooks.
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Inputs */}
        <div className="w-full lg:w-[450px] bg-gray-850 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto custom-scrollbar">
           
           {/* Mode Tabs */}
           <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
              <button 
                onClick={() => setActiveMode('Title')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeMode === 'Title' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <Type className="w-4 h-4" /> From Title
              </button>
              <button 
                onClick={() => setActiveMode('Script')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeMode === 'Script' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" /> From Script
              </button>
           </div>

           {/* --- FROM SCRIPT MODE --- */}
           {activeMode === 'Script' && (
             <div className="animate-fade-in space-y-4">
                <div className="flex flex-col h-full">
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Paste Video Script (Unlimited)</label>
                   <textarea 
                     className="w-full h-96 bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 resize-none focus:ring-2 focus:ring-red-500 outline-none custom-scrollbar"
                     placeholder="Paste your full video script here..."
                     value={inputScript}
                     onChange={(e) => setInputScript(e.target.value)}
                   ></textarea>
                </div>
                
                <button 
                  onClick={processFromScript}
                  disabled={isProcessing || !inputScript.trim()}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Sparkles className="animate-spin" /> : <Search />}
                  Generate Title from Script
                </button>

                {generatedTitleFromScript && (
                   <div className="bg-gray-900 p-4 rounded-xl border border-red-500/30 animate-fade-in">
                      <p className="text-xs text-gray-400 uppercase font-bold mb-2">Suggested Title:</p>
                      <p className="text-lg font-bold text-white mb-4">{generatedTitleFromScript}</p>
                      
                      <button 
                        onClick={() => setActiveMode('Title')}
                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2"
                      >
                        Proceed to Full SEO Optimization <ArrowRight className="w-3 h-3" />
                      </button>
                   </div>
                )}
             </div>
           )}

           {/* --- FROM TITLE MODE --- */}
           {activeMode === 'Title' && (
             <div className="animate-fade-in space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Video Title</label>
                   <input 
                     type="text" 
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                     placeholder="e.g. How to make AI Videos"
                     value={inputTitle}
                     onChange={(e) => setInputTitle(e.target.value)}
                   />
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Title Style Reference (Optional)</label>
                   <input 
                     type="text" 
                     className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-600"
                     placeholder="e.g. Top 10 Secrets Revealed!"
                     value={referenceStyle}
                     onChange={(e) => setReferenceStyle(e.target.value)}
                   />
                </div>

                {/* Viral Hook Option */}
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={shouldGenerateHook}
                            onChange={(e) => setShouldGenerateHook(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500 bg-gray-800 border-gray-600"
                        />
                        <span className="text-sm font-bold text-gray-300">Generate a Viral Hook</span>
                    </label>
                    
                    {shouldGenerateHook && (
                        <div className="mt-3 animate-fade-in">
                            <label className="text-xs font-bold text-yellow-500 uppercase mb-1 block">Script Required for Hook:</label>
                            <textarea 
                                className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-200 resize-none focus:ring-1 focus:ring-yellow-500 outline-none"
                                placeholder="Paste script or summary here so AI can write a hook..."
                                value={inputScript}
                                onChange={(e) => setInputScript(e.target.value)}
                            ></textarea>
                        </div>
                    )}
                </div>

                <button 
                  onClick={processFromTitle}
                  disabled={isProcessing || !inputTitle.trim()}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <Sparkles className="animate-spin" /> : <Search />}
                  Generate Full SEO Package
                </button>
             </div>
           )}

        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 bg-gray-900 p-6 overflow-y-auto custom-scrollbar">
           {!results && !viralHook ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                 <Youtube className="w-16 h-16 mb-4" />
                 <p className="text-lg font-bold">Ready to Optimize</p>
                 <p className="text-sm">Enter a title or script to generate expert SEO assets.</p>
              </div>
           ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                 
                 {/* SEO Score Banner */}
                 {results && (
                   <div className="flex items-center justify-between bg-gray-850 p-5 rounded-xl border border-gray-700 shadow-xl">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-blue-500/10 rounded-lg">
                            <BarChart2 className="w-8 h-8 text-blue-500" />
                         </div>
                         <div>
                            <h3 className="text-xl font-bold text-white">Overall SEO Score</h3>
                            <p className="text-sm text-gray-400">Predicted Performance & Clickability</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-800" />
                              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                className={`${results.seoScore >= 85 ? 'text-green-500' : results.seoScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}
                                strokeDasharray={`${results.seoScore * 2.1}, 1000`} 
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-xl font-bold text-white">{results.seoScore}</span>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* Optimized Title */}
                 {results && (
                   <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                      <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                           <Type className="w-4 h-4 text-red-500" /> Optimized SEO Title
                         </h3>
                         <button onClick={() => handleCopy(results.optimizedTitle, 'title')} className="text-gray-400 hover:text-white transition-colors">
                            {copyStatus === 'title' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                         </button>
                      </div>
                      <div className="p-5">
                         <p className="text-2xl font-bold text-white leading-tight">{results.optimizedTitle}</p>
                      </div>
                   </div>
                 )}
                 
                 {/* Viral Hook */}
                 {viralHook && (
                   <div className="bg-yellow-900/10 rounded-xl border border-yellow-500/30 overflow-hidden animate-fade-in shadow-lg">
                      <div className="p-4 bg-yellow-900/20 border-b border-yellow-500/20 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-yellow-200 flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-yellow-500" /> Viral Video Hook
                         </h3>
                         <button onClick={() => handleCopy(viralHook, 'hook')} className="text-yellow-400 hover:text-yellow-200 transition-colors">
                            {copyStatus === 'hook' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         </button>
                      </div>
                      <div className="p-5">
                         <p className="text-lg text-yellow-100 italic leading-relaxed">"{viralHook}"</p>
                      </div>
                   </div>
                 )}

                 {/* Description */}
                 {results && (
                   <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                      <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                           <FileText className="w-4 h-4 text-blue-500" /> Optimized Description
                         </h3>
                         <button onClick={() => handleCopy(results.description, 'desc')} className="text-gray-400 hover:text-white transition-colors">
                            {copyStatus === 'desc' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                         </button>
                      </div>
                      <div className="p-5">
                         <div className="w-full bg-transparent text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                            {results.description}
                         </div>
                      </div>
                   </div>
                 )}

                 {/* Tags */}
                 {results && (
                   <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                      <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                           <Hash className="w-4 h-4 text-green-500" /> Viral Tags (For YouTube Tag Box)
                         </h3>
                         <button onClick={() => handleCopy(results.tags?.join(', ') || '', 'tags')} className="text-gray-400 hover:text-white transition-colors">
                            {copyStatus === 'tags' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                         </button>
                      </div>
                      <div className="p-5 bg-gray-900/50">
                         <p className="text-sm text-gray-300 font-mono leading-relaxed">
                            {results.tags?.join(', ') || 'No tags generated.'}
                         </p>
                      </div>
                   </div>
                 )}

                 {/* Competitive Analysis */}
                 {results && results.competitors && results.competitors.length > 0 && (
                   <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden animate-fade-in shadow-lg">
                      <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex items-center gap-2">
                         <Trophy className="w-5 h-5 text-yellow-500" />
                         <h3 className="text-sm font-bold text-gray-200">Top 10 Competing High-CTR Titles</h3>
                      </div>
                      <div className="divide-y divide-gray-800">
                         {results.competitors.map((comp, idx) => (
                            <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-800/50 transition-colors group">
                               <div className="flex gap-4 items-center">
                                  <span className="text-lg font-bold text-gray-600 group-hover:text-white transition-colors w-6">{idx + 1}.</span>
                                  <p className="text-sm text-gray-200 font-medium">{comp.title}</p>
                               </div>
                               <div className="flex flex-col items-end min-w-[80px]">
                                  <span className={`text-sm font-bold ${comp.score >= 90 ? 'text-green-400' : comp.score >= 80 ? 'text-green-500' : comp.score >= 70 ? 'text-yellow-500' : 'text-orange-500'}`}>
                                    Score: {comp.score}
                                  </span>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                 )}

              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default YouTubeSEO;