
import React, { useState } from 'react';
import { Mic2, Users, Globe, Wand2, Menu, X, Settings2, Gauge, ChevronDown, Tag, Image, Youtube, PenTool, Terminal } from 'lucide-react';
import ArtistLibrary from './components/ArtistLibrary';
import TTSPlayer from './components/TTSPlayer';
import StoryWriter from './components/StoryWriter';
import ScriptRewriter from './components/ScriptRewriter';
import ImageStudio from './components/ImageStudio';
import YouTubeSEO from './components/YouTubeSEO';
import CommandMode from './components/CommandMode';
import { VoiceArtist, Emotion, ArtistCategory } from './types';
import { SUPPORTED_LANGUAGES, EMOTIONS, SPEEDS, CATEGORIES, ARTISTS as INITIAL_ARTISTS } from './constants';

function App() {
  const [activeTab, setActiveTab] = useState<'Library' | 'StoryWriter' | 'Rewriter' | 'Image' | 'SEO' | 'Command'>('StoryWriter');
  
  const [allArtists, setAllArtists] = useState<VoiceArtist[]>(INITIAL_ARTISTS);
  
  const [selectedArtist, setSelectedArtist] = useState<VoiceArtist | null>(null);
  const [language, setLanguage] = useState('English');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(Emotion.Neutral);
  const [selectedSpeed, setSelectedSpeed] = useState<string>('Normal');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Shared Script State
  const [scriptText, setScriptText] = useState('');

  const handleArtistSelect = (artist: VoiceArtist) => {
    setSelectedArtist(artist);
    
    // Automatic Language Switching based on Artist
    if (artist.language === 'Spanish') {
      setLanguage('Spanish');
    } else {
      setLanguage('English');
    }

    if (window.innerWidth < 768) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-in-out
        ${activeTab === tab 
          ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20 scale-[1.02]' 
          : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}
      `}
    >
      <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-white' : ''}`} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Navigation */}
      <nav className={`
        fixed md:relative z-20 top-0 left-0 h-full w-64 bg-gray-950 border-r border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Mic2 className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Alamin Voice Tool</h1>
        </div>

        <div className="px-4 space-y-2">
          {/* Default Active Tab: Story Writer */}
          <NavButton tab="StoryWriter" icon={PenTool} label="Story Writer" />
          <NavButton tab="Command" icon={Terminal} label="Pro Command Studio" />
          <NavButton tab="Library" icon={Users} label="Artist Library" />
          <NavButton tab="Rewriter" icon={Wand2} label="Script Rewriter" />
        </div>

        <div className="mt-auto p-6 space-y-5 overflow-y-auto custom-scrollbar">
           
           {/* Emotion Selector */}
           <div>
             <div className="relative">
               <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                 <Settings2 className="w-3 h-3" />
               </div>
               <select 
                 className="w-full appearance-none bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl py-3 pl-9 pr-8 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                 value={selectedEmotion}
                 onChange={(e) => setSelectedEmotion(e.target.value as Emotion)}
               >
                 {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
             </div>
           </div>

           {/* Speed Selector */}
           <div>
             <div className="relative">
               <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                 <Gauge className="w-3 h-3" />
               </div>
               <select 
                 className="w-full appearance-none bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl py-3 pl-9 pr-8 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                 value={selectedSpeed}
                 onChange={(e) => setSelectedSpeed(e.target.value)}
               >
                 {SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
             </div>
           </div>

           {/* Language Selector */}
           <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-2 block ml-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Output Language
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl p-3 appearance-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
           </div>

           {/* Category Selector */}
           <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-2 block ml-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-xl p-3 appearance-none focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              </div>
           </div>

           {/* Image Tab */}
           <NavButton tab="Image" icon={Image} label="Image Studio" />

           {/* YouTube SEO Tab */}
           <NavButton tab="SEO" icon={Youtube} label="YouTube SEO" />

        </div>
      </nav>

      {/* Mobile Header Overlay */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <Mic2 className="text-pink-500 w-6 h-6" />
          <span className="font-bold">Alamin Voice Tool</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden pt-16 md:pt-0 bg-black p-4 md:p-6 gap-6 flex flex-col">
        {/* Dynamic Content Switching */}
        {activeTab === 'StoryWriter' ? (
           <StoryWriter />
        ) : activeTab === 'Command' ? (
           <CommandMode />
        ) : activeTab === 'Rewriter' ? (
           <ScriptRewriter script={scriptText} onUpdateScript={setScriptText} />
        ) : activeTab === 'Image' ? (
           <ImageStudio />
        ) : activeTab === 'SEO' ? (
           <YouTubeSEO />
        ) : (
          /* Library Tab: Split View */
          <div className="flex flex-col xl:flex-row gap-6 h-full">
            <div className="flex-1 min-h-0 xl:w-1/2 h-1/2 xl:h-full">
              <ArtistLibrary 
                artists={allArtists} 
                onSelectArtist={handleArtistSelect} 
                selectedArtistId={selectedArtist?.id} 
                setLanguage={setLanguage}
                selectedCategory={selectedCategory}
              />
            </div>
            <div className="flex-1 min-h-0 xl:w-1/2 h-1/2 xl:h-full">
              <TTSPlayer 
                selectedArtist={selectedArtist} 
                clonedVoice={null} 
                language={language}
                emotion={selectedEmotion}
                speed={selectedSpeed}
                script={scriptText}
                onUpdateScript={setScriptText}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
