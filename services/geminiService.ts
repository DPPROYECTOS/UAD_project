
import { GoogleGenAI, Type } from "@google/genai";

const isApiKeyMissing = !process.env.API_KEY;

// Define the strict schema for the project ideas response.
const projectIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    name: { 
      type: Type.STRING,
      description: "Un nombre de proyecto conciso y profesional."
    },
    description: { 
      type: Type.STRING,
      description: "Una descripción detallada del proyecto, de 2 a 3 frases."
    },
    team: {
      type: Type.ARRAY,
      description: "Una lista sugerida de 2 a 4 roles o nombres de personas para el equipo.",
      items: { type: Type.STRING }
    }
  },
  required: ["name", "description", "team"]
};

/**
 * Generates project ideas using the Gemini AI model.
 * @param idea - The user's initial project idea.
 * @returns A structured project object with name, description, and team.
 */
export const generateProjectIdeas = async (idea: string) => {
  if (isApiKeyMissing) {
    throw new Error("AI feature is not configured. An API key is required.");
  }
  if (!idea.trim()) {
      throw new Error("Please provide a project idea.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Basado en la siguiente idea, genera una propuesta de proyecto estructurada. Idea: "${idea}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectIdeaSchema,
      },
    });

    const jsonText = result.text.trim();
    if (!jsonText) {
      throw new Error("La respuesta de la IA estaba vacía. Inténtalo de nuevo con una idea más descriptiva.");
    }

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error generating project ideas from Gemini:", error);
    // Provide a more user-friendly error message
    if (error instanceof Error) {
        if (error.message.includes('SAFETY')) {
            throw new Error("La idea fue bloqueada por filtros de seguridad. Por favor, reformula tu idea.");
        }
        throw new Error(`Error de la IA: ${error.message}`);
    }
    throw new Error("Ocurrió un error desconocido al generar ideas.");
  }
};
