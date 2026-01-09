
import React, { useState } from 'react';
import { TrendingUp, Target, Zap, BarChart, Search, ArrowRight, Video, Sparkles, Loader2, PlayCircle, Eye, ExternalLink, Youtube, RefreshCcw, Users } from 'lucide-react';
import { generateTrendAnalysis } from '../services/geminiService';
import { NicheExplorerResult, ViralVideo, TrendForecast, CompetitorAnalysis } from '../types';
import { RESEARCH_CATEGORIES } from '../constants';

const TrendingResearch: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'TRACKER' | 'FORECAST' | 'COMPETITOR'>('EXPLORE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Inputs
  const [category, setCategory] = useState(RESEARCH_CATEGORIES[0]);
  const [country, setCountry] = useState('United States');
  const [timeframe, setTimeframe] = useState('7 days');
  const [competitorName, setCompetitorName] = useState('');

  // Results State
  const [nicheData, setNicheData] = useState<NicheExplorerResult | null>(null);
  const [viralVideos, setViralVideos] = useState<ViralVideo[]>([]);
  const [forecasts, setForecasts] = useState<TrendForecast[]>([]);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis | null>(null);

  const handleAnalysis = async () => {
    setIsProcessing(true);
    // Don't clear previous results immediately to prevent flickering during refresh
    
    try {
      const data = await generateTrendAnalysis(activeTab, {
        category,
        country,
        timeframe,
        competitorName
      });

      if (activeTab === 'EXPLORE') setNicheData(data);
      if (activeTab === 'TRACKER' && Array.isArray(data)) setViralVideos(data);
      if (activeTab === 'FORECAST' && Array.isArray(data)) setForecasts(data);
      if (activeTab === 'COMPETITOR') setCompetitorAnalysis(data);
      
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (err) {
      console.error(err);
      alert("Could not fetch real-time data from YouTube. Please try again in a few moments.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <TrendingUp className="text-green-500" />
           Trending Research Lab
        </h2>
        <div className="flex items-center gap-4 mt-1">
           <p className="text-gray-400 text-sm">
             Real-time market intelligence using verified Google Trends & YouTube data.
           </p>
           {lastUpdated && (
             <span className="text-xs text-green-500 font-mono bg-green-900/20 px-2 py-0.5 rounded border border-green-900">
               Live Data Updated: {lastUpdated}
             </span>
           )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Navigation & Controls */}
        <div className="w-full lg:w-80 bg-gray-850 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto custom-scrollbar">
           
           {/* Navigation Tabs */}
           <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab('EXPLORE')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'EXPLORE' ? 'bg-green-600/20 text-green-400 border border-green-500/50' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                 <Target className="w-5 h-5" />
                 <div className="text-left">
                    <span className="block font-bold text-sm">Niche Explorer</span>
                    <span className="block text-xs opacity-70">Top Channels & Videos</span>
                 </div>
              </button>

              <button 
                onClick={() => setActiveTab('TRACKER')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'TRACKER' ? 'bg-red-600/20 text-red-400 border border-red-500/50' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                 <Video className="w-5 h-5" />
                 <div className="text-left">
                    <span className="block font-bold text-sm">Viral Tracker</span>
                    <span className="block text-xs opacity-70">Real-Time Videos</span>
                 </div>
              </button>

              <button 
                onClick={() => setActiveTab('FORECAST')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'FORECAST' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                 <Sparkles className="w-5 h-5" />
                 <div className="text-left">
                    <span className="block font-bold text-sm">Trend Forecast</span>
                    <span className="block text-xs opacity-70">Predict Breakouts</span>
                 </div>
              </button>

              <button 
                onClick={() => setActiveTab('COMPETITOR')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'COMPETITOR' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                 <BarChart className="w-5 h-5" />
                 <div className="text-left">
                    <span className="block font-bold text-sm">Competitor Intel</span>
                    <span className="block text-xs opacity-70">Spy & Strategize</span>
                 </div>
              </button>
           </div>

           <div className="h-px bg-gray-800 my-2"></div>

           {/* Input Controls */}
           <div className="space-y-4 animate-fade-in">
              {activeTab === 'EXPLORE' && (
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Target Category</label>
                    <select
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {RESEARCH_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                 </div>
              )}

              {activeTab === 'TRACKER' && (
                 <>
                   <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Country</label>
                      <select 
                         value={country}
                         onChange={(e) => setCountry(e.target.value)}
                         className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none"
                      >
                         <option>United States</option>
                         <option>United Kingdom</option>
                         <option>Canada</option>
                         <option>Australia</option>
                         <option>India</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Timeframe</label>
                      <select 
                         value={timeframe}
                         onChange={(e) => setTimeframe(e.target.value)}
                         className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none"
                      >
                         <option value="24 hours">Last 24 Hours</option>
                         <option value="7 days">Last 7 Days</option>
                         <option value="30 days">Last 30 Days</option>
                      </select>
                   </div>
                 </>
              )}

              {activeTab === 'FORECAST' && (
                 <div className="p-4 bg-purple-900/10 border border-purple-500/30 rounded-lg text-xs text-purple-200">
                    <p>AI will analyze current search momentum and cultural signals to predict the next big waves.</p>
                 </div>
              )}

              {activeTab === 'COMPETITOR' && (
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Competitor Channel / Topic</label>
                    <input 
                      type="text" 
                      placeholder="e.g. MrBeast, AI Revolution" 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      value={competitorName}
                      onChange={(e) => setCompetitorName(e.target.value)}
                    />
                 </div>
              )}

              <button 
                onClick={handleAnalysis}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                  ${activeTab === 'EXPLORE' ? 'bg-green-600 hover:bg-green-500' :
                    activeTab === 'TRACKER' ? 'bg-red-600 hover:bg-red-500' :
                    activeTab === 'FORECAST' ? 'bg-purple-600 hover:bg-purple-500' :
                    'bg-blue-600 hover:bg-blue-500'}
                `}
              >
                 {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-current" />}
                 {isProcessing ? 'Fetching Data...' : 'Generate Insights'}
              </button>
           </div>
           
        </div>

        {/* Right Panel: Results Grid */}
        <div className="flex-1 bg-gray-900 p-6 overflow-y-auto custom-scrollbar relative">
           
           {/* Manual Refresh Button - Floating Top Right */}
           <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleAnalysis}
                disabled={isProcessing}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded-lg text-xs font-bold transition-all shadow-lg"
              >
                 <RefreshCcw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                 Refresh Data
              </button>
           </div>

           {/* EXPLORE RESULTS */}
           {activeTab === 'EXPLORE' && nicheData && (
              <div className="space-y-6">
                 {/* Top Channels Section */}
                 <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                       <Users className="text-blue-500" /> Top Authority Channels in {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {nicheData.topChannels?.map((channel, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">#{idx + 1}</div>
                                <div>
                                   <p className="font-bold text-white text-sm">{channel.name}</p>
                                   <p className="text-xs text-gray-400">{channel.subscribers} Subscribers</p>
                                </div>
                             </div>
                             <a 
                               href={channel.channelUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </a>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Top Videos Section */}
                 <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                       <Youtube className="text-red-500" /> Top Trending Videos in {category}
                    </h3>
                    <div className="space-y-3">
                       {nicheData.topVideos?.map((video, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:bg-gray-800 transition-all group">
                             <div className="w-12 h-8 bg-red-900/20 rounded flex items-center justify-center text-red-500 font-bold text-sm">
                                {idx + 1}
                             </div>
                             <div className="flex-1 min-w-0">
                                <a 
                                  href={video.videoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-bold text-white hover:text-red-400 transition-colors text-sm line-clamp-1 mb-1 block"
                                >
                                   {video.title}
                                </a>
                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                   <span className="flex items-center gap-1 font-medium text-gray-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> {video.channelName}
                                   </span>
                                   <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views} Views</span>
                                </div>
                             </div>
                             <a 
                               href={video.videoUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-2 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                             >
                                <ExternalLink className="w-4 h-4" />
                             </a>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {/* TRACKER RESULTS */}
           {activeTab === 'TRACKER' && viralVideos.length > 0 && (
              <div className="space-y-4">
                 {viralVideos.map((video, idx) => (
                    <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center gap-4 hover:border-red-500/30 transition-all">
                       <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-lg shadow-lg shadow-red-900/50">
                          {idx + 1}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-red-400 transition-colors line-clamp-1 flex items-center gap-2">
                             {video.title} <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                             <a href={video.channelUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-gray-500"></span> {video.channelName}
                             </a>
                             <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                             <span>• {video.timeframe}</span>
                             <span>• {country}</span>
                          </div>
                       </div>

                       <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 flex-shrink-0
                          ${video.trajectory === 'Growing' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 
                            video.trajectory === 'Stable' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' : 
                            'bg-red-900/20 text-red-400 border-red-500/30'}
                       `}>
                          {video.trajectory === 'Growing' ? <TrendingUp className="w-3 h-3" /> : <BarChart className="w-3 h-3" />}
                          {video.trajectory}
                       </div>
                    </div>
                 ))}
              </div>
           )}

           {/* FORECAST RESULTS */}
           {activeTab === 'FORECAST' && forecasts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {forecasts.map((item, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-gray-800 to-purple-900/20 rounded-xl p-6 border border-gray-700 relative overflow-hidden">
                       <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold text-white">{item.topic}</h3>
                          <span className="text-2xl font-bold text-purple-400">{item.predictionScore}</span>
                       </div>
                       <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                          <div className="bg-purple-500 h-full" style={{ width: `${item.predictionScore}%` }}></div>
                       </div>
                       <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Potential Reach: {item.potentialReach}</p>
                    </div>
                 ))}
              </div>
           )}

           {/* COMPETITOR RESULTS */}
           {activeTab === 'COMPETITOR' && competitorAnalysis && (
              <div className="space-y-6">
                 {/* Stats */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                       <h4 className="text-xs font-bold text-blue-300 uppercase">Growth Rate Est.</h4>
                       <p className="text-2xl font-bold text-white">{competitorAnalysis.growthRate}</p>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
                       <h4 className="text-xs font-bold text-gray-400 uppercase">Similar Channels</h4>
                       <div className="flex flex-wrap gap-2 mt-2">
                          {competitorAnalysis.similarChannels?.map(ch => (
                             <span key={ch} className="px-2 py-1 bg-gray-700 rounded text-xs text-white">{ch}</span>
                          ))}
                       </div>
                    </div>
                 </div>
                 
                 {/* Pillars */}
                 <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="font-bold text-white mb-4">Top Performing Content Pillars</h3>
                    <div className="flex flex-col gap-2">
                       {competitorAnalysis.topPillars?.map((pillar, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
                             <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                             <span className="text-gray-200">{pillar}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Blueprint */}
                 {competitorAnalysis.blueprint && (
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/50">
                       <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                          <Sparkles className="text-yellow-400" /> Strategic Blueprint
                       </h3>
                       <div className="space-y-4">
                          <div>
                             <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Recommended Hook</span>
                             <p className="text-white bg-gray-900/50 p-3 rounded-lg border border-blue-500/20 italic">"{competitorAnalysis.blueprint.hook}"</p>
                          </div>
                          <div>
                             <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Key Points</span>
                             <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1">
                                {competitorAnalysis.blueprint.keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                             </ul>
                          </div>
                          <div>
                             <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Call To Action</span>
                             <p className="text-white text-sm">{competitorAnalysis.blueprint.callToAction}</p>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           )}

           {/* Empty State */}
           {!isProcessing && !nicheData && viralVideos.length === 0 && forecasts.length === 0 && !competitorAnalysis && (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                 <TrendingUp className="w-20 h-20 mb-4" />
                 <p className="text-lg font-bold">Start Your Research</p>
                 <p className="text-sm">Select a module from the left to begin.</p>
              </div>
           )}

        </div>

      </div>
    </div>
  );
};

export default TrendingResearch;