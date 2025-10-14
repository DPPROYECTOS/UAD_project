import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import PptxGenJS from 'pptxgenjs';
import { SparklesIcon, PhotographIcon, GlobeAltIcon, PresentationChartBarIcon, BrainIcon, ChatBubbleLeftRightIcon, DocumentDownloadIcon, XCircleIcon } from '../components/Icons';
import Spinner from '../components/Spinner';

type ToolType = 'chat' | 'image' | 'search' | 'presentation' | 'training';

type SimpleChatMessage = { role: 'user' | 'model'; content: string };
type SearchMessage = { role: 'user' | 'model'; content: { text: string; sources?: { uri: string; title: string }[] } };
type TrainingMessage = { role: 'user' | 'model'; content: { type: 'text' | 'image'; data: string } };
type Slide = { title: string; content: string[] };

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
);
const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
);

const GeminiView: React.FC = () => {
  const [isFullMode, setIsFullMode] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>('chat');
  const isApiKeyMissing = !process.env.API_KEY;

  const [error, setError] = useState<string | null>(null);
  
  // States for each tool
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<SimpleChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchMessage[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const [presentationTopic, setPresentationTopic] = useState('');
  const [presentationSlides, setPresentationSlides] = useState<Slide[] | null>(null);
  const [isPresentationLoading, setIsPresentationLoading] = useState(false);
  const [presentationStep, setPresentationStep] = useState('');
  
  const [trainingChat, setTrainingChat] = useState<Chat | null>(null);
  const [trainingMessages, setTrainingMessages] = useState<TrainingMessage[]>([]);
  const [trainingInput, setTrainingInput] = useState('');
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [trainedFile, setTrainedFile] = useState<File | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isApiKeyMissing) {
      setError("La función de IA no está configurada. Se requiere una clave API.");
      return;
    }
    const initChat = () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const baseSystemInstruction = 'Eres un asistente útil y amigable llamado Gemini. Ayudas a los usuarios con la gestión de proyectos, la mejora continua y tareas generales. Respondes en español.';
            const defaultChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: baseSystemInstruction } });
            setChat(defaultChat);
            setTrainingChat(defaultChat); // Default for training tool
            setChatMessages([{ role: 'model', content: '¡Hola! Soy Gemini, tu asistente de IA. ¿Cómo puedo ayudarte a mejorar tus proyectos hoy?' }]);
        } catch (err) {
            console.error("Error initializing Gemini Chat:", err);
            setError(err instanceof Error ? err.message : "No se pudo inicializar el chat de IA.");
        }
    };
    initChat();
  }, [isApiKeyMissing]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, searchHistory, trainingMessages, isLoading, isSearchLoading, isTrainingLoading]);

  const handleSecretClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 7) {
      setIsFullMode(true);
      setSecretClickCount(0);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, currentChat: Chat, messages: SimpleChatMessage[], setMessages: React.Dispatch<React.SetStateAction<SimpleChatMessage[]>>, input: string, setInput: (s:string)=>void) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentChat) return;

    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    setError(null);
    
    try {
        const responseStream = await currentChat.sendMessageStream({ message: text });
        setMessages(prev => [...prev, { role: 'model', content: '' }]);
        for await (const chunk of responseStream) {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content += chunk.text;
                return newMessages;
            });
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error.";
        setError(errorMessage);
        setMessages(prev => [...prev, { role: 'model', content: `Lo siento, ocurrió un error: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setGeneratedImageUrl(null);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imagePrompt,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
      });
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      setGeneratedImageUrl(`data:image/jpeg;base64,${base64ImageBytes}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la imagen.');
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || isSearchLoading) return;
    const query = searchQuery;
    setSearchQuery('');
    setSearchHistory(prev => [...prev, { role: 'user', content: { text: query } }]);
    setIsSearchLoading(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: { tools: [{googleSearch: {}}] },
        });
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
        setSearchHistory(prev => [...prev, { role: 'model', content: { text: response.text, sources } }]);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al realizar la búsqueda.');
    } finally {
        setIsSearchLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    if (!presentationTopic.trim() || isPresentationLoading) return;
    setIsPresentationLoading(true);
    setPresentationSlides(null);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    try {
        setPresentationStep('Investigando tema...');
        const researchResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Recolecta información detallada y completa sobre el siguiente tema: "${presentationTopic}".`,
            config: { tools: [{googleSearch: {}}] },
        });

        setPresentationStep('Creando diapositivas...');
        const slideSchema = {
            type: Type.OBJECT,
            properties: {
                slides: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["title", "content"]
                    }
                }
            },
            required: ["slides"]
        };
        const structureResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Usando la siguiente información, crea una presentación de 5 a 8 diapositivas. Para cada diapositiva, provee un título y una lista de puntos clave (viñetas). Información: ${researchResponse.text}`,
            config: { responseMimeType: "application/json", responseSchema: slideSchema },
        });
        const parsedSlides = JSON.parse(structureResponse.text).slides;
        setPresentationSlides(parsedSlides);

    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear la presentación.');
    } finally {
        setIsPresentationLoading(false);
        setPresentationStep('');
    }
  };

  const downloadPresentation = () => {
    if (!presentationSlides) return;
    const pptx = new PptxGenJS();
    presentationSlides.forEach(slideData => {
        let slide = pptx.addSlide();
        slide.addText(slideData.title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 24, bold: true, align: 'center' });
        slide.addText(slideData.content.join('\n'), { x: 0.5, y: 1.5, w: '90%', h: '75%', fontSize: 14, bullet: true });
    });
    pptx.writeFile({ fileName: `${presentationTopic}.pptx` });
  };
  
  const handleTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const newTrainedChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `Eres un experto especialista en el siguiente documento. Basa tus respuestas únicamente en su contenido. No utilices conocimiento externo. DOCUMENTO: """${content}"""`
                }
            });
            setTrainingChat(newTrainedChat);
            setTrainedFile(file);
            setTrainingMessages([{ role: 'model', content: { type: 'text', data: `¡Entendido! Ahora soy un experto en "${file.name}". Hazme cualquier pregunta sobre su contenido.` } }]);
        };
        reader.readAsText(file);
    } else {
        setError("Por favor, sube un archivo .txt válido.");
    }
  };
  
  const forgetTrainedFile = () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const baseSystemInstruction = 'Eres un asistente útil y amigable llamado Gemini. Ayudas a los usuarios con la gestión de proyectos, la mejora continua y tareas generales. Respondes en español.';
    const defaultChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: baseSystemInstruction } });
    setTrainingChat(defaultChat);
    setTrainedFile(null);
    setTrainingMessages([{ role: 'model', content: { type: 'text', data: 'He olvidado el documento. Ahora responderé con mi conocimiento general. ¿En qué te puedo ayudar?'}}]);
  };

  const handleTrainingSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingInput.trim() || isTrainingLoading) return;
    const text = trainingInput.trim();
    setTrainingInput('');
    setTrainingMessages(prev => [...prev, { role: 'user', content: { type: 'text', data: text } }]);
    setIsTrainingLoading(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        if (text.startsWith('/imagen ')) {
            const prompt = text.replace('/imagen ', '');
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'jpeg', aspectRatio: '16:9' },
            });
            const imageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
            setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'image', data: imageUrl } }]);
        } else if (trainingChat) {
            const responseStream = await trainingChat.sendMessageStream({ message: text });
            setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'text', data: '' } }]);
            for await (const chunk of responseStream) {
                setTrainingMessages(prev => {
                    const newMessages = [...prev];
                    (newMessages[newMessages.length - 1].content as { type: 'text'; data: string }).data += chunk.text;
                    return newMessages;
                });
            }
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error.";
        setError(errorMessage);
        setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'text', data: `Lo siento, ocurrió un error: ${errorMessage}` } }]);
    } finally {
        setIsTrainingLoading(false);
    }
  };


  const renderActiveTool = () => {
    switch (activeTool) {
        case 'chat': return renderSimpleChat(chat, chatMessages, setChatMessages, userInput, setUserInput, isLoading, setIsLoading, error, setError, handleSendMessage, chatContainerRef, 'full');
        case 'image': return renderImageCreator();
        case 'search': return renderSearch();
        case 'presentation': return renderPresentationCreator();
        case 'training': return renderTraining();
        default: return null;
    }
  };
  
  const renderSimpleChat = (currentChat: Chat | null, messages: SimpleChatMessage[], setMessages: React.Dispatch<React.SetStateAction<SimpleChatMessage[]>>, input: string, setInput: (s:string)=>void, loading: boolean, setLoading: (b:boolean)=>void, currentError: string | null, setErrorFn: (s:string|null)=>void, onSend: any, ref: any, mode: 'simple'|'full') => (
    <div className={`bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col ${mode === 'simple' ? 'h-[70vh]' : 'h-full'}`}>
        <div ref={ref} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div>}
              <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-light-bg dark:bg-dark-bg rounded-bl-none'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div>}
            </div>
          ))}
          {loading && messages[messages.length-1]?.role === 'user' && (
             <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div>
                <div className="max-w-xl p-4 rounded-2xl bg-light-bg dark:bg-dark-bg rounded-bl-none flex items-center"><Spinner/><span className="ml-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Pensando...</span></div>
            </div>
          )}
           {currentError && !loading && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg"><p><span className="font-bold">Error:</span> {currentError}</p></div>}
        </div>
        <div className="p-4 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border">
          <form onSubmit={(e) => onSend(e, currentChat, messages, setMessages, input, setInput)} className="flex items-center gap-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e, currentChat, messages, setMessages, input, setInput); }}} placeholder={isApiKeyMissing ? "Función de IA no disponible" : "Escribe tu mensaje aquí..."} className="flex-1 w-full p-3 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg resize-none focus:ring-2 focus:ring-brand-accent focus:outline-none" rows={1} disabled={loading || isApiKeyMissing}/>
            <button type="submit" disabled={loading || !input.trim() || isApiKeyMissing} className="flex-shrink-0 h-12 w-12 rounded-lg text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><SendIcon className="h-6 w-6" /></button>
          </form>
        </div>
      </div>
  );

  const renderImageCreator = () => (
    <div className="flex flex-col h-full bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md">
      <div className="flex-grow p-4 overflow-y-auto flex items-center justify-center">
        {isImageLoading ? <Spinner /> : generatedImageUrl ? (
            <div className="relative group w-full h-full">
                <img src={generatedImageUrl} alt={imagePrompt} className="object-contain w-full h-full"/>
                <a href={generatedImageUrl} download={`${imagePrompt.substring(0, 30).replace(/\s+/g, '_')}.jpeg`} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <DocumentDownloadIcon className="h-6 w-6"/>
                </a>
            </div>
        ) : <div className="text-center text-light-text-secondary dark:text-dark-text-secondary"><PhotographIcon className="h-16 w-16 mx-auto text-gray-400"/>La imagen generada aparecerá aquí.</div>}
      </div>
      {error && <p className="p-2 text-center text-sm text-red-500">{error}</p>}
      <div className="p-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
            <input type="text" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Ej: Un astronauta en un caballo, fotorrealista..." className="flex-grow p-3 border rounded-lg" disabled={isImageLoading}/>
            <button onClick={handleGenerateImage} disabled={isImageLoading || !imagePrompt.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">{isImageLoading ? 'Generando...' : 'Generar'}</button>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
      <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col h-full">
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
            {searchHistory.map((msg, index) => (
                <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><GlobeAltIcon className="h-5 w-5 text-brand-primary" /></div>}
                    <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-light-bg dark:bg-dark-bg rounded-bl-none'}`}>
                        <p className="whitespace-pre-wrap">{msg.content.text}</p>
                        {msg.content.sources && msg.content.sources.length > 0 && (
                            <div className="mt-4 border-t pt-2">
                                <h4 className="text-xs font-bold uppercase text-light-text-secondary dark:text-dark-text-secondary">Fuentes:</h4>
                                <ul className="text-sm list-disc list-inside mt-1">
                                    {msg.content.sources.map((source, i) => <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{source.title || source.uri}</a></li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                     {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div>}
                </div>
            ))}
            {isSearchLoading && <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><Spinner/> Buscando en la web...</div>}
        </div>
        <div className="p-4 border-t">
            <div className="flex items-center gap-3">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Pregunta sobre eventos recientes..." className="flex-grow p-3 border rounded-lg" disabled={isSearchLoading}/>
                <button onClick={handleSearch} disabled={isSearchLoading || !searchQuery.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">Buscar</button>
            </div>
        </div>
    </div>
  );

  const renderPresentationCreator = () => (
    <div className="flex flex-col h-full bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md">
      <div className="flex-grow p-4 overflow-y-auto">
        {isPresentationLoading ? <div className="flex flex-col items-center justify-center h-full"><Spinner/> <p className="mt-2">{presentationStep}</p></div> : 
        presentationSlides ? (
            <div>
                <button onClick={downloadPresentation} className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><DocumentDownloadIcon className="h-5 w-5"/> Descargar Presentación</button>
                <div className="space-y-4">
                    {presentationSlides.map((slide, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                            <h3 className="font-bold text-lg border-b pb-2 mb-2">Diapositiva {i+1}: {slide.title}</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm">{slide.content.map((point, j) => <li key={j}>{point}</li>)}</ul>
                        </div>
                    ))}
                </div>
            </div>
        ) : <div className="text-center text-light-text-secondary dark:text-dark-text-secondary flex flex-col items-center justify-center h-full"><PresentationChartBarIcon className="h-16 w-16 mx-auto text-gray-400"/>La vista previa de la presentación aparecerá aquí.</div>}
      </div>
      {error && <p className="p-2 text-center text-sm text-red-500">{error}</p>}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
            <input type="text" value={presentationTopic} onChange={e => setPresentationTopic(e.target.value)} placeholder="Tema para la presentación, ej: 'El impacto de la IA en logística'" className="flex-grow p-3 border rounded-lg" disabled={isPresentationLoading}/>
            <button onClick={handleGeneratePresentation} disabled={isPresentationLoading || !presentationTopic.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">{isPresentationLoading ? 'Creando...' : 'Crear'}</button>
        </div>
      </div>
    </div>
  );
  
  const renderTraining = () => (
    <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col h-full">
      <div className="p-2 border-b flex items-center justify-between">
          {trainedFile ? <div className="text-sm p-2 flex items-center">Entrenado con: <span className="font-semibold ml-2">{trainedFile.name}</span> <button onClick={forgetTrainedFile} className="ml-2 text-red-500"><XCircleIcon className="h-5 w-5"/></button></div> 
          : <label className="text-sm p-2 cursor-pointer text-blue-600 hover:underline">
                Entrenar con un archivo .txt...
                <input type="file" accept=".txt" onChange={handleTrainingFileUpload} className="hidden"/>
             </label>}
      </div>
      <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {trainingMessages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'model' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><BrainIcon className="h-5 w-5 text-brand-primary" /></div>}
                  <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-light-bg dark:bg-dark-bg rounded-bl-none'}`}>
                      {msg.content.type === 'text' ? <p className="whitespace-pre-wrap">{msg.content.data}</p> : <img src={msg.content.data} className="max-w-full rounded-lg"/>}
                  </div>
                   {msg.role === 'user' && <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div>}
              </div>
          ))}
          {isTrainingLoading && <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><Spinner/> Procesando...</div>}
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleTrainingSendMessage} className="flex items-center gap-3">
            <input type="text" value={trainingInput} onChange={e => setTrainingInput(e.target.value)} placeholder="Haz una pregunta o usa /imagen [prompt]..." className="flex-grow p-3 border rounded-lg" disabled={isTrainingLoading}/>
            <button type="submit" disabled={isTrainingLoading || !trainingInput.trim()} className="flex-shrink-0 h-12 w-12 rounded-lg text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-400 flex items-center justify-center"><SendIcon className="h-6 w-6"/></button>
        </form>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold cursor-pointer text-light-text dark:text-dark-text" onClick={handleSecretClick}>Asistente Gemini 2.5</h1>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
        {isFullMode ? 'Selecciona una herramienta para empezar.' : 'Haz una pregunta, pide un resumen o genera ideas para tus proyectos.'}
      </p>

      <div className={`mt-6 ${isFullMode ? 'h-[75vh] flex gap-4' : ''}`}>
        {isFullMode ? (
          <>
            <nav className="flex flex-col gap-2 p-2 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border w-48">
              {(Object.keys({chat:'Chat', image:'Imágenes', search:'Búsqueda', presentation:'Presentación', training:'Entrenamiento'}) as ToolType[]).map(tool => (
                  <button key={tool} onClick={() => setActiveTool(tool)} className={`flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTool === tool ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      {tool==='chat' && <ChatBubbleLeftRightIcon className="h-5 w-5"/>}
                      {tool==='image' && <PhotographIcon className="h-5 w-5"/>}
                      {tool==='search' && <GlobeAltIcon className="h-5 w-5"/>}
                      {tool==='presentation' && <PresentationChartBarIcon className="h-5 w-5"/>}
                      {tool==='training' && <BrainIcon className="h-5 w-5"/>}
                      <span>{ {chat:'Chat', image:'Imágenes', search:'Búsqueda', presentation:'Presentación', training:'Entrenamiento'}[tool] }</span>
                  </button>
              ))}
            </nav>
            <div className="flex-1">{renderActiveTool()}</div>
          </>
        ) : (
          renderSimpleChat(chat, chatMessages, setChatMessages, userInput, setUserInput, isLoading, setIsLoading, error, setError, handleSendMessage, chatContainerRef, 'simple')
        )}
      </div>
    </div>
  );
};

export default GeminiView;