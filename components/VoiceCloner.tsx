
import React, { useState, useRef } from 'react';
import { Mic, Upload, Loader2, PlayCircle, CheckCircle, AlertCircle, Trash2, Sliders, Play, X, Check, Activity, BarChart3, Radio } from 'lucide-react';
import { analyzeVoiceSample, generateSpeech } from '../services/geminiService';
import { VoiceAnalysisResult, ArtistCategory } from '../types';
import { CATEGORIES } from '../constants';

interface Props {
  onCloneSuccess: (analysis: VoiceAnalysisResult) => void;
}

interface CloneItem extends VoiceAnalysisResult {
  isSaved?: boolean;
}

const VoiceCloner: React.FC<Props> = ({ onCloneSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cloned Voices List Management
  const [pendingClones, setPendingClones] = useState<CloneItem[]>([]);
  // Store the most recent result for the "Analysis Panel"
  const [latestAnalysis, setLatestAnalysis] = useState<CloneItem | null>(null);
  
  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number | null>(null);
  const [previewText, setPreviewText] = useState("Hello, this is a test of my new AI cloned voice.");
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [previewAudioContext, setPreviewAudioContext] = useState<AudioContext | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large. Max 5MB.");
        return;
      }
      setAudioBlob(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setIsAnalyzing(true);
    setError(null);
    setLatestAnalysis(null);
    try {
      const result = await analyzeVoiceSample(audioBlob);
      // Add default name, category, and cloning strength
      const newClone: CloneItem = {
        ...result,
        name: `Cloned Voice ${pendingClones.length + 1}`,
        category: ArtistCategory.Professional,
        cloningStrength: 100, // Default to 100% Fidelity
        isSaved: false
      };
      
      setLatestAnalysis(newClone);
      setPendingClones([newClone, ...pendingClones]);
      setAudioBlob(null); // Clear input after successful add
    } catch (err) {
      setError("Failed to analyze voice. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update fields in the table
  const updateClone = (index: number, field: keyof VoiceAnalysisResult, value: any) => {
    const updated = [...pendingClones];
    if (updated[index].isSaved) return; // Prevent editing if saved
    updated[index] = { ...updated[index], [field]: value };
    setPendingClones(updated);
  };

  const handleDelete = (index: number) => {
    const updated = [...pendingClones];
    updated.splice(index, 1);
    setPendingClones(updated);
    if (latestAnalysis && pendingClones[index]?.personaDescription === latestAnalysis.personaDescription) {
        setLatestAnalysis(null);
    }
  };

  const handleFinalize = (index: number) => {
    const clone = pendingClones[index];
    onCloneSuccess(clone);
    
    // Mark as saved instead of deleting
    const updated = [...pendingClones];
    updated[index] = { ...updated[index], isSaved: true };
    setPendingClones(updated);
  };

  // Preview Logic
  const openPreviewModal = (index: number) => {
    setActivePreviewIndex(index);
    setPreviewModalOpen(true);
  };

  const playPCMData = async (base64PCM: string) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setPreviewAudioContext(ctx);
    
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    
    const buffer = ctx.createBuffer(1, float32Data.length, 24000); 
    buffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const generatePreviewAudio = async () => {
    if (activePreviewIndex === null) return;
    const clone = pendingClones[activePreviewIndex];
    setIsPreviewGenerating(true);
    try {
      const base64 = await generateSpeech(
        previewText,
        clone.suggestedBaseVoice,
        'Neutral',
        clone.personaDescription,
        clone.language,
        'Normal',
        clone.cloningStrength || 100
      );
      await playPCMData(base64);
    } catch (err) {
      console.error(err);
      alert("Failed to generate preview.");
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  return (
    <div className="bg-gray-850 rounded-xl p-6 border border-gray-700 h-full overflow-y-auto flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Mic className="text-purple-500" /> 
          Voice Cloning Studio
        </h2>
        <p className="text-gray-400 text-sm">
          Upload or record a 10-30s sample. Gemini will analyze it and create a detailed persona. Manage and refine your clones below.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
        <div className="flex flex-col items-center gap-4">
            {!audioBlob ? (
              <>
              <div className="flex gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all
                    ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}
                  `}
                >
                  <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-gray-300'}`} />
                </button>
                <label className="w-16 h-16 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-gray-300" />
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-500">Record Mic or Upload Audio</p>
              </>
            ) : (
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-md mb-4">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="text-green-500" />
                    <span className="text-sm text-gray-300">Audio Sample Ready</span>
                  </div>
                  <button onClick={() => { setAudioBlob(null); }} className="text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </div>
                
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" /> : <Mic className="w-4 h-4" />}
                  {isAnalyzing ? 'Analyzing Voice DNA...' : 'Analyze & Generate Persona'}
                </button>
              </div>
            )}
        </div>
        {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
        )}
      </div>

      {/* Dynamic Analysis Results Panel */}
      {latestAnalysis && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-fade-in shadow-xl">
           <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
              <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                <Activity className="text-green-400 w-5 h-5" />
                Analysis Results
              </h3>
              <span className="text-xs text-gray-400">Analysis completed successfully</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Score Card */}
              <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-700">
                 <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                       <path
                          className="text-gray-700"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          className={`${latestAnalysis.matchConfidence > 80 ? 'text-green-500' : latestAnalysis.matchConfidence > 50 ? 'text-yellow-500' : 'text-red-500'}`}
                          strokeDasharray={`${latestAnalysis.matchConfidence}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                       <span className="text-xl font-bold text-white">{latestAnalysis.matchConfidence}%</span>
                    </div>
                 </div>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Match Potential</span>
              </div>

              {/* Quality Card */}
              <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col justify-center border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                     <BarChart3 className="text-purple-400 w-5 h-5" />
                     <span className="font-bold text-gray-200">Audio Quality</span>
                  </div>
                  <div className={`
                    text-lg font-bold px-3 py-1 rounded-md inline-block self-start
                    ${latestAnalysis.audioQuality === 'Excellent' ? 'bg-green-500/20 text-green-400' : 
                      latestAnalysis.audioQuality === 'Good' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                  `}>
                     {latestAnalysis.audioQuality}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {latestAnalysis.audioQuality === 'Excellent' ? 'Clear, crisp audio detected. Perfect for cloning.' :
                     latestAnalysis.audioQuality === 'Good' ? 'Acceptable quality. Some minor noise present.' : 
                     'Significant background noise or echo. Consider re-recording.'}
                  </p>
              </div>

              {/* Characteristics Card */}
              <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col justify-center border border-gray-700">
                 <div className="flex items-center gap-2 mb-3">
                    <Radio className="text-blue-400 w-5 h-5" />
                    <span className="font-bold text-gray-200">Voice Profile</span>
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Pitch</span>
                       <span className="text-white font-medium">{latestAnalysis.detectedPitch}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Pace</span>
                       <span className="text-white font-medium">{latestAnalysis.detectedPace}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Accent</span>
                       <span className="text-white font-medium truncate max-w-[100px]">{latestAnalysis.accent}</span>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Management Table */}
      {pendingClones.length > 0 && (
        <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-800 bg-gray-850 flex items-center justify-between">
             <h3 className="font-bold text-white flex items-center gap-2">
               <Sliders className="w-4 h-4 text-purple-400" /> Generated Personas
             </h3>
             <span className="text-xs text-gray-500">Edit details before finalizing</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="p-4 border-b border-gray-700 w-16">SL No.</th>
                  <th className="p-4 border-b border-gray-700 w-48">Artist Name</th>
                  <th className="p-4 border-b border-gray-700 w-32">Tone</th>
                  <th className="p-4 border-b border-gray-700 w-24">Lang</th>
                  <th className="p-4 border-b border-gray-700 w-40">Category</th>
                  <th className="p-4 border-b border-gray-700 w-24">Gender</th>
                  <th className="p-4 border-b border-gray-700 w-48">Cloning Strength</th>
                  <th className="p-4 border-b border-gray-700 text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingClones.map((clone, idx) => (
                  <tr key={idx} className={`border-b border-gray-800 transition-colors ${clone.isSaved ? 'bg-green-900/10' : 'hover:bg-gray-800/50'}`}>
                    <td className="p-4 text-gray-500 font-mono text-sm">#{idx + 1}</td>
                    
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={clone.name || ''}
                        disabled={clone.isSaved}
                        onChange={(e) => updateClone(idx, 'name', e.target.value)}
                        className={`bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-white w-full focus:ring-1 focus:ring-purple-500 outline-none ${clone.isSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </td>

                    <td className="p-4">
                       <input 
                        type="text" 
                        value={clone.tone}
                        disabled={clone.isSaved}
                        onChange={(e) => updateClone(idx, 'tone', e.target.value)}
                        className={`bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 w-full focus:ring-1 focus:ring-purple-500 outline-none ${clone.isSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </td>

                    <td className="p-4">
                      <div className="text-sm text-gray-300">{clone.language}</div>
                    </td>

                    <td className="p-4">
                      <select 
                        value={clone.category}
                        disabled={clone.isSaved}
                        onChange={(e) => updateClone(idx, 'category', e.target.value)}
                        className={`bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 w-full focus:ring-1 focus:ring-purple-500 outline-none ${clone.isSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                         {CATEGORIES.map(cat => (
                           <option key={cat} value={cat}>{cat}</option>
                         ))}
                      </select>
                    </td>

                    <td className="p-4">
                      <select 
                        value={clone.gender}
                        disabled={clone.isSaved}
                        onChange={(e) => updateClone(idx, 'gender', e.target.value)}
                        className={`bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 w-full focus:ring-1 focus:ring-purple-500 outline-none ${clone.isSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                         <option value="Male">Male</option>
                         <option value="Female">Female</option>
                      </select>
                    </td>

                    {/* Cloning Strength Slider */}
                    <td className="p-4">
                       <div className={`flex flex-col gap-1 ${clone.isSaved ? 'opacity-50' : ''}`}>
                          <div className="flex justify-between text-[10px] text-gray-500">
                             <span>Inspired</span>
                             <span>Replica</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="10"
                            disabled={clone.isSaved}
                            value={clone.cloningStrength || 100}
                            onChange={(e) => updateClone(idx, 'cloningStrength', parseInt(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                          <div className="text-center text-xs font-bold text-purple-400">
                             {clone.cloningStrength || 100}%
                          </div>
                       </div>
                    </td>

                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          {!clone.isSaved && (
                            <button 
                              onClick={() => openPreviewModal(idx)}
                              className="p-2 bg-gray-700 hover:bg-blue-600 text-white rounded-md transition-colors"
                              title="Preview Voice"
                            >
                               <Play className="w-4 h-4 fill-current" />
                            </button>
                          )}
                          
                          {clone.isSaved ? (
                             <div className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-md text-xs font-bold flex items-center gap-1">
                               <CheckCircle className="w-3 h-3" /> Added
                             </div>
                          ) : (
                            <button 
                              onClick={() => handleFinalize(idx)}
                              className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-md transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2 whitespace-nowrap"
                              title="Finalize & Add to Library"
                            >
                               <Check className="w-4 h-4" /> Save & Add
                            </button>
                          )}

                          <button 
                            onClick={() => handleDelete(idx)}
                            className="p-2 bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white rounded-md transition-colors"
                            title={clone.isSaved ? "Remove from list" : "Delete"}
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && activePreviewIndex !== null && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg overflow-hidden shadow-2xl">
               <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="font-bold text-white">Preview Voice: {pendingClones[activePreviewIndex].name}</h3>
                  <button onClick={() => setPreviewModalOpen(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Test Sentence</label>
                    <textarea 
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400">
                        Strength: <span className="text-purple-400 font-bold">{pendingClones[activePreviewIndex].cloningStrength || 100}%</span>
                      </div>
                      <button 
                        onClick={generatePreviewAudio}
                        disabled={isPreviewGenerating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                         {isPreviewGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                         Generate & Play
                      </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default VoiceCloner;
