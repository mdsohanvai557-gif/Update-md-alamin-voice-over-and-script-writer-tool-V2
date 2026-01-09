import { GoogleGenAI, Modality, Type, Schema } from "@google/genai";
import { 
  YouTubeSEOResult, 
  TranscriptSegment, 
  NicheExplorerResult, 
  ViralVideo, 
  TrendForecast, 
  CompetitorAnalysis, 
  VoiceAnalysisResult,
  GeneratedImage
} from "../types";

const API_KEY = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to convert Blob/File to Base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to clean JSON string from Markdown code blocks
function cleanJson(text: string): string {
  return text.replace(/```json\n?|```/g, '').trim();
}

// Global Numeric Formatting Rules
const NUMERIC_FORMATTING_RULES = `
  STRICT NUMERIC & DATA FORMATTING (OVERRIDE GRAMMAR):
  1. **GENERAL NUMBERS:** ALWAYS use DIGITS for counts, ages, distances, etc. (e.g., "5 minutes", "3 children", "7 years old"). NEVER spell out numbers (no "five", "seven").
  2. **CURRENCY:** ALWAYS use symbols and digits (e.g., "$500", "$10,000", "$2 Million").
  3. **TIME:** Use colon format (e.g., "6:00 AM", "4:30 PM").
  4. **DATES:** Use numeric format (e.g., "23 January 2025", "Oct 12, 1998").
`;

// --- PRO COMMAND STUDIO (CHAT) ---
export const sendChatCommand = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  message: string,
  channelContext: string,
  wordCountTarget: number, // If 0, treat as normal chat. If > 0, treat as script mode.
  stealthInstructions?: string
): Promise<string> => {
  
  // Conditionally add length constraints
  let lengthConstraint = "";
  if (wordCountTarget > 0) {
    lengthConstraint = `
    SYSTEM OVERRIDE: The user has activated Script Generation Mode. 
    You MUST generate an output of approximately ${wordCountTarget} words total (across all parts). 
    Ignore input length; focus solely on making the response this long.
    CURRENT CHUNK GOAL: Maximize length for this specific response (hit token limit if possible).
    `;
  } else {
    lengthConstraint = "MODE: Normal Chat. Respond naturally to the user's prompt without specific length constraints unless asked.";
  }

  // Construct the System Instruction with Silent Mode & Clean Text Rules
  const systemInstruction = `
    You are a specialized Script Generation Engine for the YouTube channel: "${channelContext}".
    
    ⛔ STRICT CLEAN TEXT POLICY (MANDATORY):
    1. **NO FORMATTING:** Do NOT use bold (**text**), italics (*text*), headers (###), or markdown lists.
    2. **RAW TEXT ONLY:** Output purely in plain text paragraphs.
    3. **NO FILLER:** Do NOT say "Sure", "Here is the script", "Part 1", or "Continued below". Start the story/script immediately.
    4. **NO TITLES:** Do NOT include a title unless explicitly asked in the prompt.
    5. **NO END MARKERS:** Do NOT write [End], [To be continued], etc. Just stop writing when done.
    
    ${NUMERIC_FORMATTING_RULES}
    
    ${lengthConstraint}
    
    TONE: Strictly adhere to the style of "${channelContext}".
    
    ${stealthInstructions ? `>>> MANUAL GUIDANCE (HIDDEN): ${stealthInstructions} <<<` : ''}
    
    ACTION: Execute the user's command below with high precision, maintaining the 'Clean Text' policy.
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
    history: history
  });

  const response = await chat.sendMessage({ message: message });
  return response.text || "";
};

// --- STORY & SCRIPT WRITER ---

// Helper to map tones to prompt directives
const getToneDirectives = (tone: string): string => {
  switch (tone) {
    case 'Secret / Unspoken Truth': return "Use hushed, whispered tones. Use phrases like 'I never told anyone...' or 'This was buried for years...'.";
    case 'Revenge / Karma ( প্রতিশোধ )': return "Focus on the injustice first, then a satisfying, sharp, and justified comeback. Use a strong, assertive voice.";
    case 'Mystery ( Rohosso )': return "Focus on unanswered questions, strange details, and building curiosity.";
    case 'Heart-Breaking ( Painful )': return "Focus on tragedy, silence, tears, and heavy emotion.";
    case 'Eerie & Haunting': return "Use atmospheric descriptions (shadows, cold air) to create mild fear/unease.";
    case 'Confessional': return "Direct address to the audience, highly personal and vulnerable.";
    case 'Twist / Shocking Reveal': return "Build towards a major unexpected turn of events.";
    case 'Dramatic & Intense': return "High energy, emotional peaks, rapid pacing.";
    case 'Suspense / Thriller': return "Maintain high tension, withhold information, extend moments of unease.";
    case 'Heart-Touching ( Emotional )': return "Evoke warmth, positive tears, and moving sentiment.";
    case 'Motivational & Inspirational': return "Uplifting, empowering, focus on overcoming odds.";
    case 'Empathetic & Gentle': return "Soft, understanding, soothing narrative voice.";
    case 'Friendly & Casual': return "Conversational, like talking to a friend, slang allowed if appropriate.";
    case 'Family Drama': return "Focus intensely on domestic tension and relational conflict (e.g., between spouses, in-laws, or siblings). Highlight passive-aggressive remarks, dining table arguments, and the feeling of betrayal within the safety of one's home. The emotional stakes must feel personal and grounded in realistic family dynamics.";
    default: return "";
  }
};

export const generateStoryScript = async (params: {
  channelName: string;
  channelType: 'STORY' | 'FACTORY' | 'PSYCH' | 'CRIME';
  lang: string;
  title: string;
  tone: string;
  count: number;
  reference?: string;
  hasImagePrompts?: boolean;
  crimeCategory?: string;
  openingStyle?: string;
}): Promise<string> => {
  let prompt = "";
  const refText = params.reference ? `\nREFERENCE / INPUT: "${params.reference}"` : "";

  // --- SMART PACING LOGIC ---
  let pacingInstruction = "";
  if (params.count < 1000) {
    pacingInstruction = `
      *** STRICT LENGTH CONSTRAINT: SHORT STORY MODE ***
      - The user wants a SHORT story (approx ${params.count} words).
      - DO NOT use micro-detailing.
      - Move the plot quickly.
      - Start the conflict immediately and reach the resolution fast.
      - Finish the story completely within the word limit.
    `;
  } else if (params.count < 3000) {
    pacingInstruction = `
      *** STANDARD PACING MODE ***
      - The user wants a MEDIUM length story (approx ${params.count} words).
      - Use descriptive language but keep the narrative moving.
      - Balance dialogue and internal monologue.
    `;
  } else {
    pacingInstruction = `
      *** ACTIVATE EXPANSION MODE: EPIC LENGTH ***
      - The user wants an Epic Length (approx ${params.count} words).
      - Use extreme sensory details, slow down time, extend dialogues.
      - Maximize output to hit the high word count.
    `;
  }

  // --- CHANNEL SPECIFIC LOGIC ---

  if (params.channelName === "Aunt Mae's Fireside Stories") {
    // Determine tone directive
    const toneDirective = getToneDirectives(params.tone);
    const toneString = toneDirective ? `${params.tone} — ${toneDirective}` : `${params.tone} (Starts vulnerable, ends triumphant/peaceful)`;
    
    // Explicit Instruction for Channel 1 Theme
    const storyInstruction = params.reference 
      ? `Topic/Plot provided by User: "${params.reference}". Write the script based strictly on this specific theme and instruction.` 
      : "";

    // BRANDING OVERRIDE (Force Aunt Mae's Branding)
    const channelBrandingName = "Aunt Mae's Fireside Stories";

    // Smart Chunking Logic for Start - FORCE THUMBNAIL IN BOTH CASES
    let chunkingInstruction = "";
    if (params.count > 4000) {
        chunkingInstruction = `
        *** STRATEGY: MAX-EXPANSION (PART 1 - START) ***
        - **Target:** The user wants a total of ${params.count} words.
        - **Current Goal:** Write the first ~3,500 words.
        - **Structure Adjustment:** Execute Steps 1-5 (Hook to Climax) in extreme detail. STOP before resolution if token limit is reached.
        - **SYSTEM OVERRIDE (THUMBNAIL):** You **MUST** generate the Thumbnail Prompt at the very end of THIS response, regardless of story completion.
        `;
    } else {
        chunkingInstruction = `
        *** STRATEGY: COMPLETE STORY (SINGLE RESPONSE) ***
        - Write the FULL story (Steps 1-7) within approx ${params.count} words.
        - **MANDATORY:** Generate the Thumbnail Prompt at the very end.
        `;
    }

    // Channel 1: "Betty Stories" Viral Blueprint
    prompt = `
      ACT AS A VIRAL YOUTUBE STORYTELLER ("BETTY STORIES" STYLE).
      
      >>> CORE OBJECTIVE <<<
      Write a gripping, emotional, and satisfying first-person confession.
      The story must sound like a REAL person talking to a friend. 
      NO "Novel" language. NO fancy words. Use simple, punchy, emotional English (CEFR B1).
      
      >>> 7-STEP VIRAL BLUEPRINT (STRICT EXECUTION ORDER) <<<
      
      1. **THE SHOCK HOOK (0:00-0:30s)**
         - **MANDATORY:** Start IMMEDIATELY with a **Shocking Dialogue** or **Action** from the climax (In Media Res).
         - **Goal:** Create a "Narrative Trap" using the Curiosity Gap. Make the viewer ask "WHY?".
         - **Length:** Strictly 3-4 powerful sentences.
         - **Tone Logic:**
            - If Tone is 'Revenge': Start with a hidden trap or calm before storm.
            - If Tone is 'Sadness': Start with a devastating moment of loss/betrayal.
            - If Tone is 'Family Drama': Start with a shocking argument or secret revealed.
         - **Example Vibe:** "My mother-in-law smiled as she burned my wedding dress. She said, 'He never loved you anyway.' But she didn't know I was recording everything."
      
      2. **THE CHANNEL INTRO (VERBATIM)**
         - Insert exactly: "Welcome to Aunt Mae's Fireside Stories. I am very happy to have you here. Before we move on, please like this video, subscribe to the channel, and listen to the entire story carefully. At the end of the video, share your opinion in the comments on how you would handle such a situation. And... now let's get back to my story."
      
      3. **THE BACKSTORY (Context)**
         - Transition: "It all started [Timeframe] ago..."
         - Establish: "I" am hardworking/kind. The Antagonist (MIL/Husband/Sister) is ungrateful/cruel.
         - Language: Use CEFR B1 Level (Simple English). No big words. Use words like "Heartbroken", "Angry", "Scared", "Happy".
      
      4. **THE ESCALATION (Rising Action)**
         - Describe specific incidents of abuse or betrayal building up.
         - Example: "She threw my food away", "He forgot my birthday".
         - Format: Dense paragraphs. NO lists.
      
      5. **THE CLIMAX (The Turning Point)**
         - The moment "I" fight back or the truth is revealed.
         - Instruction: Slow down. Write the dialogue word-for-word. High drama.
      
      6. **THE KARMIC RESOLUTION**
         - The Villain MUST suffer a consequence (jail, poverty, loneliness).
         - The Hero MUST find peace or success.
      
      7. **THE OUTRO (Engagement)**
         - Moral: "This taught me that..."
         - Question: "What would you have done?"
         - CTA: "If you want to see and hear more **Emotional, Shocking, Twist, Suspense, and Revenge** stories like this, please subscribe to **'Aunt Mae's Fireside Story'**."
         - Closing: "Thank you so much for watching today's video with full attention. Until next time."

      >>> TECHNICAL CONSTRAINTS <<<
      - **Perspective:** First-Person ("I"). Single Story. Biography Style.
      - **Tone:** ${toneString}
      - **Length:** Approx ${params.count} words.
      - **Formatting:** NO bold text. NO headers. NO markdown.
      - **Numbers:** Use digits ($500, 5 years).
      
      >>> SOURCE MATERIAL <<<
      Plot/Theme: "${params.reference || "A dramatic family betrayal and revenge story."}"
      
      ${chunkingInstruction}
      
      ${NUMERIC_FORMATTING_RULES}

      MANDATORY OUTPUT RULE:
      1. Write the script following the 7 steps seamlessly.
      2. At the very end, insert "|||THUMBNAIL_SPLIT|||" and then the Image Prompt.

      **STEP 8: THE THUMBNAIL PROMPT (IMMEDIATE AFTER SPLIT):**
         - **VISUAL STYLE (VIRAL "BETTY STORIES" AESTHETIC):**
           1. **CHARACTER DESIGN:** ALWAYS African American. Front-Facing. Modern Hair (Afro/Braids/Sleek).
           2. **FASHION:** Use VIBRANT SOLID COLORS (Red, Royal Blue, Emerald Green, Mustard Yellow). Avoid dull colors.
           3. **MAKEUP/INJURY LOGIC:** 
              - Glamour/Villain: "Glossy Red Lipstick", "Gold Earrings", "Sharp Contour".
              - Victim/Sadness: "Visible Purple Bruise on cheek", "Swollen Eye", "Smudged Mascara", "Tears".
           4. **LIGHTING:** Intense Bokeh background (City lights/Warm interiors).

         - **TEMPLATE (Fill strictly and keep structure):**
         "A hyper-realistic cinematic medium-shot capturing [Dramatic Summary based on Title/Hook]. [Character A Details]: An African American [Age/Gender], [Action: e.g., holding a letter], wearing [Vibrant Outfit Color & Style], looking [Expression: e.g., Shocked/Crying] with [Specific Makeup/Injury Detail: e.g., Red Lipstick / Bruised Cheek]. [Character B Details]: An African American [Age/Gender], standing [Position relative to A], wearing [Contrast Color Outfit], [Action: e.g., Smirking/Shouting] with [Expression]. [Character C Details]: (Only if Title mentions a 3rd person) An African American [Child/Man/Woman], [Action/Expression]. Context: [Brief conflict description]. Environment: A blurred [Location] with intense [Type of Lighting/Bokeh]. Tech Specs: Shot on Canon 5D Mark IV, 85mm lens, f/1.8, high texture detail, skin pores visible, soft cinematic lighting, 8k, photorealistic, --style raw --v 6.0 --ar 16:9"
    `;
  } 
  else if (params.channelName === "Untold Mysteries Cases") {
    // Channel 5: Deep Logic for True Crime
    const category = params.crimeCategory || "General Crime";
    
    prompt = `
      ACT AS A SENIOR TRUE CRIME DOCUMENTARY WRITER (Netflix/HBO Style).

      TASK: Write a gripping, atmospheric script for "Untold Mysteries Cases".
      CATEGORY: ${category}
      TARGET LENGTH: Approx ${params.count} words.
      
      ${pacingInstruction}
      
      ${NUMERIC_FORMATTING_RULES}
      
      INPUT FACTS (CRITICAL SOURCE MATERIAL):
      "${params.reference}"

      INSTRUCTION:
      1. ANALYZE the "INPUT FACTS" to determine the Victim's name and the Incident details automatically.
      2. ANALYZE the "INPUT FACTS" to extract the victim, timeline, and core mystery.
      3. GENERATE a script following the strict structure below.

      ⛔ STRICT CLEAN TEXT POLICY (NEGATIVE CONSTRAINTS):
      - **FORBIDDEN START:** No "**Narrator:**", "## Title", "(Scene Start)", or "[Intro]". Start directly with the first sentence of the story.
      - **FORBIDDEN END:** No "(Scene End)", "(Fade Out)", "***", "[End of Transcript]", or generic outros. The text must stop exactly at the final period of the story.
      - **FORBIDDEN MIDDLE:** No script directions like "(beat)", "(pause)", "(crying)". Use narrative description instead (e.g., "Her voice cracked").
      - **FORMAT:** Continuous paragraphs only. No script format.

      STRICT NARRATIVE RULES & STRUCTURE:

      A. **THE OPENING (The "Normalcy" Setup):**
         - Rule: Start with the weather, time of day, and the specific date to set the mood.
         - Style: Use "Atmospheric Narrative". Example: "It was the kind of afternoon that never seemed dangerous..." OR "The emergency line crackles to life... 4:17 in the morning."
         - Focus: Contrast the ordinary day with the horror about to happen.

      B. **THE VICTIM INTRO:**
         - Rule: Humanize the victim with small, specific details (e.g., "red lunchbox", "always checked her homework", "stuffed rabbit").
         - Goal: Make the audience care about the person, not just the case stats.

      C. **THE TIMELINE & SUSPENSE:**
         - Rule: Use exact timestamps (e.g., "3:40 p.m.", "By 4:15...").
         - Rule: Build slow dread. Describe the physical sensation of panic (e.g., "The uneasy calm turned into confusion").

      D. **SENSORY DETAILS (Show, Don't Tell):**
         - Weave audio cues into the text description: "Windshield wipers rhythmically ticking", "Radios crackling", "Forklift beeps".
         - Weave visuals: "Yellow school buses", "Flashlights sweeping through tall grass".

      E. **STRUCTURE:**
         - Para 1: Atmospheric Intro (Setting the scene).
         - Para 2: The "Last Seen" Moment (The Incident).
         - Para 3: The Discovery/Panic (Family reaction).
         - Para 4: The Investigation (Police/Search/Clues).
         - Para 5: The Cliffhanger/Current Status (The mystery remains).

      3. **TONE:**
         - Dark, serious, empathetic, and observant.
         - No sensationalism—just heavy, gripping facts wrapped in high-quality storytelling.

      4. **TASK B: INVESTIGATIVE SUMMARY FOOTER (MANDATORY IF FINISHED):**
         - If and ONLY if you reach the end of the story within the token limit, insert a separator line "---" and append the analysis block.
         
         Format to Append:
         ---
         📁 **CASE SUMMARY**
         🔒 **Status:** [DEDUCE: Solved / Unsolved / Cold Case]
         ⏳ **Timeframe:** [DEDUCE: e.g. "30 Years" or "Ongoing"]
         🔍 **Key Conclusion:** [DEDUCE: 1 succinct sentence summarizing the outcome]
    `;
  }
  else if (params.channelName === "NexShift Factory Zone") {
    // Channel 2: Factory Logic (Dynamic VEO 3 Structure with Source-to-Factory Arc)
    const totalPrompts = Math.max(15, params.count); // Minimum to ensure full arc
    // Fixed Prompts: 4 (Phase 0) + 1 (Intro) + 2 (Outro) = 7
    const fixedPrompts = 7; 
    const dynamicPrompts = totalPrompts - fixedPrompts;
    const promptsPerPhase = Math.max(1, Math.round(dynamicPrompts / 5));

    prompt = `
      ACT AS A CINEMATIC DIRECTOR AND MANUFACTURING PROCESS EXPERT (VEO 3 SPECIALIST).
      
      TASK: Create a structured "VEO 3 Video Generation Plan" for "NexShift Factory Zone".
      TOPIC: ${params.title}
      TOTAL TARGET PROMPT COUNT: ${totalPrompts} (Approx)
      ${refText}
      
      CONTEXT LOGIC (PHASE 0):
      - If Topic is Food/Fruit -> Generate Farm/Plantation/Orchard scenes.
      - If Topic is Metal/Tech -> Generate Mine/Quarry/Extraction scenes.
      - If Topic is Plastic/Chemical -> Generate Oil Rig/Refinery/Lab scenes.

      CALCULATION PROTOCOL:
      - Fixed Scenes: 4 Source Scenes + 1 Intro + 2 Outro = 7 Scenes.
      - Dynamic Production Scenes: ~${dynamicPrompts} scenes.
      - DISTRIBUTION: You MUST generate approximately ${promptsPerPhase} unique prompts for EACH of the 5 Production Phases inside the factory.

      STRICT OUTPUT TEMPLATE (DO NOT DEVIATE):

      (Start Script)

      🎬 **Video Title**
      "How ${params.title} Is Made Today: From Source to Factory"

      🌿 **PHASE 0: The Origin & Harvest**
      *The journey begins at the source.*

      **Prompt 1 (Environmental Shot):**
      A cinematic drone shot of a massive [SOURCE ENV: e.g. Banana Plantation, Wheat Field, Quarry] related to ${params.title} under morning sunlight. 4K realistic nature landscape.
      **🎧 Sound:** Nature ambience, birds chirping, wind rustling.

      **Prompt 2 (Harvest/Extraction Action):**
      Farmers/Workers carefully [ACTION: e.g. cutting, mining, picking] raw material for ${params.title} by hand or using harvester machines. High detail close-up.
      **🎧 Sound:** Snipping sounds, rustling leaves, or digging noises.

      **Prompt 3 (Initial Prep/Cleaning):**
      The raw material is being [ACTION: dipped in water tanks / sorted / loaded] right on the field/site.
      **🎧 Sound:** Water splashing, wooden crate impacts, or heavy thuds.

      **Prompt 4 (Transport Logic):**
      A convoy of heavy transport trucks loaded with the raw material driving down a road and approaching the massive "NexShift Modern Factory" gates.
      **🎧 Sound:** Heavy truck engine rumble, air brakes hissing.

      ________________________________________

      🎬 **Scene 1: Introduction with Worker**
      **Prompt:**
      A cinematic 3D-rendered modern factory interior. The transport trucks from Phase 0 are backing into the loading dock in the background. A worker in uniform stands confidently in the foreground, smiling toward the camera.
      The worker says:
      “Welcome! Our raw materials have just arrived. Today, I’ll show you exactly how ${params.title} is made — from start to finish!”
      **🎧 Voiceover:** Friendly tone.
      **🎵 Sound Effects:** Truck beeping in reverse, industrial door opening, machine hum.
      **🎥 Style:** Realistic lighting, lifelike textures, shallow depth of field, professional factory atmosphere.

      ________________________________________

      🏭 **PRODUCTION PHASES**
      *(Auto-Distribute ${promptsPerPhase} prompts across each phase)*

      **PHASE 1: Raw Materials & Preparation**
      **Prompt 1 (Unloading/Intake):** [Visual Description of trucks unloading raw ${params.title} material]
      **🎧 Sound:** [Specific Audio]
      **Prompt 2 (Inspection/Cleaning):** [Visual Description]
      **🎧 Sound:** [Specific Audio]
      *(Continue until Prompt ${promptsPerPhase} for this phase)*

      **PHASE 2: Mixing & Processing**
      **Prompt 1:** [Visual Description]
      **🎧 Sound:** [Specific Audio]
      *(Continue until Prompt ${promptsPerPhase} for this phase)*

      **PHASE 3: Transformation / Core Production**
      **Prompt 1:** [Visual Description]
      **🎧 Sound:** [Specific Audio]
      *(Continue until Prompt ${promptsPerPhase} for this phase)*

      **PHASE 4: Filling / Assembly / Packaging**
      **Prompt 1:** [Visual Description]
      **🎧 Sound:** [Specific Audio]
      *(Continue until Prompt ${promptsPerPhase} for this phase)*

      **PHASE 5: Quality Check & Distribution**
      **Prompt 1:** [Visual Description]
      **🎧 Sound:** [Specific Audio]
      *(Continue until Prompt ${promptsPerPhase} for this phase)*

      ________________________________________

      🎬 **ENDING SEQUENCES**
      **Prompt 1 (Worker Outro):**
      The worker reappears smiling proudly holding the final ${params.title}:
      “And that’s the journey of ${params.title} — from the earth to your hands!”
      **🎧 Voiceover:** Confident and friendly.
      **🎧 Sound:** Calm industrial ambiance fading out.

      **Prompt 2 (Subscribe Call-to-Action):**
      End card animation showing “Subscribe for more AI factory tours and process documentaries.”
      **🎵 Sound:** Light whoosh + upbeat outro chime.

      (STOP WRITING HERE. DO NOT ADD ANY STYLE FOOTERS OR METADATA. The response ends when the Outro Sound effect is described.)
    `;
  }
  else if (params.channelName === "Relatos del Espíritu Libre") {
    // Channel 3: Spanish Doctor/Medical Persona Logic (PRESERVED)
    prompt = `
      ACT AS A SENIOR MEDICAL DOCTOR OR CLINICAL PSYCHOLOGIST (Specialist in Mental Health & Physiology).
      
      TASK: Write a video script in SPANISH (Español) for "Relatos del Espíritu Libre".
      TOPIC: ${params.title}
      TONE: ${params.tone} (Must be authoritative, empathetic, and clinical yet accessible).
      LENGTH: Approx ${params.count} words.
      ${refText}
      
      ${NUMERIC_FORMATTING_RULES}

      STRICT DOCTOR PERSONA & STRUCTURE:

      1. **THE DIAGNOSIS (The Hook):**
         - Identify the symptom or feeling immediately.
         - Address the viewer directly as a patient/friend.
         - *Style:* "Si sientes fatiga crónica, fisiológicamente esto significa..." (If you feel chronic fatigue, physiologically this means...).

      2. **THE CHANNEL INTRO:**
         - Standard: "Bienvenido a Relatos del Espíritu Libre..."

      3. **THE EXPLANATION (Biological/Psychological Deep Dive):**
         - Explain the *why* using medical/scientific context but simple words.
         - **MANDATORY PHRASES to use:**
           - "Desde mi perspectiva médica..." (From my medical perspective...)
           - "Como especialista en salud mental..." (As a mental health specialist...)
           - "Tu sistema nervioso..." (Your nervous system...)
           - "La neurociencia nos indica..." (Neuroscience indicates...)

      4. **THE SOCIAL CONFLICT (Society vs. Biology):**
         - Explain why society gets it wrong compared to how the body actually works.

      5. **THE PRESCRIPTION (Actionable Advice):**
         - Give concrete "health solutions" or "mental exercises".
         - Use phrase: "Mi recomendación clínica es..." (My clinical recommendation is...).

      6. **CONCLUSION:**
         - Final empowering message validating their health and spirit.
         - Vibe: "Escucha bien, porque esto no es solo tristeza, es tu sistema nervioso pidiendo una pausa."
    `;
  }
  else if (params.channelName === "Story Mission Forever") {
    // Channel 4: Story + Image Prompts (PRESERVED)
    const toneDirective = getToneDirectives(params.tone);
    const toneString = toneDirective ? `${params.tone} — ${toneDirective}` : params.tone;

    prompt = `
      ACT AS A MASTER STORYTELLER FOR YOUTUBE.
      
      TASK: Write an engaging story script for "Story Mission Forever".
      TITLE: ${params.title}
      TONE: ${toneString}
      LENGTH: Approx ${params.count} words.
      ${refText}
      
      ${NUMERIC_FORMATTING_RULES}

      STRUCTURE:
      1. **THE HOOK:** 3-4 lines. High engagement.
      2. **CHANNEL INTRO:** "Welcome to Story Mission Forever..."
      3. **MAIN STORY:** Broken into clear paragraphs.
      4. **OUTRO:** A twist or question + Subscribe.

      IMPORTANT: At the very end of the script, add a section called "### IMAGE PROMPTS" and list a visual AI image generation prompt for every key scene in the story.
    `;
  }
  else {
    // Fallback
    prompt = `Write a video script for ${params.channelName} about ${params.title}. Length: ${params.count} words. ${refText}\n${NUMERIC_FORMATTING_RULES}`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return response.text?.trim() || "Failed to generate script.";
};

export const continueStoryScript = async (
  lastContext: string,
  channelName: string,
  currentWordCount?: number,
  targetWordCount?: number
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let lengthInstruction = "";
  let footerInstruction = "";
  let toneInstruction = "Maintain the same dark, gritty, observant tone."; // Default tone
  
  // Base pacing based on target (if known)
  const isShortStory = targetWordCount !== undefined && targetWordCount < 1000;
  
  if (isShortStory) {
     lengthInstruction = "GOAL: Short Story mode. Move plot efficiently. Avoid unnecessary padding.";
  } else {
     lengthInstruction = "GOAL: Generate another ~3,000 words (Max Token Limit). Maximize verbosity. Use 'Atmospheric Narrative' style.";
  }

  // Specific logic for Aunt Mae Story
  if (channelName === "Aunt Mae's Fireside Stories") {
      toneInstruction = "Maintain a heartwarming, emotional, and dramatic tone. First person 'I' perspective. USE SIMPLE ENGLISH (CEFR B1).";
      
      // STRICT NEGATIVE CONSTRAINT FOR CHANNEL 1
      footerInstruction = `
      NEGATIVE CONSTRAINT (STRICT):
      - **NO HEADERS/LABELS:** Do NOT write "**Conclusion**", "**Part 2**", or use any bold text. Continue the narrative seamlessly.
      - **ABSOLUTE PROHIBITION:** Do **NOT** generate any "Case Summary", "Status", "Timeframe", or "Conclusion" at the end.
      - **STOPPING POINT:** The script MUST stop immediately after the Final Sign-off (Subscribe/Like) and before any Metadata Assets if they were already generated.
      - Do not add horizontal lines "---".
      
      **CHANNEL 1 PROTOCOL (CONTINUATION):**
      
      *** CRITICAL ANTI-REPETITION PROTOCOL ***
      - **CHECK CONTEXT:** Read the 'PREVIOUS CONTEXT' provided above carefully.
      - **NO REPETITION:** Do NOT start with the same sentence or paragraph as the previous chunk. 
      - **FORWARD MOTION:** Pick up exactly where the last word left off and move the plot forward.
      `;

      if (!isShortStory) {
        lengthInstruction = `
        GOAL: MAXIMUM EXPANSION MODE (ANTI-BREVITY).
        - Pick up exactly where you cut off and keep writing for another 3,500 words.
        - Drown the script in sensory details to maximize word count.
        - Describe the "silence" or "atmosphere" for 200 words if needed.
        `;
      } else {
        lengthInstruction = "GOAL: Continue story naturally. Keep pacing consistent with a short story.";
      }

      // CRITICAL UPDATE: Respect Target Limits to avoid Infinite Loops
      if (currentWordCount !== undefined && targetWordCount !== undefined) {
          if (currentWordCount >= targetWordCount) {
             lengthInstruction = `
             CRITICAL OVERRIDE: TARGET WORD COUNT REACHED (${currentWordCount} / ${targetWordCount}).
             - The user's target length has been met.
             - IMMEDIATELY begin the "Resolution & Karma Outro" sequence.
             
             GLOBAL ENDING REQUIREMENT (Overrides Tone):
               1. **Consequence:** Briefly wrap up the antagonist's fate.
               2. **Audience Question:** Ask a debatable question.
               3. **CTA (Verbatim):** "If you want to see and hear more **Emotional, Shocking, Twist, Suspense, and Revenge** stories like this, please subscribe to **'Aunt Mae's Fireside Story'**."
               4. **Like Request:** Ask for a like.
               5. **Closing (Verbatim):** "Thank you so much for watching today's video with full attention. Until next time."
             - Do NOT expand further. Wrap up the story narrative naturally but efficiently in this response.
             - **IMPORTANT:** After the final closing line, output the separator "|||THUMBNAIL_SPLIT|||" followed by the Midjourney Image Prompt.
             
             **THUMBNAIL FORMATTING RULE (VIRAL "BETTY STORIES" STYLE):** 
             - **Design:** African American, Front-Facing, Vibrant Colors (Red/Blue/Green), Context-Aware Makeup/Injuries (Red Lipstick vs. Bruises).
             - Output as a SINGLE CONTINUOUS PARAGRAPH. No line breaks.
             - Use the exact structure below:
             "A hyper-realistic cinematic medium-shot capturing [Dramatic Summary based on Title/Hook]. [Character A Details]: An African American [Age/Gender], [Action: e.g., holding a letter], wearing [Vibrant Outfit Color & Style], looking [Expression: e.g., Shocked/Crying] with [Specific Makeup/Injury Detail: e.g., Red Lipstick / Bruised Cheek]. [Character B Details]: An African American [Age/Gender], standing [Position relative to A], wearing [Contrast Color Outfit], [Action: e.g., Smirking/Shouting] with [Expression]. [Character C Details]: (Only if Title mentions a 3rd person) An African American [Child/Man/Woman], [Action/Expression]. Context: [Brief conflict description]. Environment: A blurred [Location] with intense [Type of Lighting/Bokeh]. Tech Specs: Shot on Canon 5D Mark IV, 85mm lens, f/1.8, high texture detail, skin pores visible, soft cinematic lighting, 8k, photorealistic, --style raw --v 6.0 --ar 16:9"
             `;
          } else if (targetWordCount - currentWordCount < 500) {
             lengthInstruction = `
             GOAL: APPROACHING TARGET (${currentWordCount} / ${targetWordCount}).
             - You are within 500 words of the limit.
             - Begin to resolve the conflict and move towards the climax.
             - Maintain detailed description but steer towards the ending.
             - Do NOT start new subplots.
             `;
          } else if (targetWordCount - currentWordCount >= 1000) {
             // Re-affirm expansion if far from target
             lengthInstruction += `
             - STATUS: You are at ${currentWordCount} words. Target is ${targetWordCount}.
             - Keep expanding significantly.
             `;
          }
      }
  }
  // Smart Completion Logic for Channel 5
  else if (channelName === "Untold Mysteries Cases") {
     toneInstruction = "Maintain the same dark, gritty, true-crime documentary tone.";
     
     // STRICT FOOTER INSTRUCTION FOR CHANNEL 5 ONLY
     footerInstruction = `
     IF THE STORY CONCLUDES IN THIS CHUNK:
     - You MUST append the "INVESTIGATIVE SUMMARY FOOTER" (Status/Timeframe/Conclusion).
     `;

     if (currentWordCount !== undefined && targetWordCount !== undefined) {
        if (currentWordCount >= targetWordCount) {
           lengthInstruction = "GOAL: The User Target Word Count has been met. IMMEDIATELY wrap up the story. Provide the conclusion and add the INVESTIGATIVE SUMMARY FOOTER.";
        } else if (targetWordCount - currentWordCount < 500) {
           lengthInstruction = `GOAL: You are approaching the target of ${targetWordCount} words (Current: ${currentWordCount}). Start wrapping up the narrative in this response. DO NOT force the story to expand unnecessarily if the target is already met.`;
        } else if (!isShortStory) {
           lengthInstruction = `GOAL: User Target: ${targetWordCount} words. Current: ${currentWordCount} words. Continue with "Maximum Expansion" mode (sensory details, slow pacing) to reach the target.`;
        }
     }
  }

  const prompt = `
    ACT AS A SENIOR WRITER FOR CHANNEL: "${channelName}".
    
    TASK: The previous script output was truncated or needs to be longer. 
    INSTRUCTION: Pick up EXACTLY where the text below left off and continue writing.
    
    ${lengthInstruction}
    
    ${NUMERIC_FORMATTING_RULES}
    
    LAST PARAGRAPH CONTEXT:
    "...${lastContext}"
    
    RULES:
    1. Do NOT repeat the "LAST PARAGRAPH CONTEXT".
    2. Start immediately with the next sentence/word.
    3. ${toneInstruction}
    4. ${footerInstruction}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return response.text?.trim() || "Failed to continue script.";
};

// --- SPEECH GENERATION (TTS) ---
export const generateSpeech = async (
  text: string,
  voiceName: string,
  emotion: string,
  personaDescription: string,
  language: string,
  speed: string = 'Normal',
  cloningStrength: number = 100,
  onProgress?: (msg: string) => void
): Promise<string> => {
  if (onProgress) onProgress("Initializing TTS Model...");

  const promptText = `Say the following text with a ${emotion} tone, speaking at ${speed} speed, in ${language}. 
  Context/Persona: ${personaDescription}.
  
  Text: "${text}"`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: { parts: [{ text: promptText }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName as any },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated.");
  
  return base64Audio;
};

// --- VOICE ANALYSIS ---
export const analyzeVoiceSample = async (audioBlob: Blob): Promise<VoiceAnalysisResult> => {
  const base64Audio = await blobToBase64(audioBlob);

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      matchConfidence: { type: Type.NUMBER, description: "0-100 score of how well this voice can be cloned" },
      audioQuality: { type: Type.STRING, enum: ["Excellent", "Good", "Poor"] },
      detectedPitch: { type: Type.STRING },
      detectedPace: { type: Type.STRING },
      accent: { type: Type.STRING },
      suggestedBaseVoice: { type: Type.STRING, enum: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] },
      personaDescription: { type: Type.STRING, description: "Detailed persona description for prompting" },
      gender: { type: Type.STRING, enum: ["Male", "Female"] }
    },
    required: ["matchConfidence", "audioQuality", "detectedPitch", "detectedPace", "accent", "suggestedBaseVoice", "personaDescription", "gender"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: audioBlob.type || 'audio/wav', data: base64Audio } },
        { text: "Analyze this voice sample and provide a detailed structured analysis for voice cloning configuration." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '{}') as VoiceAnalysisResult;
};

// --- SCRIPT REWRITER ---
export const rewriteScript = async (
  script: string,
  mode: 'Creative' | 'Humanize' | 'Translate',
  target: string,
  wordCount: string,
  channelName: string,
  addHook: boolean,
  addIntro: boolean,
  autoChangeNames: boolean,
  autoChangeAges: boolean,
  autoChangeLocations: boolean
): Promise<string> => {
  let instruction = "";
  
  if (mode === 'Translate') {
    instruction = `Translate the following script to ${target}. Maintain original tone and formatting.`;
  } else if (mode === 'Humanize') {
    instruction = `Rewrite the following script to make it sound 100% natural, human-like, and conversational for YouTube. Target Vibe: ${target}. Remove any robotic phrasing.`;
  } else {
    // Creative
    instruction = `Creatively rewrite this script. Target Vibe: ${target}. 
    ${wordCount ? `Target Word Count: ${wordCount}.` : ''}
    ${addHook ? "Add a viral hook at the start." : ""}
    ${addIntro ? `Add a channel intro for '${channelName}'.` : ""}
    ${autoChangeNames ? "Change all names to new fictional ones." : ""}
    ${autoChangeAges ? "Randomize ages mentioned." : ""}
    ${autoChangeLocations ? "Change locations to different suitable settings." : ""}
    `;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${instruction}\n\nInput Script:\n${script}`
  });

  return response.text?.trim() || "Rewrite failed.";
};

// --- IMAGE GENERATION ---
export const generateImage = async (
  prompt: string,
  referenceImage?: File | Blob,
  options: { is4K: boolean; aspectRatio: string; enhanceRealism: boolean } = { is4K: false, aspectRatio: "16:9", enhanceRealism: false }
): Promise<string> => {
  const model = (options.is4K || options.enhanceRealism) ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const parts: any[] = [];
  
  if (referenceImage) {
    const base64Ref = await blobToBase64(referenceImage);
    parts.push({
      inlineData: {
        data: base64Ref,
        mimeType: referenceImage.type || 'image/png'
      }
    });
  }
  
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: options.aspectRatio as any,
        imageSize: options.is4K ? '4K' : '1K' // imageSize only works on Pro
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  
  throw new Error("No image generated.");
};

export const generateImagePromptsFromScript = async (script: string): Promise<string[]> => {
  const schema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: "List of image prompts"
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the following video script and generate a list of 5-10 highly detailed AI image generation prompts that visualize the key scenes.
    
    Script:
    ${script}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '[]') as string[];
};

// --- TRANSCRIPT TRANSLATION ---
export const translateTranscript = async (
  segments: TranscriptSegment[],
  targetLanguage: string
): Promise<{ fullText: string; segments: TranscriptSegment[] }> => {
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      fullText: { type: Type.STRING },
      segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING },
            text: { type: Type.STRING }
          }
        }
      }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Translate the following transcript segments to ${targetLanguage}. Maintain the timestamps.
    
    Input: ${JSON.stringify(segments.slice(0, 50))}... (truncated for context if large, logic handled in batch if needed)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '{}');
};

// --- YOUTUBE SEO ---
export const generateYouTubeSEO = async (
  title: string, 
  style: string, 
  script: string, 
  generateHook: boolean
): Promise<YouTubeSEOResult & { viralHook?: string }> => {
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      optimizedTitle: { type: Type.STRING },
      description: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      seoScore: { type: Type.NUMBER },
      competitors: { 
        type: Type.ARRAY, 
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            score: { type: Type.NUMBER }
          }
        }
      },
      viralHook: { type: Type.STRING }
    }
  };

  const prompt = `Act as a YouTube SEO Expert. 
  Video Title: "${title}"
  ${style ? `Style Reference: "${style}"` : ''}
  ${script ? `Context from Script: "${script.substring(0, 1000)}..."` : ''}
  ${generateHook ? "Generate a viral text hook." : ""}
  
  Generate an optimized title, description, tags, and a predicted SEO score (0-100). Also provide 3-5 hypothetical competitor titles with high scores.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateTitleFromScript = async (script: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Read this script and generate ONE viral, high-CTR YouTube title for it. Output only the title text.
    
    Script: ${script.substring(0, 3000)}`
  });
  return response.text?.trim() || "";
};

// --- TRENDING RESEARCH ---
export const generateTrendAnalysis = async (
  type: 'EXPLORE' | 'TRACKER' | 'FORECAST' | 'COMPETITOR', 
  params: any
): Promise<any> => {
  
  let prompt = "";
  let schema: Schema | undefined;

  if (type === 'EXPLORE') {
    prompt = `Act as a YouTube Analyst. Provide top 5 authority channels and top 5 trending videos in the "${params.category}" niche.`;
    schema = {
      type: Type.OBJECT,
      properties: {
        topChannels: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: { name: { type: Type.STRING }, subscribers: { type: Type.STRING }, channelUrl: { type: Type.STRING } } 
          } 
        },
        topVideos: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: { title: { type: Type.STRING }, channelName: { type: Type.STRING }, views: { type: Type.STRING }, videoUrl: { type: Type.STRING } } 
          } 
        }
      }
    };
  } else if (type === 'TRACKER') {
    prompt = `Identify 5 viral videos trending in ${params.country} within the last ${params.timeframe}.`;
    schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          channelName: { type: Type.STRING },
          views: { type: Type.STRING },
          timeframe: { type: Type.STRING },
          trajectory: { type: Type.STRING, enum: ['Growing', 'Stable', 'Declining'] },
          videoUrl: { type: Type.STRING },
          channelUrl: { type: Type.STRING }
        }
      }
    };
  } else if (type === 'FORECAST') {
    prompt = `Forecast 3 breakout trends for the near future.`;
    schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          predictionScore: { type: Type.NUMBER },
          potentialReach: { type: Type.STRING }
        }
      }
    };
  } else if (type === 'COMPETITOR') {
    prompt = `Analyze competitor "${params.competitorName}". Estimate growth, find similar channels, identifying content pillars, and create a content blueprint.`;
    schema = {
      type: Type.OBJECT,
      properties: {
        channelName: { type: Type.STRING },
        growthRate: { type: Type.STRING },
        similarChannels: { type: Type.ARRAY, items: { type: Type.STRING } },
        topPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
        blueprint: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            callToAction: { type: Type.STRING }
          }
        }
      }
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  return JSON.parse(response.text || '{}');
};
