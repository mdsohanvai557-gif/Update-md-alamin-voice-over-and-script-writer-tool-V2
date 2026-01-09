
import React, { useState } from 'react';
import { Wand2, Languages, CheckCircle2, RefreshCw, Copy, ArrowRight, Eraser, Youtube, Sparkles, Lightbulb, Download, Settings } from 'lucide-react';
import { rewriteScript } from '../services/geminiService';
import { SUPPORTED_LANGUAGES } from '../constants';

interface Props {
  script: string;
  onUpdateScript: (newScript: string) => void;
}

const ScriptRewriter: React.FC<Props> = ({ script, onUpdateScript }) => {
  const [isRewriting, setIsRewriting] = useState(false);
  const [mode, setMode] = useState<'Creative' | 'Humanize' | 'Translate'>('Creative');
  const [target, setTarget] = useState('');
  const [wordCount, setWordCount] = useState('');
  
  // Advanced Creative Options
  const [addHook, setAddHook] = useState(false);
  const [addIntro, setAddIntro] = useState(false);
  const [channelName, setChannelName] = useState('');
  
  const [autoChangeNames, setAutoChangeNames] = useState(false);
  const [autoChangeAges, setAutoChangeAges] = useState(false);
  const [autoChangeLocations, setAutoChangeLocations] = useState(false);
  
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleRewrite = async () => {
    if (!script.trim()) return;
    setIsRewriting(true);
    setLastAction(null);
    try {
      // For Humanize/Creative mode, we set a default target vibe if none selected
      const actualTarget = (mode !== 'Translate') && !target ? 'Engaging & Conversational' : target;
      
      const result = await rewriteScript(
        script, 
        mode, 
        actualTarget, 
        wordCount,
        channelName,
        addHook,
        addIntro,
        autoChangeNames,
        autoChangeAges,
        autoChangeLocations
      );
      
      onUpdateScript(result);
      
      let desc = '';
      if (mode === 'Creative') desc = 'Creative Rewrite Complete';
      if (mode === 'Humanize') desc = 'Script Humanized for YouTube';
      if (mode === 'Translate') desc = `Translated to ${target}`;
      
      setLastAction(`Success: ${desc}`);
    } catch (error) {
      console.error(error);
      setLastAction('Error processing request.');
    } finally {
      setIsRewriting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    setLastAction('Copied to clipboard!');
    setTimeout(() => setLastAction(null), 2000);
  };

  const handleDownload = () => {
    if (!script.trim()) return;
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Alamin_Voice_Tool_rewritten_script_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Youtube className="text-red-500" />
            Script Rewriter Studio
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Transform inputs into unique, engaging, human-like narratives for YouTube.
          </p>
        </div>
        {lastAction && (
          <div className="bg-gray-800 text-green-400 border border-green-900 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {lastAction}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Toolbar Panel - Split into Scrollable Options and Fixed Footer */}
        <div className="w-full md:w-80 bg-gray-850 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col h-full">
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Mode</h3>
              
              {/* Mode: Creative Rewrite */}
              <button 
                onClick={() => { setMode('Creative'); setTarget('Engaging & Creative'); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all relative overflow-hidden group ${mode === 'Creative' ? 'bg-gray-800 border-yellow-500 ring-1 ring-yellow-500/50' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
              >
                <div className={`p-2 rounded-lg ${mode === 'Creative' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'}`}>
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="text-left z-10">
                  <span className={`block font-bold text-sm ${mode === 'Creative' ? 'text-white' : 'text-gray-300'}`}>Creative Rewrite</span>
                  <span className="block text-xs opacity-70">Unique & Engaging</span>
                </div>
                {mode === 'Creative' && <div className="absolute inset-0 bg-yellow-600/5 z-0"></div>}
              </button>

              {/* Mode: YouTube Humanizer */}
              <button 
                onClick={() => { setMode('Humanize'); setTarget('Engaging & Conversational'); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all relative overflow-hidden group ${mode === 'Humanize' ? 'bg-gray-800 border-red-500 ring-1 ring-red-500/50' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
              >
                <div className={`p-2 rounded-lg ${mode === 'Humanize' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left z-10">
                  <span className={`block font-bold text-sm ${mode === 'Humanize' ? 'text-white' : 'text-gray-300'}`}>YouTube Humanizer</span>
                  <span className="block text-xs opacity-70">100% Unique & Natural</span>
                </div>
                {mode === 'Humanize' && <div className="absolute inset-0 bg-red-600/5 z-0"></div>}
              </button>

              {/* Mode: Translate */}
              <button 
                onClick={() => { setMode('Translate'); setTarget(SUPPORTED_LANGUAGES[0]); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${mode === 'Translate' ? 'bg-gray-800 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
              >
                <div className={`p-2 rounded-lg ${mode === 'Translate' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
                  <Languages className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">Translate</span>
                  <span className="block text-xs opacity-70">Convert Language</span>
                </div>
              </button>
            </div>

            <div className="h-px bg-gray-800"></div>

            {/* Contextual Options */}
            <div className="space-y-3 min-h-[100px]">
              {(mode !== 'Translate') && (
                <div className="animate-fade-in space-y-3">
                  {/* Vibe Selector (Common) */}
                  <div>
                      <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Target Vibe / Style</label>
                      <select 
                        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      >
                        <option value="Match Original Tone">✨ Match Original Tone (Analyze & Preserve)</option>
                        <option value="Engaging & Conversational">Engaging & Conversational</option>
                        <option value="Storyteller (Deep & Emotional)">Storyteller (Deep & Emotional)</option>
                        <option value="Explainer (Clear & Simple)">Explainer (Clear & Simple)</option>
                        <option value="Energetic Vlog">Energetic Vlog</option>
                        <option value="Professional & Trustworthy">Professional & Trustworthy</option>
                        <option value="Funny & Witty">Funny & Witty</option>
                        <option value="Empathetic & Soft">Empathetic & Soft</option>
                      </select>
                  </div>

                  {/* Word Count Input (Common) */}
                  <div>
                      <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Target Word Count</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        placeholder="e.g. 1500"
                        value={wordCount}
                        onChange={(e) => setWordCount(e.target.value)}
                      />
                  </div>
                  
                  {/* OPTIONAL ENHANCEMENTS (Creative Mode Only) */}
                  {mode === 'Creative' && (
                    <div className="animate-fade-in p-3 bg-gray-900 border border-yellow-500/30 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-yellow-500">
                          <Settings className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase">Optional Enhancements</span>
                      </div>
                      
                      {/* Feature A: Split Hook & Intro */}
                      <div className="space-y-3">
                          {/* Checkbox 1: Professional Hook */}
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={addHook}
                              onChange={(e) => setAddHook(e.target.checked)}
                              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Add Professional Hook</span>
                          </label>

                          {/* Checkbox 2: Channel Intro */}
                          <div>
                            <label className="flex items-center gap-2 cursor-pointer group mb-2">
                                <input 
                                type="checkbox" 
                                checked={addIntro}
                                onChange={(e) => setAddIntro(e.target.checked)}
                                className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 bg-gray-800 border-gray-600"
                                />
                                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Add Channel Intro</span>
                            </label>
                            
                            {/* Conditional Input */}
                            {addIntro && (
                                <div className="animate-fade-in pl-6">
                                <input 
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg p-2 focus:ring-1 focus:ring-yellow-500 outline-none placeholder-gray-500"
                                    placeholder="Your Channel Name"
                                    value={channelName}
                                    onChange={(e) => setChannelName(e.target.value)}
                                />
                                </div>
                            )}
                          </div>
                      </div>

                      {/* Feature B: Auto-Change Functionality */}
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={autoChangeNames}
                              onChange={(e) => setAutoChangeNames(e.target.checked)}
                              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Auto-Change Names</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={autoChangeAges}
                              onChange={(e) => setAutoChangeAges(e.target.checked)}
                              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Auto-Change Ages</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={autoChangeLocations}
                              onChange={(e) => setAutoChangeLocations(e.target.checked)}
                              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 bg-gray-800 border-gray-600"
                            />
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Auto-Change Locations</span>
                          </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'Translate' && (
                <div className="animate-fade-in">
                  <label className="text-xs font-bold text-gray-400 mb-2 block uppercase">Select Language</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer for Action Button */}
          <div className="p-6 border-t border-gray-800 bg-gray-900/50 z-10">
            <button
              onClick={handleRewrite}
              disabled={isRewriting || !script}
              className={`
                w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                ${isRewriting ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl'}
                ${mode === 'Creative' ? 'bg-gradient-to-r from-yellow-600 to-orange-500 shadow-yellow-900/20' :
                  mode === 'Humanize' ? 'bg-gradient-to-r from-red-600 to-orange-600 shadow-red-900/20' : 
                  mode === 'Translate' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 
                  'bg-green-600'}
              `}
            >
              {isRewriting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 
              mode === 'Creative' ? <Lightbulb className="w-5 h-5" /> : 
              <Wand2 className="w-5 h-5" />}
              
              {isRewriting ? 'Processing...' : 'Generate Rewrite'}
            </button>
          </div>

        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-gray-900 p-6 flex flex-col gap-4 relative">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Editor</h3>
            <div className="flex gap-2">
               {/* Download Script Button */}
               <button 
                 onClick={handleDownload}
                 disabled={!script}
                 className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-green-600 hover:text-white text-gray-300 rounded-lg border border-gray-700 transition-colors text-xs font-bold disabled:opacity-50"
                 title="Download Script (.txt)"
               >
                 <Download className="w-3.5 h-3.5" />
                 Download Script
               </button>
               <button 
                 onClick={() => onUpdateScript('')}
                 className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                 title="Clear Script"
               >
                 <Eraser className="w-4 h-4" />
               </button>
               <button 
                 onClick={copyToClipboard}
                 className="p-2 text-gray-500 hover:text-white transition-colors"
                 title="Copy to Clipboard"
               >
                 <Copy className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          <textarea 
            className="flex-1 w-full bg-gray-800/50 border border-gray-800 rounded-xl p-6 text-lg text-gray-200 resize-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none placeholder-gray-600 font-sans leading-relaxed custom-scrollbar"
            placeholder="Paste your script here..."
            value={script}
            onChange={(e) => onUpdateScript(e.target.value)}
          ></textarea>

          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-800">
             <div className="flex gap-4">
               <span>{script.split(/\s+/).filter(w => w.length > 0).length} words</span>
               <span>{script.length} chars</span>
             </div>
             {script.length > 0 && (
                <span className="flex items-center gap-1 text-primary-400">
                  <ArrowRight className="w-3 h-3" /> Ready
                </span>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ScriptRewriter;
