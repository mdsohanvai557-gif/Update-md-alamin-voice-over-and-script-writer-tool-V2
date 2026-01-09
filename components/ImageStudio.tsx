
import React, { useState } from 'react';
import { Image, Upload, Download, Settings, Sparkles, Layers, X, Loader2, Trash2 } from 'lucide-react';
import { generateImage, generateImagePromptsFromScript } from '../services/geminiService';
import { GeneratedImage } from '../types';
import JSZip from 'jszip';

const ImageStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Script' | 'Prompts'>('Script');
  const [inputText, setInputText] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  
  // Settings
  const [isUltraRealistic, setIsUltraRealistic] = useState(true);
  const [is4K, setIs4K] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "4:3" | "9:16">("16:9");

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const handleDelete = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  const processGeneration = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Initializing...');
    
    try {
      let promptsToProcess: string[] = [];

      if (activeTab === 'Script') {
        setStatusMessage('Analyzing script & generating scenes...');
        promptsToProcess = await generateImagePromptsFromScript(inputText);
      } else {
        // Prompts mode: Split by line
        promptsToProcess = inputText.split('\n').filter(p => p.trim().length > 0);
      }

      if (promptsToProcess.length === 0) {
        throw new Error("No valid prompts found.");
      }

      setStatusMessage(`Generating ${promptsToProcess.length} images...`);
      
      // Batch processing - Optimized for High Volume
      // Increased batch size to 4 for better throughput
      const BATCH_SIZE = 4;
      for (let i = 0; i < promptsToProcess.length; i += BATCH_SIZE) {
        const batch = promptsToProcess.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (prompt) => {
          try {
             // We pass the isUltraRealistic flag to the service now
             const base64 = await generateImage(prompt, referenceImage || undefined, {
               is4K,
               aspectRatio,
               enhanceRealism: isUltraRealistic
             });
             
             return {
               id: `img-${Date.now()}-${Math.random()}`,
               url: `data:image/png;base64,${base64}`,
               prompt: prompt,
               timestamp: Date.now()
             } as GeneratedImage;
          } catch (e) {
            console.error(`Failed to generate: ${prompt}`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);
        
        // Filter out failed generations
        const validBatchImages = results.filter((img): img is GeneratedImage => img !== null);
        
        // CRITICAL FIX: Only add the NEW images from this batch to the state.
        // Previously, we were accumulating all images in a local variable and re-adding them,
        // which caused duplication and re-introduction of deleted images.
        if (validBatchImages.length > 0) {
           setGeneratedImages(prev => [...validBatchImages, ...prev]); 
        }
      }
      
      setStatusMessage('Complete!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (generatedImages.length === 0) return;
    
    const zip = new JSZip();
    const folder = zip.folder("Alamin Voice Tool_images");
    
    generatedImages.forEach((img, idx) => {
      // Data URI to Blob
      const base64Data = img.url.split(',')[1];
      folder?.file(`image_${idx + 1}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `Alamin Voice Tool_bulk_images_${Date.now()}.zip`;
    link.click();
  };

  return (
    <div className="h-full bg-gray-900 text-white rounded-xl flex flex-col overflow-hidden border border-gray-700">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-gray-850">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           <Image className="text-purple-500" />
           Bulk Image Studio
        </h2>
        <p className="text-gray-400 text-sm mt-1">Generate consistent, high-volume visual assets for your projects.</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
         
         {/* Left Panel: Controls */}
         <div className="w-full lg:w-96 bg-gray-850 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto">
            
            {/* Tabs */}
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
               <button 
                 onClick={() => setActiveTab('Script')}
                 className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'Script' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
               >Script to Image</button>
               <button 
                 onClick={() => setActiveTab('Prompts')}
                 className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'Prompts' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
               >Bulk Prompts</button>
            </div>

            {/* Input Area */}
            <div className="flex-1 min-h-[200px] flex flex-col">
               <label className="text-xs font-bold text-gray-500 uppercase mb-2">
                 {activeTab === 'Script' ? 'Story Script' : 'Prompts (One per line)'}
               </label>
               <textarea 
                 className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 resize-none focus:ring-2 focus:ring-purple-500 outline-none custom-scrollbar"
                 placeholder={activeTab === 'Script' ? "Paste your full script here. AI will extract scenes..." : "Enter multiple prompts...\nA futuristic city\nA robot shaking hands\n..."}
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
               ></textarea>
            </div>

            {/* Reference Image */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
               <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Style Reference</label>
               {!referenceImage ? (
                 <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-gray-700 hover:border-purple-500 rounded-lg cursor-pointer bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2 text-gray-400">
                       <Upload className="w-4 h-4" />
                       <span className="text-sm">Upload Image</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
                 </label>
               ) : (
                 <div className="flex items-center justify-between bg-gray-800 p-2 rounded-lg border border-gray-700">
                    <span className="text-sm truncate text-purple-300 px-2">{referenceImage.name}</span>
                    <button onClick={() => setReferenceImage(null)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                 </div>
               )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                  <Settings className="w-3 h-3" /> Image Type
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setIsUltraRealistic(!isUltraRealistic)}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${isUltraRealistic ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                  >
                     Ultra-Realistic
                  </button>
                  <button 
                    onClick={() => setIs4K(!is4K)}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${is4K ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                  >
                     4K Quality
                  </button>
               </div>
               
               <div className="flex bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                  {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio as any)}
                      className={`flex-1 py-1.5 text-xs font-bold ${aspectRatio === ratio ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {ratio}
                    </button>
                  ))}
               </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={processGeneration}
              disabled={isProcessing || !inputText.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles className="fill-current" />}
               {activeTab === 'Script' ? 'Generate from Script' : 'Generate Bulk Images'}
            </button>
            
            {statusMessage && (
               <p className="text-center text-xs text-gray-400 animate-pulse">{statusMessage}</p>
            )}

         </div>

         {/* Right Panel: Gallery */}
         <div className="flex-1 bg-gray-900 p-6 flex flex-col overflow-hidden relative">
            
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold flex items-center gap-2">
                 <Layers className="text-gray-400 w-5 h-5" />
                 Generated Assets <span className="text-sm font-normal text-gray-500">({generatedImages.length})</span>
               </h3>
               
               {generatedImages.length > 0 && (
                 <button 
                   onClick={downloadAll}
                   className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all"
                 >
                    <Download className="w-4 h-4" /> Download All (.zip)
                 </button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-950/50 rounded-xl border border-gray-800 p-4">
               {generatedImages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                     <Image className="w-16 h-16 opacity-20" />
                     <p>No images generated yet. Enter a script or prompts to begin.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {generatedImages.map((img) => (
                        <div key={img.id} className="group relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                           <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                              <p className="text-xs text-white text-center line-clamp-3 mb-2">{img.prompt}</p>
                           </div>
                           {/* Delete Button */}
                           <button 
                             onClick={() => handleDelete(img.id)}
                             className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                             title="Delete Image"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>

         </div>

      </div>
    </div>
  );
};

export default ImageStudio;