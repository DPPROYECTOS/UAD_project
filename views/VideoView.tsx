import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { InformationCircleIcon, SparklesIcon, UploadIcon, VideoCameraIcon, XCircleIcon } from '../components/Icons';
import Spinner from '../components/Spinner';

type GenerationStatus = 'idle' | 'generating' | 'polling' | 'success' | 'error';
type ModelType = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';

const loadingMessages = [
    "Calentando las cámaras digitales...",
    "Dirigiendo a los actores virtuales...",
    "Renderizando el primer corte...",
    "Ajustando la iluminación de la escena...",
    "Esto puede tomar unos minutos...",
    "Compilando los píxeles en una obra maestra...",
    "Añadiendo los efectos especiales...",
];

const VideoView: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>(loadingMessages[0]);

    // Form state
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState<ModelType>('veo-3.1-fast-generate-preview');
    const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    // Image state
    const [startImage, setStartImage] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
    const [endImage, setEndImage] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
    const [refImages, setRefImages] = useState<{ name: string; base64: string; mimeType: string }[]>([]);

    // Result state
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [lastOperation, setLastOperation] = useState<any | null>(null);

    // Extension state
    const [isExtending, setIsExtending] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState('');

    const progressIntervalRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Check for API key on mount
    useEffect(() => {
        const checkKey = async () => {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
        };
        checkKey();
    }, []);

    // Effect for loading messages
    useEffect(() => {
        if (status === 'generating' || status === 'polling') {
            progressIntervalRef.current = window.setInterval(() => {
                setProgressMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 3000);
        } else {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [status]);
    
    // Reset inputs when model changes
    useEffect(() => {
        setStartImage(null);
        setEndImage(null);
        setRefImages([]);
        if (model === 'veo-3.1-generate-preview') {
            setResolution('720p');
            setAspectRatio('16:9');
        } else {
            setResolution('720p'); // default
        }
    }, [model]);

    const handleSelectKey = async () => {
        await (window as any).aistudio.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race conditions
    };
    
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end' | 'ref') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const base64 = await fileToBase64(file);
        const fileData = { name: file.name, base64, mimeType: file.type };

        if (type === 'start') setStartImage(fileData);
        if (type === 'end') setEndImage(fileData);
        if (type === 'ref') setRefImages(prev => [...prev.slice(0, 2), fileData]); // Allow up to 3
    };
    
    const resetForm = () => {
        setPrompt('');
        setStartImage(null);
        setEndImage(null);
        setRefImages([]);
        setGeneratedVideoUrl(null);
        setLastOperation(null);
        setIsExtending(false);
        setExtensionPrompt('');
    };

    const handleGenerate = async (isExtension = false) => {
        const currentPrompt = isExtension ? extensionPrompt : prompt;
        if (!isExtension && !currentPrompt && !startImage) {
            setError('Se requiere un prompt o una imagen de inicio.');
            return;
        }
        if (isExtension && !currentPrompt) {
            setError('Se requiere un prompt para extender el video.');
            return;
        }

        setStatus('generating');
        setError(null);
        setGeneratedVideoUrl(null); // Clear previous video

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const config: any = {
                numberOfVideos: 1,
                resolution,
                aspectRatio,
            };

            const payload: any = {
                model,
                config,
            };

            if (isExtension) {
                if (!lastOperation?.response?.generatedVideos?.[0]?.video) {
                    throw new Error("No hay un video válido para extender.");
                }
                payload.prompt = currentPrompt;
                payload.video = lastOperation.response.generatedVideos[0].video;
                payload.config.resolution = '720p';
                payload.config.aspectRatio = lastOperation.response.generatedVideos[0].video.aspectRatio;

            } else {
                 if(currentPrompt) payload.prompt = currentPrompt;
                 if (startImage) payload.image = { imageBytes: startImage.base64, mimeType: startImage.mimeType };
                 if (endImage) payload.config.lastFrame = { imageBytes: endImage.base64, mimeType: endImage.mimeType };
                 if (refImages.length > 0) {
                     payload.config.referenceImages = refImages.map(img => ({
                         image: { imageBytes: img.base64, mimeType: img.mimeType },
                         referenceType: VideoGenerationReferenceType.ASSET,
                     }));
                 }
            }

            let operation = await ai.models.generateVideos(payload);
            setStatus('polling');

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) {
                throw new Error(operation.error.message || 'La operación de generación falló.');
            }

            setLastOperation(operation);
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

            if (!downloadLink) {
                throw new Error('No se pudo obtener el enlace de descarga del video.');
            }

            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                const errorBody = await response.text();
                console.error("Download error:", errorBody);
                throw new Error(`Error al descargar el video: ${response.statusText}`);
            }

            const videoBlob = await response.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoUrl(videoUrl);
            setStatus('success');
            if(isExtension) setIsExtending(false);

        } catch (err: any) {
            console.error('Video generation failed:', err);
            const message = err.message || 'Ocurrió un error desconocido.';
            if (message.includes('API key not valid') || message.includes('Requested entity was not found')) {
                setError('La clave de API no es válida o no tiene los permisos necesarios. Por favor, selecciona una clave de API válida.');
                setApiKeySelected(false);
            } else {
                setError(message);
            }
            setStatus('error');
        }
    };
    
    const canExtend = lastOperation?.response?.generatedVideos?.[0]?.video && lastOperation.response.generatedVideos[0].video.resolution === '720p' && model === 'veo-3.1-generate-preview';

    // UI Components
    const renderImageUpload = (id: string, label: string, fileData: { name: string } | null, onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onClear: () => void, disabled: boolean) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">{label}</label>
            {fileData ? (
                 <div className="mt-1 flex items-center justify-between p-2 bg-light-bg dark:bg-dark-bg/50 rounded-md">
                     <span className="text-sm truncate">{fileData.name}</span>
                     <button type="button" onClick={onClear} className="p-1 text-red-500 hover:text-red-700"><XCircleIcon className="h-5 w-5"/></button>
                 </div>
            ) : (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-light-border dark:border-dark-border border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor={id} className={`relative cursor-pointer bg-light-card dark:bg-dark-card rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-accent ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <span>Sube un archivo</span>
                                <input id={id} name={id} type="file" className="sr-only" accept="image/*" onChange={onFileChange} disabled={disabled} />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderApiKeySelector = () => (
        <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
            <InformationCircleIcon className="h-12 w-12 text-brand-primary mx-auto"/>
            <h2 className="mt-4 text-xl font-bold">Se requiere una clave de API</h2>
            <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
                Para generar videos con Veo, debes seleccionar una clave de API asociada a un proyecto de Google Cloud con facturación habilitada.
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline ml-1">Aprende más sobre la facturación.</a>
            </p>
            <button onClick={handleSelectKey} className="mt-6 px-6 py-2 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-secondary">
                Seleccionar Clave de API
            </button>
        </div>
    );
    
    if (apiKeySelected === null) {
        return <div className="flex justify-center items-center h-64"><Spinner/></div>;
    }
    
    if (apiKeySelected === false) {
        return renderApiKeySelector();
    }
    
    const isGenerating = status === 'generating' || status === 'polling';
    const isHQModel = model === 'veo-3.1-generate-preview';

    return (
      <div>
        <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-3xl font-bold">Generador de Video con Veo</h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    Crea videos de alta calidad a partir de texto e imágenes.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-6">
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
                    <h2 className="text-lg font-semibold mb-4">1. Configuración</h2>
                    {/* Model Selector */}
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Modelo</label>
                        <div className="mt-1 grid grid-cols-2 gap-2 rounded-lg p-1 bg-light-bg dark:bg-dark-bg/50">
                            <button onClick={() => setModel('veo-3.1-fast-generate-preview')} disabled={isGenerating} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${!isHQModel ? 'bg-brand-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-dark-bg'}`}>Rápido</button>
                            <button onClick={() => setModel('veo-3.1-generate-preview')} disabled={isGenerating} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${isHQModel ? 'bg-brand-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-dark-bg'}`}>Alta Calidad</button>
                        </div>
                    </div>
                    {/* Resolution & Aspect Ratio */}
                     <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Resolución</label>
                             <select value={resolution} onChange={e => setResolution(e.target.value as any)} disabled={isGenerating || isHQModel} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md">
                                 <option value="720p">720p</option>
                                 {!isHQModel && <option value="1080p">1080p</option>}
                             </select>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Aspecto</label>
                             <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} disabled={isGenerating || isHQModel} className="w-full mt-1 p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md">
                                 <option value="16:9">16:9 (Paisaje)</option>
                                 <option value="9:16">9:16 (Retrato)</option>
                             </select>
                         </div>
                    </div>
                     <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">{isHQModel && 'El modelo de alta calidad solo soporta 720p y 16:9.'}</p>
                </div>
                
                <div className="p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
                    <h2 className="text-lg font-semibold mb-2">2. Contenido</h2>
                     <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Un holograma de neón de un gato conduciendo a toda velocidad..." disabled={isGenerating} rows={4} className="w-full p-2 border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-md"/>
                    
                    {isHQModel ? (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Imágenes de Referencia (hasta 3)</p>
                            {renderImageUpload('ref-1', 'Referencia 1', refImages[0], e => handleFileChange(e, 'ref'), () => setRefImages(p => p.filter((_,i) => i !== 0)), isGenerating || refImages.length >= 3)}
                            {refImages.length >= 1 && renderImageUpload('ref-2', 'Referencia 2', refImages[1], e => handleFileChange(e, 'ref'), () => setRefImages(p => p.filter((_,i) => i !== 1)), isGenerating || refImages.length >= 3)}
                            {refImages.length >= 2 && renderImageUpload('ref-3', 'Referencia 3', refImages[2], e => handleFileChange(e, 'ref'), () => setRefImages(p => p.filter((_,i) => i !== 2)), isGenerating || refImages.length >= 3)}
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            {renderImageUpload('start-img', 'Imagen de Inicio (Opcional)', startImage, e => handleFileChange(e, 'start'), () => setStartImage(null), isGenerating)}
                            {renderImageUpload('end-img', 'Imagen Final (Opcional)', endImage, e => handleFileChange(e, 'end'), () => setEndImage(null), isGenerating)}
                        </div>
                    )}
                </div>
                 <button onClick={() => handleGenerate()} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-secondary disabled:bg-brand-primary/50">
                     {isGenerating ? <Spinner/> : <SparklesIcon className="h-5 w-5"/>}
                     <span>{isGenerating ? 'Generando...' : 'Generar Video'}</span>
                 </button>
                 <button onClick={resetForm} disabled={isGenerating} className="w-full text-sm text-center mt-2 text-light-text-secondary dark:text-dark-text-secondary hover:underline">Limpiar formulario</button>
            </div>

            {/* Result Area */}
            <div className="lg:col-span-2">
                <div className="relative aspect-video bg-light-card dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border flex items-center justify-center overflow-hidden">
                    {isGenerating && (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-4 font-semibold">{progressMessage}</p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">La generación de video puede tardar varios minutos.</p>
                        </div>
                    )}
                    {error && !isGenerating && (
                        <div className="text-center p-4">
                            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto"/>
                            <p className="mt-4 font-semibold text-red-700 dark:text-red-400">Error en la Generación</p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-md">{error}</p>
                        </div>
                    )}
                    {generatedVideoUrl && !isGenerating && (
                        <>
                         <video ref={videoRef} src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain"></video>
                         <div className="absolute bottom-4 right-4 flex gap-2">
                            <a href={generatedVideoUrl} download={`veo-video-${Date.now()}.mp4`} className="px-3 py-1.5 bg-black/60 text-white text-sm rounded-md hover:bg-black/80">Descargar</a>
                            {canExtend && <button onClick={() => setIsExtending(p => !p)} className="px-3 py-1.5 bg-black/60 text-white text-sm rounded-md hover:bg-black/80">Extender</button>}
                         </div>
                        </>
                    )}
                    {!generatedVideoUrl && !isGenerating && !error && (
                         <div className="text-center text-light-text-secondary dark:text-dark-text-secondary">
                             <VideoCameraIcon className="h-16 w-16 mx-auto text-gray-400"/>
                             <p className="mt-2 font-semibold">El video generado aparecerá aquí.</p>
                         </div>
                    )}
                </div>
                {isExtending && (
                    <div className="mt-4 p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border space-y-2">
                        <label htmlFor="extension-prompt" className="font-semibold">Extender video (7s):</label>
                        <textarea id="extension-prompt" value={extensionPrompt} onChange={e => setExtensionPrompt(e.target.value)} placeholder="Describe lo que sucede a continuación..." rows={2} className="w-full p-2 border rounded-md"/>
                        <button onClick={() => handleGenerate(true)} disabled={isGenerating || !extensionPrompt} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">Generar Extensión</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
};

export default VideoView;
