import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from '../components/Spinner';
import { VideoCameraIcon, InformationCircleIcon } from '../components/Icons';

// FIX: Removed unused 'AIStudio' import. This type is available globally from 'types.ts' and does not need to be explicitly imported.

const VideoView: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [checkingApiKey, setCheckingApiKey] = useState(true);

    const checkApiKey = async () => {
        if (window.aistudio) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            } catch (e) {
                console.error("Error checking for AI Studio API key:", e);
                setApiKeySelected(false);
            }
        } else {
            // Fallback or error if aistudio is not available
            setError("AI Studio context is not available. Video generation is disabled.");
            setApiKeySelected(false);
        }
        setCheckingApiKey(false);
    };

    useEffect(() => {
        checkApiKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Assume success and optimistically update UI
                setApiKeySelected(true);
            } catch (e) {
                console.error("Error opening API key selection:", e);
                setError("Failed to open the API key selection dialog.");
            }
        }
    };

    const handleGenerateVideo = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate a video.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setVideoUrl(null);
        
        // Re-check key right before generation
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                setError("API key not selected. Please select a key to continue.");
                setIsGenerating(false);
                setApiKeySelected(false);
                return;
            }
        } else {
            setError("AI Studio context not available.");
            setIsGenerating(false);
            return;
        }

        try {
            // Create a new instance right before the call
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            setProgressMessage('Initializing video generation... This may take a moment.');
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });

            const messages = [
                'Analyzing your prompt...',
                'Warming up the video synthesizers...',
                'Composing initial frames...',
                'Rendering scene...',
                'Adding details and textures...',
                'Finalizing video... Almost there!'
            ];
            let messageIndex = 0;
            
            while (!operation.done) {
                setProgressMessage(messages[messageIndex % messages.length]);
                messageIndex++;
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            setProgressMessage('Fetching your video...');
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.statusText}`);
                }
                const videoBlob = await response.blob();
                setVideoUrl(URL.createObjectURL(videoBlob));
            } else {
                throw new Error('Video generation completed, but no download link was found.');
            }
        } catch (err) {
             console.error("Video generation failed:", err);
             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
             if (errorMessage.includes("Requested entity was not found.")) {
                 setError("Your API key seems to be invalid. Please select a valid key.");
                 setApiKeySelected(false); // Reset key state
             } else {
                 setError(`Failed to generate video: ${errorMessage}`);
             }
        } finally {
            setIsGenerating(false);
            setProgressMessage('');
        }
    };
    
    if (checkingApiKey) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner />
                <span className="ml-2">Verifying API key...</span>
            </div>
        );
    }
    
    if (!apiKeySelected) {
        return (
             <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
                <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h2 className="mt-4 text-xl font-bold">Video Generation with VEO</h2>
                <p className="mt-2 max-w-lg mx-auto text-light-text-secondary dark:text-dark-text-secondary">
                    To use this feature, you must select an API key associated with a project that has billing enabled.
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline ml-1">Learn more about billing.</a>
                </p>
                <button
                    onClick={handleSelectKey}
                    className="mt-6 px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary"
                >
                    Select API Key
                </button>
                 {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Generador de Video (VEO)</h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    Transforma tus ideas en videos cortos con inteligencia artificial.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-3">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                    <div>
                        <p className="font-bold">Ocurrió un Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Un holograma de neón de un gato conduciendo a toda velocidad"
                    className="w-full h-24 p-3 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg resize-none focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    disabled={isGenerating}
                />
                <button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50"
                >
                    {isGenerating ? <><Spinner /> <span className="ml-2">Generando Video...</span></> : <><VideoCameraIcon className="h-5 w-5 mr-2" /> Generar Video</>}
                </button>
            </div>
            
            {isGenerating && (
                 <div className="text-center p-8 bg-light-bg dark:bg-dark-bg/50 rounded-lg">
                    <Spinner />
                    <p className="mt-4 font-semibold">La generación de video está en progreso.</p>
                    <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">{progressMessage}</p>
                    <p className="mt-2 text-xs text-gray-400">Este proceso puede tardar varios minutos. ¡Gracias por tu paciencia!</p>
                </div>
            )}

            {videoUrl && (
                <div className="mt-6">
                    <h2 className="text-xl font-bold mb-2">Tu Video Generado</h2>
                    <video controls autoPlay loop src={videoUrl} className="w-full rounded-lg shadow-lg border border-light-border dark:border-dark-border">
                        Tu navegador no soporta la etiqueta de video.
                    </video>
                </div>
            )}
        </div>
    );
};

export default VideoView;
