import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ContentType } from '../types';
import { addContentItem } from '../services/supabaseService';
import Spinner from './Spinner';
import { XIcon } from './Icons';

interface CreateContentModalProps {
    onClose: () => void;
    onContentCreated: () => void;
}

const CreateContentModal: React.FC<CreateContentModalProps> = ({ onClose, onContentCreated }) => {
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [contentType, setContentType] = useState<ContentType>(ContentType.TEXT);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedData, setGeneratedData] = useState<string | null>(null);

    // FIX: Check if the Gemini API key is available in the environment.
    const isApiKeyMissing = !process.env.API_KEY;

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }

        // FIX: Prevent API calls and inform the user if the key is missing.
        if (isApiKeyMissing) {
            setError("AI feature is not configured. An API key is required.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedData(null);

        try {
            // FIX: Remove the non-null assertion as we've already checked for the key.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            if (contentType === ContentType.TEXT) {
                const model = 'gemini-2.5-flash';
                const result = await ai.models.generateContent({
                    model: model,
                    contents: prompt,
                });
                setGeneratedData(result.text);
            } else if (contentType === ContentType.LINK) {
                 const model = 'gemini-2.5-flash';
                 const result = await ai.models.generateContent({
                    model: model,
                    contents: `Please provide a single, direct URL for the following query. Only output the URL and nothing else. Query: ${prompt}`,
                });
                setGeneratedData(result.text.trim());
            } else if (contentType === ContentType.IMAGE) {
                const model = 'imagen-4.0-generate-001';
                const result = await ai.models.generateImages({
                    model: model,
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: '1:1',
                    },
                });

                if (result.generatedImages && result.generatedImages.length > 0 && result.generatedImages[0].image) {
                    const base64Image = result.generatedImages[0].image.imageBytes;
                    setGeneratedData(`data:image/jpeg;base64,${base64Image}`);
                } else {
                    throw new Error("Image generation failed, possibly due to safety filters. Please try a different or more descriptive prompt.");
                }
            }
        } catch (err) {
            console.error('Error generating content:', err);
            if (err instanceof Error) {
                setError(`Failed to generate content: ${err.message}`);
            } else {
                setError('An unknown error occurred during content generation.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !generatedData) {
            setError('Please provide a title and generate content before saving.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await addContentItem({
                title,
                type: contentType,
                data: generatedData,
            });
            onContentCreated();
        } catch (err) {
            console.error('Error saving content:', err);
             if (err instanceof Error) {
                setError(`Failed to save content: ${err.message}`);
            } else {
                setError('An unknown error occurred while saving.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const renderPreview = () => {
        if (!generatedData) return null;
        switch (contentType) {
            case ContentType.TEXT:
            case ContentType.LINK:
                return <textarea className="w-full h-32 p-2 mt-4 border border-gray-300 dark:border-gray-600 rounded-md bg-light-bg dark:bg-dark-bg text-text-primary dark:text-dark-text-primary" readOnly value={generatedData} />;
            case ContentType.IMAGE:
                return <div className="mt-4 flex justify-center"><img src={generatedData} alt="Generated content" className="rounded-md max-h-48" /></div>;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card-bg dark:bg-dark-card-bg rounded-lg shadow-xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary dark:text-dark-text-secondary hover:text-primary">
                    <XIcon />
                </button>
                <h2 className="text-2xl font-bold mb-4">Create New Content with AI</h2>
                
                <div className="space-y-4">
                     <div>
                        <label htmlFor="content-title" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">Title</label>
                        <input
                            type="text"
                            id="content-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., 'My Awesome Blog Post'"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">Content Type</label>
                        <div className="flex space-x-4">
                            {/* FIX: Explicitly type `type` as ContentType to resolve issue with calling string methods on an `unknown` type. */}
                            {(Object.values(ContentType)).map((type: ContentType) => (
                                <button
                                    key={type}
                                    onClick={() => { setContentType(type); setGeneratedData(null); setError(null); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${contentType === type ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="content-prompt" className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">Prompt</label>
                        <textarea
                            id="content-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                contentType === ContentType.TEXT ? "Write a short story about a robot..." :
                                contentType === ContentType.IMAGE ? "A futuristic city skyline at sunset..." :
                                "A tutorial about React hooks..."
                            }
                            className="w-full h-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-light-bg dark:bg-dark-bg text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={isLoading || isApiKeyMissing}
                        />
                        {isApiKeyMissing && (
                            <p className="text-xs text-yellow-500 mt-1">
                                AI generation is disabled. An API key has not been configured.
                            </p>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    
                    {isLoading ? (
                         <div className="flex justify-center items-center py-8">
                            <Spinner />
                            <span className="ml-2">Generating...</span>
                        </div>
                    ) : renderPreview()}

                </div>

                <div className="mt-6 flex justify-end space-x-3">
                     <button
                        onClick={handleGenerate}
                        disabled={isLoading || isSaving || !prompt.trim() || isApiKeyMissing}
                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                        title={isApiKeyMissing ? "AI feature is disabled because an API key is not configured." : "Generate content"}
                    >
                       Generate
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading || isSaving || !generatedData || !title.trim()}
                        className="flex items-center justify-center bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <><Spinner /> <span className="ml-2">Saving...</span></> : 'Save Content'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateContentModal;
