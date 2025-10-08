import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { SparklesIcon } from '../components/Icons';
import Spinner from '../components/Spinner';

// A simple component for the paper plane send icon
const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
);

const GeminiView: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isApiKeyMissing = !process.env.API_KEY;

  useEffect(() => {
    if (isApiKeyMissing) {
      setError("La función de IA no está configurada. Se requiere una clave API.");
      return;
    }
    
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: 'Eres un asistente útil y amigable llamado Gemini. Ayudas a los usuarios con la gestión de proyectos, la mejora continua y tareas generales. Respondes en español.',
          },
        });
        setChat(newChat);
        setMessages([{ role: 'model', content: '¡Hola! Soy Gemini, tu asistente de IA. ¿Cómo puedo ayudarte a mejorar tus proyectos hoy?' }]);
      } catch (err) {
        console.error("Error initializing Gemini Chat:", err);
        setError(err instanceof Error ? err.message : "No se pudo inicializar el chat de IA.");
      }
    };
    initChat();
  }, [isApiKeyMissing]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const text = userInput.trim();
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);
    setError(null);
    
    try {
        const responseStream = await chat.sendMessageStream({ message: text });
        
        // Add a new empty model message to the state to stream into
        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        for await (const chunk of responseStream) {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.content += chunk.text;
                return newMessages;
            });
        }
    } catch (err) {
        console.error("Error sending message to Gemini:", err);
        const errorMessage = err instanceof Error ? err.message : "Ocurrió un error al contactar al asistente.";
        setError(errorMessage);
        setMessages(prev => [...prev, { role: 'model', content: `Lo siento, ocurrió un error: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Asistente Gemini 2.5</h1>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
        Haz una pregunta, pide un resumen o genera ideas para tus proyectos.
      </p>

      <div className="mt-6 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-md flex flex-col h-[70vh]">
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 text-brand-primary" />
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-brand-primary text-white rounded-br-none' : 'bg-light-bg dark:bg-dark-bg rounded-bl-none'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                   <UserCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length-1]?.role === 'user' && (
             <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 text-brand-primary" />
                </div>
                <div className="max-w-xl p-4 rounded-2xl bg-light-bg dark:bg-dark-bg rounded-bl-none flex items-center">
                    <Spinner/>
                    <span className="ml-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">Pensando...</span>
                </div>
            </div>
          )}
           {error && !isLoading && (
            <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                <p><span className="font-bold">Error:</span> {error}</p>
            </div>
           )}
        </div>

        <div className="p-4 bg-light-bg dark:bg-dark-bg/50 border-t border-light-border dark:border-dark-border">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e as any);
                  }
              }}
              placeholder={isApiKeyMissing ? "Función de IA no disponible" : "Escribe tu mensaje aquí..."}
              className="flex-1 w-full p-3 border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card rounded-lg resize-none focus:ring-2 focus:ring-brand-accent focus:outline-none"
              rows={1}
              disabled={isLoading || isApiKeyMissing}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim() || isApiKeyMissing}
              className="flex-shrink-0 h-12 w-12 rounded-lg text-white bg-brand-primary hover:bg-brand-secondary disabled:bg-brand-primary/50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Enviar mensaje"
            >
              {isLoading ? <Spinner /> : <SendIcon className="h-6 w-6" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GeminiView;
