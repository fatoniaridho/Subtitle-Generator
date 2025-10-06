
import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle, Progress, Word } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// A constant for a small timing adjustment in milliseconds.
// This makes subtitles appear slightly earlier to compensate for potential AI transcription
// and rendering latency, leading to a more synchronized "feel".
const TIMING_ADJUSTMENT_MS = 150;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

export const generateSubtitlesFromVideo = async (
    file: File,
    onProgress: (progress: Progress) => void
): Promise<Word[]> => {
    onProgress({ processed: 0, total: 1, status: 'Preparing video file...' });
    const base64Video = await fileToBase64(file);
    
    const videoPart = {
        inlineData: {
            mimeType: file.type,
            data: base64Video,
        },
    };
    const textPart = {
        text: "Transcribe the audio from this video. Provide ONLY an array of word objects in JSON format. Each object must have 'word' (the transcribed word as a string), 'start' (the start time in seconds as a number), and 'end' (the end time in seconds as a number)."
    };

    onProgress({ processed: 0, total: 1, status: 'Transcribing video with AI... This may take a moment.' });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [videoPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        start: { type: Type.NUMBER },
                        end: { type: Type.NUMBER }
                    },
                    required: ['word', 'start', 'end']
                }
            },
        },
    });

    onProgress({ processed: 1, total: 1, status: 'Parsing response...' });
    const jsonString = response.text.trim();
    // The AI can sometimes wrap the JSON in markdown ```json ... ```
    const cleanJsonString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
    const parsedWords = JSON.parse(cleanJsonString) as Word[];

    if (!Array.isArray(parsedWords)) {
        throw new Error("AI response is not in the expected format (array of words).");
    }
    
    // Sanitize data and apply a small negative timing adjustment for better perceived sync.
    const adjustmentInSeconds = TIMING_ADJUSTMENT_MS / 1000;
    return parsedWords.map(word => ({
        ...word,
        start: Math.max(0, word.start - adjustmentInSeconds),
        end: Math.max(0, word.end - adjustmentInSeconds),
    })).filter(word => word.end > word.start);
};


export const generateSubtitlesFromAudio = async (
    file: File,
    onProgress: (progress: Progress) => void
): Promise<Word[]> => {
    onProgress({ processed: 0, total: 1, status: 'Preparing audio file...' });
    const base64Audio = await fileToBase64(file);
    
    const audioPart = {
        inlineData: {
            mimeType: file.type,
            data: base64Audio,
        },
    };
    const textPart = {
        text: "Transcribe this audio. Provide ONLY an array of word objects in JSON format. Each object must have 'word' (the transcribed word as a string), 'start' (the start time in seconds as a number), and 'end' (the end time in seconds as a number)."
    };

    onProgress({ processed: 0, total: 1, status: 'Transcribing audio with AI...' });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        start: { type: Type.NUMBER },
                        end: { type: Type.NUMBER }
                    },
                    required: ['word', 'start', 'end']
                }
            },
        },
    });

    onProgress({ processed: 1, total: 1, status: 'Parsing response...' });
    const jsonString = response.text.trim();
    // FIX: The AI can sometimes wrap the JSON in markdown, so clean it up before parsing.
    const cleanJsonString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
    const parsedWords = JSON.parse(cleanJsonString) as Word[];

    if (!Array.isArray(parsedWords)) {
        throw new Error("AI response is not in the expected format (array of words).");
    }
    
    // Sanitize data and apply a small negative timing adjustment for better perceived sync.
    const adjustmentInSeconds = TIMING_ADJUSTMENT_MS / 1250;
    return parsedWords.map(word => ({
        ...word,
        start: Math.max(0, word.start - adjustmentInSeconds),
        end: Math.max(0, word.end - adjustmentInSeconds),
    })).filter(word => word.end > word.start);
};