
import React, { useState, useEffect } from 'react';
import { PenTool, Sparkles, BookOpen, Copy, CheckCircle2, Eraser, Youtube, Download, AlignLeft, Hash, Globe, Video, FileText, AlertTriangle, AlertCircle, ArrowRight, Image as ImageIcon, Type, Monitor } from 'lucide-react';
import { generateStoryScript, continueStoryScript } from '../services/geminiService';

// Channel Configuration Object
const CHANNELS: Record<string, {
  type: 'STORY' | 'FACTORY' | 'PSYCH' | 'CRIME';
  lang: 'English' | 'Spanish';
  inputs: {
    titleLabel: string;
    refLabel: string;
    countLabel: string; 
  };
  showTone: boolean;
  toneLabel?: string; 
  showTitle?: boolean; 
  showCrimeCategory?: boolean; 
  showOpeningStyle?: boolean; 
  hideReference?: boolean; // New flag to hide reference input
  hasImagePrompts: boolean;
  defaultTone: string;
  tones: string[];
}> = {
  // Channel 1: Deep Logic Applied (Thumbnail Auto-Gen)
  "Aunt Mae's Fireside Stories": {
    type: 'STORY',
    lang: 'English',
    inputs: { titleLabel: "Story Title (e.g. The Day My Family Forgot Me)", refLabel: "", countLabel: "Target Word Count (No Limit)" },
    showTone: true,
    showTitle: true,
    hideReference: true, // HIDE REFERENCE FIELD
    hasImagePrompts: false, // Internal logic handles thumbnail now
    defaultTone: "Family Drama",
    tones: [
      "Family Drama",
      "Regret", 
      "Forgiveness", 
      "Hidden Truth", 
      "Reunion", 
      "Emotional Realization", 
      "Sadness & Nostalgia",
      // New Tones (Appended as requested)
      "Secret / Unspoken Truth",
      "Twist / Shocking Reveal",
      "Revenge / Karma ( প্রতিশোধ )",
      "Dramatic & Intense",
      "Mystery ( Rohosso )",
      "Suspense / Thriller",
      "Heart-Breaking ( Painful )",
      "Heart-Touching ( Emotional )",
      "Confessional",
      "Eerie & Haunting",
      "Motivational & Inspirational",
      "Empathetic & Gentle",
      "Friendly & Casual"
    ]
  },
  // Channel 2: Factory Logic Preserved
  "NexShift Factory Zone": {
    type: 'FACTORY',
    lang: 'English',
    inputs: { titleLabel: "Factory Topic Name", refLabel: "Technical Details / Process Steps", countLabel: "Number of Prompts Needed" },
    showTone: false,
    showTitle: true,
    hasImagePrompts: false,
    defaultTone: "Cinematic & Industrial",
    tones: ["Cinematic & Industrial"]
  },
  // Channel 3: Spanish Psych/Doctor Logic
  "Relatos del Espíritu Libre": {
    type: 'PSYCH',
    lang: 'Spanish',
    inputs: { titleLabel: "Tema / Título", refLabel: "Referencia de Estilo", countLabel: "Palabras Objetivo (Sin Límite)" },
    showTone: true,
    showTitle: true,
    hasImagePrompts: false,
    defaultTone: "Voz Médica y Autoridad / Doctor Voice & Authority",
    tones: [
      "Voz Médica y Autoridad / Doctor Voice & Authority",
      "Reflexivo / Reflective",
      "Motivacional / Motivational",
      "Clínico y Profesional / Clinical & Professional",
      "Suave y Calmado / Gentle & Calm",
      "Empático / Empathetic"
    ]
  },
  // Channel 4: Story Mission Logic Preserved
  "Story Mission Forever": {
    type: 'STORY',
    lang: 'English',
    inputs: { titleLabel: "Story Title", refLabel: "Sample/Style Reference (Optional)", countLabel: "Target Word Count (No Limit)" },
    showTone: true,
    showTitle: true,
    hasImagePrompts: true, 
    defaultTone: "Suspenseful",
    tones: ["Suspenseful", "Adventurous", "Mystery", "Dramatic"]
  },
  // Channel 5: Deep Logic Applied
  "Untold Mysteries Cases": {
    type: 'CRIME',
    lang: 'English',
    inputs: { 
      titleLabel: "Case Title", 
      refLabel: "Case Facts & Timeline (Paste raw facts, dates, names, police report info here).", 
      countLabel: "Target Word Count (No Limit)" 
    },
    showTone: false, 
    showTitle: false, 
    showCrimeCategory: true,
    showOpeningStyle: false, 
    hasImagePrompts: false,
    defaultTone: "Dark & Gritty",
    tones: []
  }
};

const CRIME_CATEGORIES = [
  "Missing Person", 
  "Unsolved Mystery", 
  "Cold Case", 
  "Murder Investigation"
];

const OPENING_STYLES = [
  "Atmospheric Opening (Cedar Hollow Style)",
  "911 Call / Emergency Start",
  "The Perfect Day Twist"
];

const StoryWriter: React.FC = () => {
  // State
  const [selectedChannel, setSelectedChannel] = useState<string>("Aunt Mae's Fireside Stories");
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('');
  const [count, setCount] = useState<number>(2000); 
  const [reference, setReference] = useState('');
  
  // Specific State for Crime Channel
  const [crimeCategory, setCrimeCategory] = useState(CRIME_CATEGORIES[0]);
  const [openingStyle, setOpeningStyle] = useState(OPENING_STYLES[0]);
  
  // Output State
  const [generatedScript, setGeneratedScript] = useState('');
  
  // Expanded Metadata State for Channel 1 (Hook-Centric)
  const [imagePrompt, setImagePrompt] = useState('');
  const [storyTheme, setStoryTheme] = useState(''); // New Story Theme State
  const [promptCopyStatus, setPromptCopyStatus] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  // Load defaults when channel changes
  useEffect(() => {
    const config = CHANNELS[selectedChannel];
    setTone(config.defaultTone);
    setCount(config.type === 'FACTORY' ? 50 : 2000); 
    setReference('');
    setTitle('');
    if (config.type === 'CRIME') {
        setCrimeCategory(CRIME_CATEGORIES[0]);
        setOpeningStyle(OPENING_STYLES[0]);
    }
    // Clear outputs on channel switch
    setGeneratedScript('');
    setImagePrompt('');
    setStoryTheme('');
  }, [selectedChannel]);

  const config = CHANNELS[selectedChannel];

  // Helper for word count
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const parseResponse = (fullResponse: string) => {
    // New Split Logic specifically for Channel 1 Thumbnail fix
    const separator = "|||THUMBNAIL_SPLIT|||";
    if (fullResponse.includes(separator)) {
      const [scriptPart, promptPart] = fullResponse.split(separator);
      setGeneratedScript(scriptPart.trim());
      // Directly assign the text after split as the prompt
      setImagePrompt(promptPart.trim());
    } else {
      setGeneratedScript(fullResponse.trim());
    }
  };

  const handleGenerate = async () => {
    // Validation Logic
    if (config.showTitle !== false && !title) {
      alert("Please enter a Title/Topic.");
      return;
    }
    
    // Strict requirement for reference in Channel 5
    if (config.type === 'CRIME' && !reference.trim()) {
      alert("Please provide the Case Facts & Timeline to generate the script.");
      return;
    }

    setIsGenerating(true);
    setGeneratedScript('');
    setImagePrompt('');
    
    try {
      const response = await generateStoryScript({
        channelName: selectedChannel,
        channelType: config.type,
        lang: config.lang,
        title: title || "Untitled Case", // Fallback for API
        tone: config.showTone ? tone : config.defaultTone,
        count,
        // Pass storyTheme as reference for Channel 1
        reference: selectedChannel === "Aunt Mae's Fireside Stories" ? storyTheme : reference,
        hasImagePrompts: config.hasImagePrompts,
        // Specific params
        crimeCategory: config.type === 'CRIME' ? crimeCategory : undefined,
        openingStyle: config.type === 'CRIME' ? openingStyle : undefined
      });

      parseResponse(response);

    } catch (error) {
      console.error(error);
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!generatedScript) return;
    setIsGenerating(true);
    
    const currentWordCount = getWordCount(generatedScript);
    
    // Get last paragraph or chunk for context (Use original full script for context)
    const paragraphs = generatedScript.split('\n\n');
    const lastPara = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : generatedScript.slice(-500);
    
    try {
       // Pass word counts for smart completion
       const newText = await continueStoryScript(lastPara, selectedChannel, currentWordCount, count);
       
       // Handle asset split on continuation as well if it appears at the end
       const separator = "|||THUMBNAIL_SPLIT|||";
       let scriptToAdd = newText;
       
       if (newText.includes(separator)) {
         const [scriptPart, promptPart] = newText.split(separator);
         scriptToAdd = scriptPart;
         setImagePrompt(promptPart.trim());
       }

       setGeneratedScript(prev => prev + "\n\n" + scriptToAdd.trim());

    } catch (e) {
       console.error(e);
       alert("Failed to continue generation.");
    } finally {
       setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(imagePrompt);
    setPromptCopyStatus(true);
    setTimeout(() => setPromptCopyStatus(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedChannel.replace(/\s+/g, '_')}_${(title || 'Script').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentWordCount = getWordCount(generatedScript);
  const isTargetReached = config.type !== 'FACTORY' && currentWordCount >= count;

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
             <BookOpen className="text-green-500" />
             AI Story & Script Writer
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Logic Profile: <span className="text-white font-bold">{selectedChannel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
           <Globe className="w-4 h-4 text-blue-400" />
           <span className="text-xs font-bold text-gray-300">
             Output: {config.lang === 'Spanish' ? '🇪🇸 Spanish' : '🇺🇸 English'}
           </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Inputs */}
        <div className="w-full lg:w-[450px] bg-gray-850 p-6 border-r border-gray-800 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Channel Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Youtube className="w-4 h-4" /> Select Channel Profile
            </label>
            <div className="relative">
              <select 
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white font-bold shadow-sm focus:ring-2 focus:ring-green-500 outline-none appearance-none"
              >
                {Object.keys(CHANNELS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <AlignLeft className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            
            {/* Logic Badge */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                 config.type === 'FACTORY' ? 'bg-blue-900/30 border-blue-500 text-blue-300' :
                 config.type === 'CRIME' ? 'bg-red-900/30 border-red-500 text-red-300' :
                 config.type === 'PSYCH' ? 'bg-purple-900/30 border-purple-500 text-purple-300' :
                 selectedChannel === "Aunt Mae's Fireside Stories" ? 'bg-green-900/30 border-green-500 text-green-300' : 
                 'bg-yellow-900/30 border-yellow-500 text-yellow-300'
              }`}>
                 {config.type === 'FACTORY' ? '3D FACTORY PROMPTS' : 
                  config.type === 'CRIME' ? 'TRUE CRIME DOCU' : 
                  config.type === 'PSYCH' ? 'MEDICAL / PSYCHOLOGY' : 
                  selectedChannel === "Aunt Mae's Fireside Stories" ? 'HOOK-CENTRIC VIRAL NARRATIVE' : 'STORYTELLING'}
              </span>
            </div>
          </div>

          <div className="h-px bg-gray-800"></div>

          {/* Dynamic Input Grid */}
          <div className="space-y-5 animate-fade-in">
             
             {/* Title Input - CONDITIONAL RENDERING */}
             {config.showTitle !== false && (
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1">{config.inputs.titleLabel}</label>
                 <input 
                   type="text"
                   placeholder="Enter title here..."
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 outline-none
                      ${config.type === 'CRIME' ? 'focus:ring-red-500' : 'focus:ring-green-500'}
                   `}
                 />
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                
                {/* Crime Category Selector */}
                {config.showCrimeCategory && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Case Category</label>
                    <select 
                      value={crimeCategory}
                      onChange={(e) => setCrimeCategory(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Opening Style Selector */}
                {config.showOpeningStyle && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Opening Style</label>
                    <select 
                      value={openingStyle}
                      onChange={(e) => setOpeningStyle(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      {OPENING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* Tone Selector */}
                {config.showTone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{config.toneLabel || "Tone / Mood"}</label>
                    <select 
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 outline-none
                        ${config.type === 'CRIME' ? 'focus:ring-red-500' : 'focus:ring-green-500'}
                      `}
                    >
                      {config.tones.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}

                {/* Count Input - UNLOCKED LIMIT */}
                <div className={!config.showTone ? "col-span-2" : ""}>
                   <label className="block text-sm font-medium text-gray-300 mb-1">{config.inputs.countLabel}</label>
                   <input 
                     type="number"
                     min="500"
                     max="150000"
                     value={count}
                     onChange={(e) => setCount(parseInt(e.target.value))}
                     className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 outline-none
                        ${config.type === 'CRIME' ? 'focus:ring-red-500' : 'focus:ring-green-500'}
                     `}
                   />
                   <p className="text-[10px] text-gray-500 mt-1.5 italic">
                     Note: For very high counts (10k+), use the Long-Form 'Part-by-Part' generator.
                   </p>
                </div>
             </div>

             {/* Reference / Details Area - HIDDEN FOR CHANNEL 1 */}
             {!config.hideReference && (
               <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center justify-between">
                     {config.inputs.refLabel}
                     {config.type === 'CRIME' && <span className="text-xs text-red-400 font-bold">Facts Required</span>}
                  </label>
                  <textarea 
                    placeholder={
                      config.type === 'FACTORY' ? "Describe the manufacturing steps..." : 
                      config.type === 'CRIME' ? "Paste timeline, police report details, and evidence summary here. The AI will extract the story and deduce the resolution." : 
                      "Paste reference content or style notes..."
                    }
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={`w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:ring-2 outline-none custom-scrollbar
                       ${config.type === 'CRIME' ? 'focus:ring-red-500' : 'focus:ring-green-500'}
                    `}
                  ></textarea>
               </div>
             )}

             {/* NEW: Thumbnail Prompt Box for Channel 1 */}
             {selectedChannel === "Aunt Mae's Fireside Stories" && (
                <div className="flex-1 flex flex-col mt-4">
                   <div className="flex justify-between items-center mb-1">
                      <label className="text-sm font-medium text-purple-300 flex items-center gap-2">
                         <ImageIcon className="w-4 h-4" /> 🎨 Generated Thumbnail Prompt
                      </label>
                      <button 
                        onClick={copyPrompt}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Copy Prompt"
                      >
                        {promptCopyStatus ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                   </div>
                   <textarea 
                     readOnly
                     value={imagePrompt}
                     placeholder="Thumbnail prompt and analysis will appear here after generation..."
                     className="w-full h-32 bg-gray-900 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-100 font-mono resize-none focus:ring-2 focus:ring-purple-500 outline-none custom-scrollbar"
                   />
                </div>
             )}

             {/* HOOK-CENTRIC VIRAL ASSET SUITE - CHANNEL 1 ONLY */}
             {selectedChannel === "Aunt Mae's Fireside Stories" && (
                <div className="mt-4 mb-2 animate-fade-in space-y-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-green-500" /> Story Command Center
                   </h4>

                   {/* NEW: Story Theme Input (Replaces Title/Overlay Boxes) */}
                   <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Story Theme / Plot Command</label>
                      <textarea
                        value={storyTheme}
                        onChange={(e) => setStoryTheme(e.target.value)}
                        placeholder="Describe what the story is about... (e.g., A mother gets revenge on her greedy son, emotional ending...)"
                        className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:ring-2 focus:ring-green-500 outline-none custom-scrollbar"
                      />
                   </div>
                </div>
             )}

             {/* Generate Button */}
             <button 
                onClick={handleGenerate}
                disabled={isGenerating || (config.showTitle !== false && !title)}
                className={`w-full py-4 font-bold text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2
                   ${config.type === 'FACTORY' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 
                     config.type === 'CRIME' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 
                     config.type === 'PSYCH' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 
                     'bg-green-600 hover:bg-green-500 shadow-green-900/20'}
                `}
              >
                 {isGenerating ? <PenTool className="animate-spin" /> : config.type === 'CRIME' ? <AlertCircle className="fill-current" /> : <Sparkles className="fill-current" />}
                 {isGenerating ? (config.type === 'FACTORY' ? 'Processing List...' : 'Writing Script...') : (config.type === 'FACTORY' ? 'Generate Prompts' : 'Generate Script')}
              </button>

          </div>

        </div>

        {/* Right Panel: Output */}
        <div className="flex-1 bg-gray-900 p-6 flex flex-col relative overflow-hidden">
           
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-gray-200">Generated Content</h3>
                {generatedScript && (
                  <span className="text-xs font-mono text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-800">
                    📝 Words: {currentWordCount} / {count} | 🔤 Chars: {generatedScript.length}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => { setGeneratedScript(''); setImagePrompt(''); setStoryTheme(''); }}
                   className="p-2 text-gray-500 hover:text-white transition-colors"
                   title="Clear"
                 >
                   <Eraser className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={handleDownload}
                   disabled={!generatedScript}
                   className="p-2 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                   title="Download"
                 >
                   <Download className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={copyToClipboard}
                   disabled={!generatedScript}
                   className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
                 >
                    {copyStatus ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copyStatus ? 'Copied' : 'Copy'}
                 </button>
              </div>
           </div>

           <div className="relative flex-1 flex flex-col overflow-y-auto custom-scrollbar">
             <textarea 
               value={generatedScript}
               onChange={(e) => setGeneratedScript(e.target.value)}
               placeholder={isGenerating ? "AI is crafting your specific content..." : "Your generated script will appear here."}
               className={`w-full min-h-[500px] bg-gray-950/50 border border-gray-800 rounded-xl p-6 text-lg text-gray-200 resize-none focus:ring-2 outline-none leading-relaxed font-serif mb-4
                  ${config.type === 'FACTORY' ? 'focus:ring-blue-500/50 focus:border-blue-500' : 
                    config.type === 'CRIME' ? 'focus:ring-red-500/50 focus:border-red-500' :
                    config.type === 'PSYCH' ? 'focus:ring-purple-500/50 focus:border-purple-500' :
                    'focus:ring-green-500/50 focus:border-green-500'}
               `}
             ></textarea>
             
             {/* Smart Completion Control Overlay */}
             {generatedScript && !isGenerating && config.type !== 'FACTORY' && (
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-10 pointer-events-none">
                   <div className="pointer-events-auto">
                    {isTargetReached ? (
                      <div className="flex flex-col items-end gap-1">
                          <button 
                            disabled
                            className="px-5 py-2.5 bg-green-800/90 border border-green-500/50 text-green-100 font-bold rounded-lg shadow-xl flex items-center gap-2 backdrop-blur-md cursor-not-allowed opacity-90 hover:opacity-100 transition-opacity"
                          >
                            <CheckCircle2 className="w-5 h-5" /> ✅ Target Reached (Completed)
                          </button>
                          <button 
                            onClick={handleContinue}
                            className="text-xs text-gray-500 hover:text-white underline mt-1 px-2"
                            title="Force the AI to write more anyway"
                          >
                            Force Continue (Override)
                          </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleContinue}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-blue-500/25"
                      >
                          <ArrowRight className="w-5 h-5" /> Continue Writing...
                      </button>
                    )}
                   </div>
                </div>
             )}
           </div>

           {isGenerating && (
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-600 shadow-2xl flex flex-col items-center max-w-sm text-center">
                   <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 border-4 border-gray-600 rounded-full"></div>
                      <div className={`absolute inset-0 border-4 rounded-full border-t-transparent animate-spin
                         ${config.type === 'FACTORY' ? 'border-blue-500' : 
                           config.type === 'CRIME' ? 'border-red-500' : 
                           config.type === 'PSYCH' ? 'border-purple-500' : 'border-green-500'}
                      `}></div>
                      <PenTool className={`absolute inset-0 m-auto w-6 h-6 animate-pulse
                         ${config.type === 'FACTORY' ? 'text-blue-500' : 
                           config.type === 'CRIME' ? 'text-red-500' : 
                           config.type === 'PSYCH' ? 'text-purple-500' : 'text-green-500'}
                      `} />
                   </div>
                   <h3 className="text-lg font-bold text-white mb-1">
                      {config.type === 'FACTORY' ? 'Building Production List...' : 
                       config.type === 'CRIME' ? 'Analyzing Evidence...' : 
                       config.type === 'PSYCH' ? 'Generating Therapy Script...' : 'Weaving Story...'}
                   </h3>
                   <p className="text-xs text-gray-400">
                      Applying logic for: <span className="text-white font-bold">{selectedChannel}</span>
                   </p>
                </div>
             </div>
           )}

        </div>

      </div>
    </div>
  );
};

export default StoryWriter;
