
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, Languages, Download, Loader2, PlayCircle, Eraser, Copy, CheckCircle2, Globe, ArrowRight, Hourglass } from 'lucide-react';
import { translateTranscript } from '../services/geminiService';
import { TranscriptSegment } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface Props {
  transcriptData: {
    fullText: string;
    segments: TranscriptSegment[];
    originalSegments: TranscriptSegment[];
    isProcessing: boolean;
    statusMessage: string;
    error: string | null;
  };
  onStartTranscription: (file: File) => void;
  onUpdateTranscript: (text: string, segments: TranscriptSegment[]) => void;
}

const VoiceTranscript: React.FC<Props> = ({ transcriptData, onStartTranscription, onUpdateTranscript }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('English');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fullText, segments: transcriptSegments, originalSegments, isProcessing, statusMessage, error } = transcriptData;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        alert("File size too large. Max 500MB.");
        return;
      }
      setAudioFile(file);
      setAudioSrc(URL.createObjectURL(file));
    }
  };

  const handleTranscribe = () => {
    if (!audioFile) return;
    onStartTranscription(audioFile);
  };

  const handleTranslate = async () => {
    if (originalSegments.length === 0) return;
    setIsTranslating(true);

    try {
      const { fullText: text, segments } = await translateTranscript(originalSegments, targetLanguage);
      onUpdateTranscript(text, segments);
    } catch (err: any) {
       console.error(err);
       alert("Translation failed. Please try again.");
    } finally {
       setIsTranslating(false);
    }
  };

  const handleDownloadSRT = () => {
    if (transcriptSegments.length === 0) return;

    // Build SRT Content
    let srtContent = '';
    transcriptSegments.forEach((seg, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${seg.startTime} --> ${seg.endTime}\n`;
      srtContent += `${seg.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Alamin_Voice_Tool_transcript_${targetLanguage}_${Date.now()}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullText);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <FileAudio className="text-blue-500" />
           Voice Transcript Studio
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Upload audio (up to 500MB). Transcribe in original language, translate to any language, and export subtitles.
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Input & Controls */}
        <div className="w-full lg:w-96 bg-gray-850 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto">
          
          {/* Upload Area */}
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all
              ${isProcessing ? 'cursor-wait opacity-50' : 'cursor-pointer'}
              ${audioFile ? 'border-green-500/50 bg-green-900/10' : 'border-gray-700 hover:border-blue-500 hover:bg-gray-800'}
            `}
          >
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isProcessing} 
            />
            
            {audioFile ? (
               <div className="text-center">
                 <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileAudio className="w-6 h-6 text-white" />
                 </div>
                 <p className="font-bold text-sm text-white truncate max-w-[200px]">{audioFile.name}</p>
                 <p className="text-xs text-green-400 mt-1">Ready to process</p>
               </div>
            ) : (
               <div className="text-center text-gray-500">
                 <Upload className="w-10 h-10 mx-auto mb-3 opacity-50" />
                 <p className="font-bold text-sm text-gray-300">Click to Upload Audio</p>
                 <p className="text-xs mt-1">Max 500MB</p>
               </div>
            )}
          </div>

          {/* Audio Player Preview */}
          {audioSrc && (
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Source Audio</label>
              <audio controls src={audioSrc} className="w-full h-8" />
            </div>
          )}

          {/* Action Button: Transcribe */}
          <button 
            onClick={handleTranscribe}
            disabled={!audioFile || isProcessing || isTranslating}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg hover:shadow-blue-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isProcessing ? <Loader2 className="animate-spin" /> : <FileAudio className="fill-current" />}
             {isProcessing ? 'Processing...' : 'Transcribe Original Audio'}
          </button>
          
          {/* Progress / Status Bar */}
          {isProcessing && (
             <div className="bg-gray-900 p-4 rounded-xl border border-blue-500/30 animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                   <Hourglass className="w-4 h-4 text-blue-400 animate-spin" />
                   <span className="text-sm font-bold text-blue-300">Working in Background...</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-2 overflow-hidden">
                   <div className="bg-blue-500 h-2 rounded-full animate-progress-indeterminate"></div>
                </div>
                <p className="text-xs text-gray-400">{statusMessage}</p>
                <p className="text-[10px] text-gray-600 mt-1">You can switch tabs while we work.</p>
             </div>
          )}

          {/* Translation Studio Section */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 mt-2">
             <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-300">
                <Globe className="w-4 h-4 text-purple-400" /> Translation Studio
             </div>
             
             <div className="space-y-3">
               <div>
                  <label className="text-xs text-gray-500 mb-1 block">Translate To:</label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-1 focus:ring-purple-500 outline-none"
                    disabled={originalSegments.length === 0}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
               </div>

               <button 
                  onClick={handleTranslate}
                  disabled={originalSegments.length === 0 || isTranslating || isProcessing}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                  {isTranslating ? 'Translating...' : 'Translate'}
               </button>
             </div>
          </div>
          
          {error && (
             <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-xs text-red-300">
               {error}
             </div>
          )}

          {/* Tips */}
          <div className="mt-auto p-4 bg-gray-900 rounded-xl border border-gray-800 text-xs text-gray-500 space-y-2">
             <p className="font-bold text-gray-400 uppercase">Capabilities:</p>
             <ul className="list-disc pl-4 space-y-1">
               <li>Detects original language auto-magically.</li>
               <li>Translate any transcript to {SUPPORTED_LANGUAGES.length}+ languages.</li>
               <li>Downloads synchronized SRT for any language.</li>
             </ul>
          </div>

        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 bg-gray-900 p-6 flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold flex items-center gap-2">
               <span className="text-gray-200">Transcript Preview</span>
               {transcriptSegments.length > 0 && (
                 <span className="text-xs font-normal text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/30">
                   {originalSegments === transcriptSegments ? 'Original Language' : `Translated to ${targetLanguage}`}
                 </span>
               )}
             </h3>
             
             <div className="flex gap-3">
               <button 
                 onClick={copyToClipboard}
                 className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg border border-gray-700 transition-colors"
               >
                  {copyStatus ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copyStatus ? 'Copied' : 'Copy Text'}
               </button>

               <button 
                 onClick={handleDownloadSRT}
                 disabled={transcriptSegments.length === 0}
                 className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                  <Download className="w-3 h-3" />
                  Download SRT (.srt)
               </button>
             </div>
          </div>

          <div className="flex-1 relative">
             <textarea 
               className="w-full h-full bg-gray-950/50 border border-gray-800 rounded-xl p-6 text-lg text-gray-200 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none custom-scrollbar leading-relaxed"
               placeholder={isProcessing ? "AI is transcribing in background. You can check the status in the left panel." : "Transcript will appear here after processing."}
               value={fullText}
               onChange={(e) => onUpdateTranscript(e.target.value, transcriptSegments)}
             ></textarea>
             
             {(isProcessing || isTranslating) && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl pointer-events-none">
                 <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <span className="text-sm font-bold text-white">
                      {isProcessing ? 'Transcribing...' : 'Translating Text...'}
                    </span>
                 </div>
               </div>
             )}
          </div>
          
          <div className="mt-2 flex justify-between text-xs text-gray-500 px-1">
             <span>{fullText.split(/\s+/).filter(w => w.length > 0).length} words</span>
             {transcriptSegments.length > 0 && <span>{transcriptSegments.length} subtitle segments generated</span>}
          </div>

        </div>

      </div>
    </div>
  );
};

export default VoiceTranscript;
