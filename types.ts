
export interface VoiceArtist {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  category: ArtistCategory;
  baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  description: string;
  avatarUrl: string;
  language?: string; 
  accent?: 'American' | 'British' | 'Global'; 
  cloningStrength?: number; // Added to support cloning strength in library items
}

export enum ArtistCategory {
  Storytelling = 'Storytelling',
  News = 'News',
  History = 'History',
  Calm = 'Calm',
  Energetic = 'Energetic',
  Professional = 'Professional',
  Character = 'Character',
  ASMR = 'ASMR',
  Educational = 'Educational',
  Medical = 'Medical',
  Whisper = 'Whisper',
  Promotional = 'Promotional',
  Explanatory = 'Explanatory',
  Announcer = 'Announcer',
  HistoricalNarrator = 'Historical Narrator',
  Authoritative = 'Authoritative'
}

export enum Emotion {
  Neutral = 'Neutral',
  Happy = 'Happy',
  Sad = 'Sad',
  Excited = 'Excited',
  Whisper = 'Whisper',
  Terrified = 'Terrified',
  Angry = 'Angry',
  Professional = 'Professional',
  Warm = 'Warm',
  Educational = 'Educational',
  Authoritative = 'Authoritative',
  Calm = 'Calm',
  Medical = 'Medical', 
  HistoricalNarrator = 'Historical Narrator' 
}

export interface GeneratedAudio {
  id: string;
  url: string;
  text: string;
  artist: string;
  emotion: string;
  timestamp: number;
}

// --- TRENDING RESEARCH LAB TYPES ---

export interface NicheChannel {
  name: string;
  subscribers: string; // e.g. "15M"
  channelUrl: string;
}

export interface NicheVideo {
  title: string;
  channelName: string;
  views: string; // e.g. "2.3M"
  videoUrl: string;
}

export interface NicheExplorerResult {
  topChannels: NicheChannel[];
  topVideos: NicheVideo[];
}

export interface ViralVideo {
  title: string;
  channelName: string;
  views: string; // e.g. "2.5M"
  timeframe: string; // e.g. "2 days ago"
  trajectory: 'Growing' | 'Stable' | 'Declining';
  videoUrl: string;
  channelUrl: string;
}

export interface TrendForecast {
  topic: string;
  predictionScore: number; // 0-100
  potentialReach: string;
}

export interface ContentBlueprint {
  hook: string;
  keyPoints: string[];
  callToAction: string;
}

export interface CompetitorAnalysis {
  channelName: string;
  growthRate: string;
  similarChannels: string[];
  topPillars: string[];
  blueprint?: ContentBlueprint;
}

export interface GeneratedImage {
  id: string;
  url: string; // Base64 data URI
  prompt: string;
  timestamp: number;
}

export interface CompetitorVideo {
  title: string;
  score: number;
}

export interface YouTubeSEOResult {
  optimizedTitle: string;
  description: string;
  tags: string[];
  seoScore: number;
  competitors: CompetitorVideo[];
}

export interface TranscriptSegment {
  startTime: string;
  endTime: string;
  text: string;
}

// --- VOICE CLONING TYPES ---

export interface VoiceAnalysisResult {
  matchConfidence: number;
  audioQuality: 'Excellent' | 'Good' | 'Poor';
  detectedPitch: string;
  detectedPace: string;
  accent: string;
  suggestedBaseVoice: string; // One of the known base voices
  personaDescription: string;
  gender?: 'Male' | 'Female';
  
  // App-specific fields
  name?: string;
  category?: ArtistCategory | string;
  cloningStrength?: number;
  language?: string;
  tone?: string;
  isSaved?: boolean;
}