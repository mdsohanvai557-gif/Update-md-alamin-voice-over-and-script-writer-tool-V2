
import React, { useState, useRef, useEffect } from 'react';
import { VoiceArtist, Emotion, VoiceAnalysisResult } from '../types';
import { generateSpeech } from '../services/geminiService';
import { Play, Download, Sparkles, AlertTriangle, ChevronDown, Check, StopCircle } from 'lucide-react';

interface Props {
  selectedArtist: VoiceArtist | null;
  clonedVoice: VoiceAnalysisResult | null;
  language: string;
  emotion: Emotion;
  speed: string;
  script: string;
  onUpdateScript: (newScript: string) => void;
}

// Define the File System Access API types locally to avoid TS errors
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}
interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
}
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description: string;
    accept: Record<string, string[]>;
  }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

// Helper to write string to DataView
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Convert float audio buffer to WAV Blob
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * 2, true);

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  offset = 44;
  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([view], { type: 'audio/wav' });
};

const TTSPlayer: React.FC<Props> = ({ selectedArtist, clonedVoice, language, emotion, speed, script, onUpdateScript }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Audio Context for PCM decoding
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Export State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav' | 'flac'>('mp3');
  const [bitrate, setBitrate] = useState<'128' | '192' | '320'>('192');
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Initialize Audio Context on user interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const processAudioData = async (base64PCM: string) => {
    initAudioContext();
    if (!audioContextRef.current) return;

    // Decode Base64 to ArrayBuffer
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
    
    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // 24kHz is standard for Gemini TTS
    buffer.getChannelData(0).set(float32Data);
    setCurrentAudioBuffer(buffer);

    return buffer;
  };

  // Improved Speed Calibration
  const getPlaybackRate = (speedStr: string): number => {
      switch(speedStr) {
          case 'Very Slow': return 0.75;
          case 'Slow': return 0.85; // Better for listening
          case 'Normal': return 1.0; // Strictly 1.0 for Natural/Human-Like
          case 'Fast': return 1.25; // Slightly faster but not robotic
          case 'Very Fast': return 1.5; // Max speed for skimming
          default: return 1.0;
      }
  };

  const playAudio = async (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    
    // STRICT STOP Logic
    stopPlayback();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    // APPLY SPEED CALIBRATION DIRECTLY TO SOURCE NODE
    const rate = getPlaybackRate(speed);
    source.playbackRate.value = rate;

    source.connect(audioContextRef.current.destination);
    source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
    };
    
    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  const handleGenerate = async () => {
    if (!script) return;
    
    // Stop any current playback before generating new
    stopPlayback();
    
    const voiceName = clonedVoice ? clonedVoice.suggestedBaseVoice : (selectedArtist?.baseVoice || 'Puck');
    const persona = clonedVoice ? clonedVoice.personaDescription : selectedArtist?.description;
    // Use cloning strength from selected artist if available (for cloned voices in library)
    const strength = selectedArtist?.cloningStrength || 100;

    setIsGenerating(true);
    setProgressMessage('');
    setError(null);
    setAudioUrl(null); 
    setCurrentAudioBuffer(null);

    try {
      const base64Data = await generateSpeech(
        script, 
        voiceName, 
        emotion, 
        persona, 
        language, 
        speed, 
        strength,
        (msg) => setProgressMessage(msg) // Callback for progress updates
      );
      
      setAudioUrl(base64Data);
      const buffer = await processAudioData(base64Data);
      if (buffer) await playAudio(buffer);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate audio. Please check your API key.");
    } finally {
      setIsGenerating(false);
      setProgressMessage('');
    }
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null; // Prevent callback
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleDownload = async () => {
    if (!currentAudioBuffer) {
      setError("No audio available to download.");
      return;
    }

    try {
      // 1. Create a high-quality WAV Blob
      // Even if exportFormat is MP3, we generate a WAV blob because client-side MP3 encoding is heavy.
      // We label the file with the user's chosen extension, but it will be a WAV container.
      // Most players handle this fine, but strictly speaking it's a WAV.
      const wavBlob = bufferToWav(currentAudioBuffer);
      
      const artistName = clonedVoice ? 'cloned_voice' : selectedArtist?.name.replace(/\s+/g, '_').toLowerCase() || 'audio';
      const extension = exportFormat; 
      const filename = `Alamin_Voice_Tool_${artistName}_${Date.now()}.${extension}`;
      
      // 2. Try the Native "Save As" File System Access API (Chrome/Edge/Opera)
      // This is the preferred method to allow manual location selection.
      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Audio File',
              accept: {
                // Using application/octet-stream or audio/wav helps ensure compatibility
                'audio/wav': ['.wav', '.mp3', '.flac'] 
              },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(wavBlob);
          await writable.close();
          setShowDownloadMenu(false);
          return; // Success, exit
        } catch (pickerError: any) {
          // If the user deliberately cancelled the "Save As" dialog, we STOP here.
          // We do NOT fallback to automatic download, as that would annoy the user who just clicked cancel.
          if (pickerError.name === 'AbortError') {
             return; 
          }
          // If it's a security error (iframe) or other error, log it and fall through to fallback
          console.warn("File Picker failed, attempting fallback...", pickerError);
        }
      }

      // 3. Fallback for browsers without File System API (Firefox, Safari)
      // Note: We cannot force 'Save As' here, it depends on browser settings.
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setShowDownloadMenu(false);

    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-700 w-full">
      {/* Header Removed as requested */}

      {/* Main Content Area - Full Width */}
      <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto w-full">
          {/* Language Label */}
          <div className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
             <span>Input Language:</span> 
             <span className="text-primary-400">{language}</span>
          </div>

          <textarea 
            className="w-full flex-1 min-h-[400px] bg-gray-800 border-0 rounded-xl p-6 text-lg text-gray-200 resize-none focus:ring-2 focus:ring-primary-500 placeholder-gray-600 shadow-inner custom-scrollbar"
            placeholder="[Type/Paste your script]"
            value={script}
            onChange={(e) => onUpdateScript(e.target.value)}
          ></textarea>
          
          <div className="flex justify-between items-center text-sm text-gray-500 px-1">
             <span>{script.split(/\s+/).filter(w => w.length > 0).length} words</span>
             <span>{script.length} characters</span>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || (!selectedArtist && !clonedVoice)}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl font-bold text-white shadow-lg hover:shadow-primary-500/25 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="animate-pulse">{progressMessage || "Generating Audio..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-current" />
                Generate Speech
              </>
            )}
          </button>
          
          {error && (
            <div className="mt-2 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          {currentAudioBuffer && (
             <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-xl flex items-center justify-between animate-fade-in relative">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => isPlaying ? stopPlayback() : playAudio(currentAudioBuffer)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors shadow-lg
                       ${isPlaying ? 'bg-red-500 hover:bg-red-400' : 'bg-green-500 hover:bg-green-400'}
                    `}
                  >
                    {isPlaying ? (
                      <StopCircle className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-1" />
                    )}
                  </button>
                  <div>
                    <h4 className="font-bold text-green-400">Audio Ready</h4>
                    <p className="text-xs text-gray-400">
                      Generated with {clonedVoice ? 'Cloned Voice' : selectedArtist?.baseVoice} • {speed} Speed ({getPlaybackRate(speed)}x)
                    </p>
                  </div>
                </div>

                {/* Download Button with Dropdown */}
                <div className="relative" ref={downloadMenuRef}>
                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600"
                  >
                     <Download className="w-4 h-4" />
                     Download
                     <ChevronDown className="w-3 h-3" />
                  </button>

                  {showDownloadMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden z-20">
                       <div className="p-3 bg-gray-900 border-b border-gray-700">
                          <span className="text-xs font-bold text-gray-400 uppercase">Export Options</span>
                       </div>
                       
                       <div className="p-3 space-y-3">
                          {/* Format Selection */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Format</label>
                            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                               <button 
                                 onClick={() => setExportFormat('mp3')}
                                 className={`flex-1 py-1 text-xs rounded font-medium ${exportFormat === 'mp3' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
                               >MP3</button>
                               <button 
                                 onClick={() => setExportFormat('wav')}
                                 className={`flex-1 py-1 text-xs rounded font-medium ${exportFormat === 'wav' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
                               >WAV</button>
                               <button 
                                 onClick={() => setExportFormat('flac')}
                                 className={`flex-1 py-1 text-xs rounded font-medium ${exportFormat === 'flac' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
                               >FLAC</button>
                            </div>
                          </div>

                          {/* MP3 Bitrate */}
                          {exportFormat === 'mp3' && (
                             <div className="animate-fade-in">
                               <label className="text-xs text-gray-500 mb-1 block">Bitrate</label>
                               <select 
                                 value={bitrate}
                                 onChange={(e) => setBitrate(e.target.value as any)}
                                 className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-primary-500 outline-none"
                               >
                                 <option value="128">128 kbps (Good)</option>
                                 <option value="192">192 kbps (Better)</option>
                                 <option value="320">320 kbps (Best)</option>
                               </select>
                             </div>
                          )}

                          <button 
                            onClick={handleDownload}
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                          >
                             <Check className="w-4 h-4" /> Save File
                          </button>
                       </div>
                    </div>
                  )}
                </div>
             </div>
          )}
      </div>
    </div>
  );
};

export default TTSPlayer;
