
import React, { useState, useMemo, useEffect, useRef } from 'react';
// Remove direct import of ARTISTS to support dynamic list from App
import { VoiceArtist } from '../types';
import { generateSpeech } from '../services/geminiService';
import { Search, Mic, Play, Heart, Pause, Globe, Users, Loader2, Sparkles, StopCircle, BadgeCheck, Wifi } from 'lucide-react';

interface Props {
  artists: VoiceArtist[]; // Accept artists as prop
  onSelectArtist: (artist: VoiceArtist) => void;
  selectedArtistId?: string;
  setLanguage: (lang: string) => void;
  selectedCategory: string;
}

const ArtistLibrary: React.FC<Props> = ({ artists, onSelectArtist, selectedArtistId, setLanguage, selectedCategory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  
  // New State for Favorites, Specialists, and Preview
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('Alamin Voice ToolFavorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [activeTab, setActiveTab] = useState<'All' | 'Favorites' | 'Specialists'>('All');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('Spanish');
  
  // Audio Preview State - using AudioContext for PCM playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // To cancel pending requests

  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [playingArtistId, setPlayingArtistId] = useState<string | null>(null);

  // Persistence for favorites
  useEffect(() => {
    localStorage.setItem('Alamin Voice ToolFavorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleTabChange = (tab: 'All' | 'Favorites' | 'Specialists') => {
    setActiveTab(tab);
    if (tab === 'Specialists') {
      setLanguage('Spanish');
    } else {
      setLanguage('English');
    }
  };

  const toggleFavorite = (e: React.MouseEvent, artistId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(artistId)) {
        next.delete(artistId);
      } else {
        next.add(artistId);
      }
      return next;
    });
  };

  // STRICT STOP LOGIC (Singleton Pattern)
  const stopAudio = () => {
    // 1. Cancel any pending API fetches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Stop and Disconnect the Audio Node immediately
    if (sourceNodeRef.current) {
      try {
        // Remove onended to prevent state updates after we manually stop
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }

    // 3. Reset UI States
    setPlayingArtistId(null);
    setLoadingPreviewId(null);
  };

  // Helper to decode PCM
  const playPCMData = async (base64PCM: string, artistId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Ensure strictly one source is playing
    if (sourceNodeRef.current) {
        try {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
        } catch(e) {}
        sourceNodeRef.current = null;
    }

    try {
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
      
      const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // 24kHz standard for Gemini
      buffer.getChannelData(0).set(float32Data);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      
      // OPTIMIZATION: Use 1.0 (Natural) for "Human-Like" preview. 
      // Do not speed up previews as it ruins the "smoothness" perception.
      source.playbackRate.value = 1.0; 

      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setPlayingArtistId(current => current === artistId ? null : current);
        sourceNodeRef.current = null;
      };
      
      sourceNodeRef.current = source;
      source.start();
    } catch (e) {
      console.error("Audio Playback Error:", e);
      stopAudio();
    }
  };

  // Helper to get category-specific preview text
  const getPreviewText = (artist: VoiceArtist) => {
    const lang = artist.language === 'Spanish' ? 'es' : 'en';
    
    if (lang === 'es') {
      switch (artist.category) {
        case 'News': return `Noticias de última hora: esta es una vista previa de mi voz de transmisión.`;
        case 'Storytelling': return `Había una vez, en una tierra muy lejana, donde comenzaban las historias.`;
        case 'Calm': return `Respira profundo, relájate y escucha el sonido de la calma.`;
        case 'Energetic': return `¡Hola! ¡Estoy listo para darle vida y energía a tu próximo proyecto!`;
        case 'History': return `En el año mil novecientos veinte, la historia cambió para siempre.`;
        case 'Medical': return `El procedimiento es seguro y ha sido verificado por expertos.`;
        default: return `Hola, soy ${artist.name}. Me especializo en contenido profesional y claro.`;
      }
    }

    switch (artist.category) {
      case 'News': return `Breaking news: This is a live demonstration of my broadcast voice capability.`;
      case 'Storytelling': return `Once upon a time, in a land far away, a story was waiting to be told.`;
      case 'Calm': return `Take a deep breath. Relax your shoulders, and listen to the silence.`;
      case 'Energetic': return `Hey there! I'm super excited to bring high energy to your project!`;
      case 'History': return `In the year 1800, the world was a vastly different place than today.`;
      case 'Character': return `I can be anyone you want me to be. Just say the word.`;
      case 'ASMR': return `This is a very soft whisper, just for you. Close your eyes.`;
      case 'Medical': return `The diagnosis suggests we should proceed with the standard treatment protocol.`;
      case 'Historical Narrator': return `It was a time of kings and conquerors, where destiny was forged in steel.`;
      default: return `Hi, I'm ${artist.name}. I specialize in ${artist.category} voiceovers.`;
    }
  };

  // New Helper: Get Region Badge Info
  const getRegionInfo = (artist: VoiceArtist) => {
     if (artist.language === 'Spanish') return { flag: '🇪🇸/🇲🇽', label: 'Spanish' };
     if (artist.accent === 'British') return { flag: '🇬🇧', label: 'British' };
     if (artist.accent === 'American') return { flag: '🇺🇸', label: 'American' };
     if (artist.accent === 'Global') return { flag: '🌎', label: 'Global' };
     return { flag: '🎙️', label: artist.language || 'Global' };
  };

  const handlePreview = async (e: React.MouseEvent, artist: VoiceArtist) => {
    e.stopPropagation();
    
    if (playingArtistId === artist.id || loadingPreviewId === artist.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingPreviewId(artist.id);
    
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const text = getPreviewText(artist);
      
      const base64Audio = await generateSpeech(
        text, 
        artist.baseVoice, 
        'Neutral', 
        artist.description, 
        artist.language || 'English'
      );
      
      if (abortCtrl.signal.aborted) return;

      setLoadingPreviewId(null);
      setPlayingArtistId(artist.id);
      await playPCMData(base64Audio, artist.id);

    } catch (err) {
      if (abortControllerRef.current === abortCtrl) {
         console.error("Preview generation failed:", err);
         setPlayingArtistId(null);
         setLoadingPreviewId(null);
      }
    }
  };

  const filteredArtists = useMemo(() => {
    return artists.filter(artist => {
      // 1. Tab Filtering
      if (activeTab === 'Favorites' && !favorites.has(artist.id)) return false;
      if (activeTab === 'Specialists') {
        if (artist.language !== specialtyFilter) return false;
      }

      const matchesSearch = artist.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            artist.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || artist.category === selectedCategory;
      const matchesGender = genderFilter === 'All' || artist.gender === genderFilter;
      
      return matchesSearch && matchesCategory && matchesGender;
    });
  }, [artists, searchTerm, selectedCategory, genderFilter, activeTab, favorites, specialtyFilter]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white rounded-xl overflow-hidden border border-gray-700">
      {/* Header / Filter Bar */}
      <div className="p-6 border-b border-gray-800 bg-gray-850 space-y-4">
        
        {/* Top Row: Title + Gender Filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="text-primary-500" />
            Artist Library <span className="text-sm text-gray-500 font-normal">({filteredArtists.length})</span>
          </h2>

          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setGenderFilter('All')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${genderFilter === 'All' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >All</button>
            <button 
              onClick={() => setGenderFilter('Male')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${genderFilter === 'Male' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >Male</button>
            <button 
              onClick={() => setGenderFilter('Female')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${genderFilter === 'Female' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >Female</button>
          </div>
        </div>
        
        {/* Bottom Row: Tabs + Search */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main Filter Tabs */}
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 self-start flex-shrink-0">
             <button 
               onClick={() => handleTabChange('All')}
               className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'All' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
               <Users className="w-4 h-4" /> All
             </button>
             <button 
               onClick={() => handleTabChange('Favorites')}
               className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Favorites' ? 'bg-pink-600/20 text-pink-400 ring-1 ring-pink-500/50' : 'text-gray-400 hover:text-pink-300'}`}
             >
               <Heart className="w-4 h-4 fill-current" /> Favorites
             </button>
             <button 
               onClick={() => handleTabChange('Specialists')}
               className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Specialists' ? 'bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/50' : 'text-gray-400 hover:text-indigo-300'}`}
             >
               <Globe className="w-4 h-4" /> Spanish
             </button>
          </div>

          {/* Search Bar - Inline - Reduced Width */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search artists..." 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'Specialists' && (
          <div className="flex items-center gap-2 animate-fade-in">
             <span className="text-xs text-gray-400 font-medium">Active Language:</span>
             <span className="text-xs font-bold px-2 py-0.5 bg-indigo-600 rounded text-white">Spanish</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-900 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArtists.map((artist) => {
            const region = getRegionInfo(artist);
            return (
              <div 
                key={artist.id}
                onClick={() => onSelectArtist(artist)}
                className={`
                  group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300
                  ${selectedArtistId === artist.id 
                    ? 'border-pink-500 bg-gray-800 ring-1 ring-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] transform -translate-y-0.5' 
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-500 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1'}
                `}
              >
                <div className="relative flex-shrink-0">
                  <img 
                    src={artist.avatarUrl} 
                    alt={artist.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-600 group-hover:border-gray-400 transition-colors"
                  />
                  {/* Play Preview Button */}
                  <button
                    onClick={(e) => handlePreview(e, artist)}
                    className={`
                      absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-gray-800 transition-all shadow-lg
                      ${playingArtistId === artist.id 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : loadingPreviewId === artist.id 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-white text-gray-900 hover:bg-primary-500 hover:text-white'}
                    `}
                    title={playingArtistId === artist.id ? "Stop Preview" : "Play Voice Preview"}
                  >
                    {loadingPreviewId === artist.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : playingArtistId === artist.id ? (
                      <StopCircle className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className={`font-bold text-sm truncate ${selectedArtistId === artist.id ? 'text-pink-400' : 'text-gray-100 group-hover:text-white'}`}>
                        {artist.name}
                      </h3>
                      {/* NEW: Country/Region Badge */}
                      <span className="flex items-center gap-1 bg-gray-900 px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700/50 flex-shrink-0">
                        <span>{region.flag}</span>
                        <span className="hidden xl:inline">{region.label}</span>
                      </span>
                    </div>
                    
                    <button 
                      onClick={(e) => toggleFavorite(e, artist.id)}
                      className="text-gray-500 hover:text-pink-500 transition-colors focus:outline-none flex-shrink-0"
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.has(artist.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {/* NEW: Neural Badge for Quality Assurance */}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded border border-blue-500/30 flex items-center gap-1">
                      <Sparkles className="w-2 h-2" /> Neural HD
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-900 rounded border border-gray-700 text-gray-400">
                      {artist.category}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {artist.description}
                  </p>
                </div>
                
                {/* Selection Indicator */}
                {selectedArtistId === artist.id && (
                  <div className="absolute top-2 right-2">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ArtistLibrary;
