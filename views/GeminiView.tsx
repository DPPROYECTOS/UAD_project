import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Type, Modality } from '@google/genai';
import PptxGenJS from 'pptxgenjs';
import { SparklesIcon, PhotographIcon, GlobeAltIcon, PresentationChartBarIcon, BrainIcon, ChatBubbleLeftRightIcon, DocumentDownloadIcon, XCircleIcon, InformationCircleIcon, UserCircleIcon } from '../components/Icons';
import Spinner from '../components/Spinner';
import { UserPermissions } from '../types';

type ToolType = 'chat' | 'image' | 'search' | 'presentation' | 'training';

type SimpleChatMessage = { role: 'user' | 'model'; content: string };
type ImageChatMessage = { role: 'user' | 'model'; type: 'text' | 'image'; content: string };
type SearchMessage = { role: 'user' | 'model'; content: { text: string; sources?: { uri: string; title: string }[] } };
type TrainingMessage = { role: 'user' | 'model'; content: { type: 'text' | 'image'; data: string } };
type Slide = { title: string; content: string[] };

interface GeminiViewProps {
    geminiApiKey: string | null;
    isApiKeyLoading: boolean;
    apiKeyError: string | null;
    userPermissions: UserPermissions | null;
}

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
);

const GeminiView: React.FC<GeminiViewProps> = ({ geminiApiKey, isApiKeyLoading, apiKeyError, userPermissions }) => {
  const [isFullMode, setIsFullMode] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>('chat');
  
  const [error, setError] = useState<string | null>(null);
  
  // States for each tool
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<SimpleChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  const [imageMessages, setImageMessages] = useState<ImageChatMessage[]>([]);
  const [imageUserInput, setImageUserInput] = useState('');
  const [isImageSending, setIsImageSending] = useState(false);
  
  const [searchChat, setSearchChat] = useState<Chat | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchMessage[]>([]);
  const [searchUserInput, setSearchUserInput] = useState('');
  const [isSearchSending, setIsSearchSending] = useState(false);

  const [presentationMessages, setPresentationMessages] = useState<SimpleChatMessage[]>([]);
  const [presentationUserInput, setPresentationUserInput] = useState('');
  const [presentationSlides, setPresentationSlides] = useState<Slide[] | null>(null);
  const [isPresentationSending, setIsPresentationSending] = useState(false);
  const [presentationStep, setPresentationStep] = useState('');
  
  const [trainingChat, setTrainingChat] = useState<Chat | null>(null);
  const [trainingMessages, setTrainingMessages] = useState<TrainingMessage[]>([]);
  const [trainingInput, setTrainingInput] = useState('');
  const [isTrainingSending, setIsTrainingSending] = useState(false);
  const [trainedFile, setTrainedFile] = useState<File | null>(null);
  const [lastTrainingImage, setLastTrainingImage] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const presentationContainerRef = useRef<HTMLDivElement>(null);
  const trainingContainerRef = useRef<HTMLDivElement>(null);

  const canUse = userPermissions?.gemini?.canUse ?? false;

  useEffect(() => {
    if (!geminiApiKey || !canUse) return;
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const baseSystemInstruction = 'Eres un asistente útil y amigable llamado Gemini. Ayudas a los usuarios con la gestión de proyectos, la mejora continua y tareas generales. Respondes en español.';
        const defaultChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: baseSystemInstruction } });
        setChat(defaultChat);
        setTrainingChat(defaultChat);
        setChatMessages([{ role: 'model', content: '¡Hola! Soy Gemini, tu asistente de IA. ¿Cómo puedo ayudarte a mejorar tus proyectos hoy?' }]);
    } catch (err) {
        console.error("Error initializing Gemini Chat:", err);
        setError(err instanceof Error ? err.message : "No se pudo inicializar el chat de IA.");
    }
  }, [geminiApiKey, canUse]);

  useEffect(() => { chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [chatMessages, isChatSending]);
  useEffect(() => { imageContainerRef.current?.scrollTo({ top: imageContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [imageMessages, isImageSending]);
  useEffect(() => { searchContainerRef.current?.scrollTo({ top: searchContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [searchHistory, isSearchSending]);
  useEffect(() => { presentationContainerRef.current?.scrollTo({ top: presentationContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [presentationMessages, isPresentationSending]);
  useEffect(() => { trainingContainerRef.current?.scrollTo({ top: trainingContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [trainingMessages, isTrainingSending]);

  const handleSecretClick = () => {
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    if (newCount >= 7) {
      setIsFullMode(true);
      setSecretClickCount(0);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatSending || !chat) return;
    const text = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsChatSending(true);
    setError(null);
    try {
        const responseStream = await chat.sendMessageStream({ message: text });
        setChatMessages(prev => [...prev, { role: 'model', content: '' }]);
        for await (const chunk of responseStream) {
            setChatMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content += chunk.text;
                return newMessages;
            });
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error.";
        setError(errorMessage);
        setChatMessages(prev => [...prev, { role: 'model', content: `Lo siento, ocurrió un error: ${errorMessage}` }]);
    } finally {
        setIsChatSending(false);
    }
  };
  
  const handleImageMessageSend = async () => {
    if (!imageUserInput.trim() || isImageSending || !geminiApiKey) return;
    const prompt = imageUserInput.trim();
    setImageUserInput('');
    setImageMessages(prev => [...prev, { role: 'user', type: 'text', content: prompt }]);
    setIsImageSending(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const lastImageMsg = [...imageMessages].reverse().find(m => m.role === 'model' && m.type === 'image');
        
        let response;
        if (lastImageMsg) {
            const imageBase64 = lastImageMsg.content.split(',')[1];
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };
            const textPart = { text: prompt };
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE] }
            });
        } else {
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] }
            });
        }
        
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
            const imageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
            setImageMessages(prev => [...prev, { role: 'model', type: 'image', content: imageUrl }]);
        } else {
            throw new Error("La IA no devolvió una imagen. Intenta con otro prompt.");
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    } finally {
        setIsImageSending(false);
    }
  };

  const handleSearchSend = async () => {
    if (!searchUserInput.trim() || isSearchSending || !geminiApiKey) return;
    const query = searchUserInput.trim();
    setSearchUserInput('');
    setSearchHistory(prev => [...prev, { role: 'user', content: { text: query } }]);
    setIsSearchSending(true);
    setError(null);
    try {
        let currentChat = searchChat;
        if (!currentChat) {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            currentChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { tools: [{googleSearch: {}}] }
            });
            setSearchChat(currentChat);
        }

        const result = await currentChat.sendMessage({ message: query });
        
        const sources = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c.web) || [];
        setSearchHistory(prev => [...prev, { role: 'model', content: { text: result.response.text, sources } }]);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al realizar la búsqueda.');
    } finally {
        setIsSearchSending(false);
    }
  };

  const handlePresentationMessageSend = async () => {
    if (!presentationUserInput.trim() || isPresentationSending || !geminiApiKey) return;
    const prompt = presentationUserInput.trim();
    setPresentationUserInput('');
    setPresentationMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsPresentationSending(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    try {
        const slideSchema = { type: Type.OBJECT, properties: { slides: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["title", "content"] } } }, required: ["slides"] };
        
        if (!presentationSlides) {
            setPresentationStep('Investigando tema...');
            const researchResponse = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `Recolecta información detallada y completa sobre el siguiente tema: "${prompt}".`, config: { tools: [{googleSearch: {}}] } });
            setPresentationStep('Creando diapositivas...');
            const structureResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Usando la siguiente información, crea una presentación de 5 a 8 diapositivas. Para cada diapositiva, provee un título y una lista de puntos clave (viñetas). Información: ${researchResponse.text}`, config: { responseMimeType: "application/json", responseSchema: slideSchema } });
            const parsedSlides = JSON.parse(structureResponse.text).slides;
            setPresentationSlides(parsedSlides);
            setPresentationMessages(prev => [...prev, { role: 'model', content: 'He creado una presentación inicial para ti. ¿Quieres hacer algún cambio?' }]);
        } else {
            setPresentationStep('Aplicando cambios...');
            const fullPrompt = `Dada la siguiente estructura de presentación en formato JSON: ${JSON.stringify(presentationSlides)}. Por favor, aplica la siguiente modificación: "${prompt}". Devuelve la estructura JSON COMPLETA y actualizada de toda la presentación.`;
            const editResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: fullPrompt, config: { responseMimeType: "application/json", responseSchema: slideSchema } });
            const updatedSlides = JSON.parse(editResponse.text).slides;
            setPresentationSlides(updatedSlides);
            setPresentationMessages(prev => [...prev, { role: 'model', content: '¡Listo! He actualizado las diapositivas con tus cambios.' }]);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear la presentación.');
    } finally {
        setIsPresentationSending(false);
        setPresentationStep('');
    }
  };
  
    const downloadPresentation = () => {
        if (!presentationSlides) return;
        const pptx = new PptxGenJS();
        
        presentationSlides.forEach((slide, index) => {
            let slideInstance = pptx.addSlide();
    
            slideInstance.addText(slide.title || `Diapositiva ${index + 1}`, { 
                x: 0.5, 
                y: 0.25, 
                w: '90%', 
                h: 1, 
                fontSize: 32, 
                bold: true, 
                align: 'center',
                color: '363636'
            });
    
            if (slide.content && slide.content.length > 0) {
                const contentPoints = slide.content.map(point => ({ text: point }));
                slideInstance.addText(contentPoints, { 
                    x: 1, 
                    y: 1.5, 
                    w: '80%', 
                    h: '75%', 
                    fontSize: 18, 
                    bullet: true,
                    color: '363636'
                });
            }
        });
    
        pptx.writeFile({ fileName: `Presentacion-IA-${Date.now()}.pptx` });
    };
  
  const handleTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... as before ... */ };
  
  const forgetTrainedFile = () => { /* ... as before ... */ };

  const handleTrainingSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingInput.trim() || isTrainingSending || !geminiApiKey) return;
    const text = trainingInput.trim();
    setTrainingInput('');
    setTrainingMessages(prev => [...prev, { role: 'user', content: { type: 'text', data: text } }]);
    setIsTrainingSending(true);
    setError(null);
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    try {
        if (text.startsWith('/imagen ')) {
            const prompt = text.replace('/imagen ', '');
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] }, config: { responseModalities: [Modality.IMAGE] } });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                const base64Data = part.inlineData.data;
                setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'image', data: `data:image/jpeg;base64,${base64Data}` } }]);
                setLastTrainingImage(base64Data);
            } else throw new Error("No se pudo generar la imagen.");
        } else if (lastTrainingImage) {
            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: lastTrainingImage } };
            const textPart = { text };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [imagePart, textPart] }, config: { responseModalities: [Modality.IMAGE] } });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                const base64Data = part.inlineData.data;
                setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'image', data: `data:image/jpeg;base64,${base64Data}` } }]);
                setLastTrainingImage(base64Data);
            } else throw new Error("No se pudo editar la imagen.");
        } else if (trainingChat) {
            const responseStream = await trainingChat.sendMessageStream({ message: text });
            setTrainingMessages(prev => [...prev, { role: 'model', content: { type: 'text', data: '' } }]);
            setLastTrainingImage(null);
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
        setIsTrainingSending(false);
    }
  };
  
    const downloadImage = (base64Url: string, filename: string = `gemini-image-${Date.now()}.png`) => {
        const link = document.createElement('a');
        link.href = base64Url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  const renderSimpleChat = (currentChat: Chat | null, messages: SimpleChatMessage[], setMessages: any, input: string, setInput: any, isSending: boolean, onSend: any, ref: any, mode: 'simple'|'full') => (
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
          {isSending && messages[messages.length-1]?.role === 'user' && (
             <div className="flex items-start gap-4"><div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div><div className="max-w-xl p-4 rounded-2xl bg-light-bg dark:bg-dark-bg rounded-bl-none flex items-center"><Spinner/><span className="ml-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Pensando...</span></div></div>
          )}
           {error && !isSending && <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg"><p><span className="font-bold">Error:</span> {error}</p></div>}
        </div>
        <div className="p-4 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border">
          <form onSubmit={onSend} className="flex items-center gap-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(e); }}} placeholder={!geminiApiKey ? "Función de IA no disponible" : "Escribe tu mensaje aquí..."} className="flex-1 w-full p-3 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg resize-none focus:ring-2 focus:ring-brand-accent focus:outline-none" rows={1} disabled={isSending || !geminiApiKey}/>
            <button type="submit" disabled={isSending || !input.trim() || !geminiApiKey} className="flex-shrink-0 h-12 w-12 rounded-lg text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"><SendIcon className="h-6 w-6" /></button>
          </form>
        </div>
      </div>
  );
  
  const renderImageCreator = () => (
    <div className="flex flex-col h-full bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md">
      <div ref={imageContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
        {imageMessages.length === 0 && <div className="text-center text-light-text-secondary dark:text-dark-text-secondary h-full flex flex-col justify-center items-center"><PhotographIcon className="h-16 w-16 mx-auto text-gray-400"/>La imagen generada aparecerá aquí.</div>}
        {imageMessages.map((msg, i) => msg.type === 'text' ? (
            <div key={i} className="flex justify-end items-start gap-4"><div className="max-w-xl p-4 rounded-2xl bg-brand-primary text-white rounded-br-none">{msg.content}</div><div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div></div>
        ) : (
            <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div>
                <div className="relative group p-2 bg-light-bg dark:bg-dark-bg rounded-lg">
                    <img src={msg.content} alt={`Generated image ${i}`} className="max-w-full max-h-80 rounded-md" />
                    <button 
                        onClick={() => downloadImage(msg.content)}
                        className="absolute top-4 right-4 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Descargar imagen"
                    >
                        <DocumentDownloadIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        ))}
        {isImageSending && <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><Spinner/> Procesando imagen...</div>}
        {error && <p className="p-2 text-center text-sm text-red-500">{error}</p>}
      </div>
      <div className="p-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
            <input type="text" value={imageUserInput} onChange={e => setImageUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImageMessageSend()} placeholder="Describe una imagen o una edición..." className="flex-grow p-3 border rounded-lg" disabled={isImageSending}/>
            <button onClick={handleImageMessageSend} disabled={isImageSending || !imageUserInput.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">{isImageSending ? 'Enviando...' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
      <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col h-full">
        <div ref={searchContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">{/* ... as before ... */}</div>
        <div className="p-4 border-t">
            <div className="flex items-center gap-3">
                <input type="text" value={searchUserInput} onChange={e => setSearchUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchSend()} placeholder="Pregunta sobre eventos recientes..." className="flex-grow p-3 border rounded-lg" disabled={isSearchSending}/>
                <button onClick={handleSearchSend} disabled={isSearchSending || !searchUserInput.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">Buscar</button>
            </div>
        </div>
    </div>
  );

  const renderPresentationCreator = () => (
    <div className="flex h-full gap-4">
        <div className="w-1/2 flex flex-col bg-light-card dark:bg-dark-card rounded-lg border shadow-md">
            <div ref={presentationContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">{/* chat messages */}
                {presentationMessages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>{/*...*/}</div>
                ))}
                {isPresentationSending && <div className="flex items-center gap-2"><Spinner/>{presentationStep || 'Creando...'}</div>}
            </div>
            <div className="p-4 border-t">
                <div className="flex items-center gap-3">
                    <input type="text" value={presentationUserInput} onChange={e => setPresentationUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePresentationMessageSend()} placeholder={presentationSlides ? "Pide una modificación..." : "Tema para la presentación..."} className="flex-grow p-3 border rounded-lg" disabled={isPresentationSending}/>
                    <button onClick={handlePresentationMessageSend} disabled={isPresentationSending || !presentationUserInput.trim()} className="px-4 py-2 bg-brand-primary text-white rounded-lg disabled:bg-gray-400">Enviar</button>
                </div>
            </div>
        </div>
        <div className="w-1/2 flex flex-col bg-light-card dark:bg-dark-card rounded-lg border shadow-md">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">Vista Previa de Diapositivas</h3>
                {presentationSlides && <button onClick={downloadPresentation} className="px-3 py-1 bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm"><DocumentDownloadIcon className="h-4 w-4"/> Descargar</button>}
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {presentationSlides ? <div className="space-y-4">{/*... render slides ...*/}</div> : <div className="text-center text-light-text-secondary h-full flex flex-col justify-center items-center"><PresentationChartBarIcon className="h-16 w-16 text-gray-400"/>La vista previa aparecerá aquí.</div>}
            </div>
        </div>
    </div>
  );
  
    const renderTraining = () => (
        <div className="bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col h-full">
          <div className="p-2 border-b flex items-center justify-between">{/* ... as before ... */}</div>
          <div ref={trainingContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
            {trainingMessages.map((msg, index) => {
                if (msg.role === 'user') {
                    return (
                        <div key={index} className="flex justify-end items-start gap-4">
                            <div className="max-w-xl p-4 rounded-2xl bg-brand-primary text-white rounded-br-none">
                                <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">{msg.content.data}</div>
                            </div>
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/></div>
                        </div>
                    )
                }
                const content = msg.content;
                return (
                    <div key={index} className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center"><SparklesIcon className="h-5 w-5 text-brand-primary" /></div>
                        <div className="max-w-xl p-4 rounded-2xl bg-light-bg dark:bg-dark-bg rounded-bl-none">
                            {content.type === 'image' ? (
                                <div className="relative group">
                                    <img src={content.data} alt="Generated content" className="max-w-full max-h-80 rounded-md"/>
                                    <button 
                                        onClick={() => downloadImage(content.data)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Descargar imagen"
                                    >
                                        <DocumentDownloadIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{content.data}</div>
                            )}
                        </div>
                    </div>
                )
            })}
            {isTrainingSending && <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary"><Spinner/> Pensando...</div>}
            {error && <div className="text-red-500">{error}</div>}
          </div>
          <div className="p-4 border-t">
            <form onSubmit={handleTrainingSendMessage} className="flex items-center gap-3">{/* ... as before ... */}</form>
          </div>
        </div>
    );
  
  const renderActiveTool = () => {
    switch (activeTool) {
        case 'chat': return renderSimpleChat(chat, chatMessages, setChatMessages, userInput, setUserInput, isChatSending, handleSendMessage, chatContainerRef, 'full');
        case 'image': return renderImageCreator();
        case 'search': return renderSearch();
        case 'presentation': return renderPresentationCreator();
        case 'training': return renderTraining();
        default: return null;
    }
  };

  const renderContent = () => {
    if (isApiKeyLoading) { /* ... */ }
    if (apiKeyError) { /* ... */ }
    if (!geminiApiKey) { /* ... */ }

    return (
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
                <div className="flex-1 min-w-0">{renderActiveTool()}</div>
            </>
            ) : (
            renderSimpleChat(chat, chatMessages, setChatMessages, userInput, setUserInput, isChatSending, handleSendMessage, chatContainerRef, 'simple')
            )}
        </div>
    );
  };


  if (!canUse) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Asistente Gemini 2.5</h1>
        <div className="mt-6 text-center p-8 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
            <h2 className="text-xl font-bold">Acceso Denegado</h2>
            <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary">No tienes permiso para usar el asistente de IA. Contacta a un administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold cursor-pointer" onClick={handleSecretClick}>Asistente Gemini 2.5</h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                {isFullMode ? 'Selecciona una herramienta para empezar.' : 'Haz una pregunta, pide un resumen o genera ideas para tus proyectos.'}
            </p>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default GeminiView;