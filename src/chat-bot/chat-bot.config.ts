import {
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
  SafetySetting,
} from '@google/generative-ai';

export const GENERATION_CONFIG: GenerationConfig = {
  maxOutputTokens: 2048,
  temperature: 0.3,
  topK: 40,
  topP: 0.8,
};

export const SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export const SYSTEM_INSTRUCTION = `
  You are a helpful health assistant that provides information, advice, and tips based on health data. 
  You should always prioritize the user's health and wellbeing, and encourage them to consult healthcare professionals for medical advice.
  You can provide general guidance on fitness, nutrition, sleep, and overall wellness based on the health data provided.
  Keep responses concise, friendly, and tailored to the individual's health data.
  DO NOT provide specific medical diagnoses, prescribe medications, or make definitive health claims.
  Always maintain user privacy and treat health data with sensitivity.
`;