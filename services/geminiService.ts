import { GoogleGenAI } from "@google/genai";

export const generateForestTexture = async (): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Using Nano Banana for fast, efficient image generation of the environment
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A top-down pixel art texture of a dense green forest, seamless tile, style of Clash of Clans or Stardew Valley, high quality, vibrant green trees.',
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to generate forest texture:", error);
    return null;
  }
};