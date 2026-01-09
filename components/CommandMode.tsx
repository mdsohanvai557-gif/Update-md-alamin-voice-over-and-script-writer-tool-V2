
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, Copy, CheckCircle2, Bot, User, Youtube, Layers, Zap, FastForward, RefreshCw, EyeOff, MessageSquare, BookOpen, FileText, Hash, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { sendChatCommand } from '../services/geminiService';

const CHANNEL_OPTIONS = [
  "Aunt Mae's Fireside Stories",
  "NexShift Factory Zone",
  "Relatos del Espíritu Libre",
  "Story Mission Forever",
  "Untold Mysteries Cases"
];

interface Message {
  role: 'user' | 'model';
  text: string;
  isHidden?: boolean; // New flag to hide technical commands from UI
}

const CommandMode: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Ready. Script Generation Engine Active.\nWaiting for input..." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loopProgress, setLoopProgress] = useState<{ current: number, target: number } | null>(null);
  
  // Sidebar State
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_OPTIONS[0]);
  
  // New: Script Mode Toggle
  const [isScriptMode, setIsScriptMode] = useState(false);
  const [wordCount, setWordCount] = useState<number>(4500); 
  const [stealthContext, setStealthContext] = useState(''); 
  
  const [copyStatus, setCopyStatus] = useState<number | null>(null);
  const [clearStatus, setClearStatus] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loopProgress]);

  // Helper to count words
  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;

  // The Core Recursive Logic
  const executeRecursiveCommand = async (initialPrompt: string, isRewrite: boolean = false, isManualContinue: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);
    
    // Only set loop progress if we are in Script Mode (enforcing length)
    if (isScriptMode) {
      setLoopProgress({ current: 0, target: wordCount });
    } else {
      setLoopProgress(null);
    }

    // 1. Setup Initial State
    let currentUiMessages = [...messages];
    
    // API History Stack
    let apiHistory = currentUiMessages
        .filter(m => !m.isHidden)
        .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

    let accumulatedText = "";

    if (isRewrite) {
        if (currentUiMessages[currentUiMessages.length - 1].role === 'model') {
            currentUiMessages.pop();
        }
        apiHistory = currentUiMessages.map(m => ({ role: m.role, parts: [{ text: m.text }]}));
        setMessages(currentUiMessages);
    } else if (isManualContinue) {
        const lastMsg = currentUiMessages[currentUiMessages.length - 1];
        if (lastMsg.role === 'model') {
            accumulatedText = lastMsg.text;
        }
    } else {
        currentUiMessages.push({ role: 'user', text: initialPrompt, isHidden: false });
        setMessages(currentUiMessages);
    }

    const MAX_LOOPS = 15; 
    let loopCount = 0;
    
    // Determine effective target. If NOT in script mode, we pass 0 to API to indicate "No Limit/Natural Chat"
    const effectiveWordTarget = isScriptMode ? wordCount : 0;

    try {
        let isComplete = false;

        while (!isComplete && loopCount < MAX_LOOPS) {
            // A. Construct the Prompt for this Turn
            let currentPrompt = "";

            if (loopCount === 0 && !isManualContinue) {
                currentPrompt = initialPrompt;
            } else {
                currentPrompt = `[SYSTEM COMMAND]: Continue the narrative exactly where you left off. Do NOT repeat the last sentence. Do NOT write metadata like "Part 2". Just flow directly into the next narrative paragraph. Maintain the tone. Maximize output length.`;
            }

            // B. Call API
            const responseChunk = await sendChatCommand(
                apiHistory, 
                currentPrompt, 
                selectedChannel, 
                effectiveWordTarget, // Pass 0 if chat mode, specific number if script mode
                stealthContext
            );

            // C. Append Response
            accumulatedText += (accumulatedText && !accumulatedText.endsWith('\n') ? "\n" : "") + responseChunk;
            const currentTotalWords = getWordCount(accumulatedText);
            
            if (isScriptMode) {
                setLoopProgress({ current: currentTotalWords, target: wordCount });
            }

            // D. Update UI seamlessly
            setMessages(prev => {
                const newMsgs = [...prev];
                
                if (loopCount === 0 && !isManualContinue && !isRewrite) {
                     if (newMsgs[newMsgs.length - 1].role !== 'model') {
                         newMsgs.push({ role: 'model', text: "" });
                     }
                }
                
                const lastMsgIndex = newMsgs.length - 1;
                if (newMsgs[lastMsgIndex]?.role === 'model') {
                    newMsgs[lastMsgIndex] = { ...newMsgs[lastMsgIndex], text: accumulatedText };
                } else {
                    newMsgs.push({ role: 'model', text: accumulatedText });
                }
                return newMsgs;
            });

            // E. Update API History
            apiHistory.push({ role: 'user', parts: [{ text: currentPrompt }] });
            apiHistory.push({ role: 'model', parts: [{ text: responseChunk }] });

            // F. Check Loop Condition
            if (!isScriptMode) {
                // If we are in Chat Mode, we stop after 1 response. No looping.
                isComplete = true;
            } else if (isManualContinue) {
                // Manual continue = 1 loop only
                isComplete = true; 
            } else {
                // Script Mode: Auto-Loop Logic
                if (currentTotalWords >= wordCount) {
                    isComplete = true;
                } else {
                    loopCount++;
                    await new Promise(r => setTimeout(r, 800));
                }
            }
        }

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: `\n[SYSTEM ERROR]: Generation stopped due to network or API limit. \nText saved above.` }]);
    } finally {
        setIsLoading(false);
        setLoopProgress(null);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    executeRecursiveCommand(text);
  };

  const handleContinue = () => {
    if (messages.length === 0 || isLoading) return;
    executeRecursiveCommand("", false, true);
  };

  const handleRewrite = () => {
    if (messages.length < 2 || isLoading) return;
    const lastModelIndex = messages.length - 1;
    if (messages[lastModelIndex].role !== 'model') return;
    const previousUserMsg = messages[lastModelIndex - 1];
    if (!previousUserMsg) return;
    executeRecursiveCommand(previousUserMsg.text, true, false);
  };

  const handleClear = () => {
    if (window.confirm("Clear entire conversation history?")) {
      setMessages([{ role: 'model', text: "History cleared. Script Engine Ready." }]);
      setClearStatus(true);
      setTimeout(() => setClearStatus(false), 3000);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(index);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const visibleMessages = messages.filter(m => !m.isHidden);

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
             <Terminal className="text-blue-500" />
             Pro Command Studio
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Max-Capacity Generation Engine (Auto-Looping enabled).
          </p>
        </div>
        <div className="flex items-center gap-2">
           {clearStatus && (
             <span className="text-xs text-green-500 font-bold animate-fade-in flex items-center gap-1 mr-2">
               <CheckCircle2 className="w-3 h-3" /> Cleared
             </span>
           )}
           <button 
             onClick={handleClear}
             className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-gray-700 rounded-lg text-xs font-bold transition-all"
           >
             <Trash2 className="w-4 h-4" /> Clear History
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Configuration */}
        <div className="w-full lg:w-80 bg-gray-850 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto custom-scrollbar">
           
           {/* Channel Context */}
           <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
               <Youtube className="w-4 h-4" /> Channel Context
             </label>
             <select 
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
             >
               {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           {/* Script Mode Toggle (New) */}
           <div className="space-y-4 pt-4 border-t border-gray-800">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsScriptMode(!isScriptMode)}
              >
                 <label className="text-sm font-bold text-gray-300 cursor-pointer group-hover:text-white flex items-center gap-2">
                    {isScriptMode ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 border-2 border-gray-600 rounded-full"></div>}
                    Enforce Script Word Target
                 </label>
                 <div className={`transition-colors ${isScriptMode ? 'text-green-500' : 'text-gray-600'}`}>
                    {isScriptMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                 </div>
              </div>

              {/* Conditional Word Count Input */}
              {isScriptMode && (
                <div className="space-y-2 animate-fade-in pl-2 border-l-2 border-green-500/50">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Max Word Limit
                  </label>
                  <input 
                    type="number"
                    min="100"
                    placeholder="e.g., 120000 (No Limit)"
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 italic">
                    *Enter ANY amount. System will loop until reached.
                  </p>
                </div>
              )}
           </div>

           {/* Quick Actions */}
           <div className="space-y-3 pt-4 border-t border-gray-800">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                 <Zap className="w-4 h-4" /> Quick Actions
              </label>
              
              <div className="flex flex-col gap-2">
                 <button 
                   onClick={handleContinue}
                   disabled={isLoading || messages.length < 2}
                   className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-500/20"
                 >
                    {isLoading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <FastForward className="w-4 h-4 fill-current" />}
                    Next Part / Continue
                 </button>

                 <button 
                   onClick={handleRewrite}
                   disabled={isLoading || messages.length < 2}
                   className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl border border-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <RefreshCw className="w-4 h-4" />
                    Rewrite Last Output
                 </button>
              </div>
           </div>

        </div>

        {/* Right Panel: Chat Interface */}
        <div className="flex-1 bg-gray-900 flex flex-col relative overflow-hidden">
           
           {/* Chat History */}
           <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {visibleMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   
                   {msg.role === 'model' && (
                     <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-8 shadow-lg shadow-blue-900/50">
                        <Bot className="w-5 h-5 text-white" />
                     </div>
                   )}

                   <div className={`
                      relative flex flex-col shadow-lg
                      ${msg.role === 'user' ? 'max-w-[80%]' : 'w-full max-w-[95%]'}
                   `}>
                      
                      {/* UTILITY TOOLBAR (Sticky Top for Model) */}
                      {msg.role === 'model' && (
                        <div className="flex items-center justify-between bg-gray-800 border-x border-t border-gray-700 rounded-t-xl px-4 py-2 text-xs font-mono text-gray-400 select-none sticky top-0 z-10">
                           <div className="flex gap-4">
                              <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                                 <FileText className="w-3.5 h-3.5 text-blue-400" />
                                 Words: <span className="text-white">{getWordCount(msg.text)}</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                                 <Hash className="w-3.5 h-3.5 text-purple-400" />
                                 Chars: <span className="text-white">{msg.text.length}</span>
                              </span>
                           </div>
                           <button 
                             onClick={() => handleCopy(msg.text, idx)}
                             className="flex items-center gap-1.5 px-3 py-1 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all text-gray-300 hover:text-white"
                           >
                              {copyStatus === idx ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  <span className="text-green-500 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Script</span>
                                </>
                              )}
                           </button>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={`
                         p-6 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-mono text-gray-300
                         ${msg.role === 'user' ? 'bg-gray-800 text-white border border-gray-700 rounded-2xl' : 'bg-gray-900/50 border-x border-b border-gray-700 rounded-b-xl border-t-0'}
                      `}>
                         {msg.text}
                      </div>

                   </div>

                   {msg.role === 'user' && (
                     <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-5 h-5 text-gray-300" />
                     </div>
                   )}

                </div>
              ))}
              
              {/* Loop Progress Indicator - ONLY if isScriptMode is active */}
              {isLoading && isScriptMode && loopProgress && (
                <div className="fixed bottom-24 right-8 bg-blue-900/90 text-white p-4 rounded-xl border border-blue-500/50 shadow-2xl backdrop-blur-md animate-fade-in z-20 max-w-sm">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold text-sm">Generating Script Loop...</span>
                   </div>
                   <div className="w-full bg-blue-950 rounded-full h-2 mb-2 overflow-hidden border border-blue-800">
                      <div 
                        className="bg-blue-400 h-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (loopProgress.current / loopProgress.target) * 100)}%` }}
                      ></div>
                   </div>
                   <div className="flex justify-between text-xs text-blue-200 font-mono">
                      <span>{loopProgress.current} words</span>
                      <span>Target: {loopProgress.target}</span>
                   </div>
                   <p className="text-[10px] text-blue-300 mt-2 italic">
                      Auto-looping active until target reached.
                   </p>
                </div>
              )}
              
              <div ref={messagesEndRef} />
           </div>

           {/* Input Area */}
           <div className="p-4 bg-gray-850 border-t border-gray-800">
              <div className="relative max-w-4xl mx-auto">
                 <textarea
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Enter your story prompt... (Shift+Enter for new line)"
                   className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-6 pr-14 py-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none shadow-xl custom-scrollbar"
                   rows={3}
                   disabled={isLoading}
                 />
                 <button 
                   onClick={handleSend}
                   disabled={!input.trim() || isLoading}
                   className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                 >
                    <Send className="w-5 h-5" />
                 </button>
              </div>
              <p className="text-center text-xs text-gray-600 mt-2 flex items-center justify-center gap-1">
                 <BookOpen className="w-3 h-3" />
                 Output is Clean Text (No Markdown/Bold). Ready for narration.
              </p>
           </div>

        </div>

      </div>
    </div>
  );
};

export default CommandMode;
