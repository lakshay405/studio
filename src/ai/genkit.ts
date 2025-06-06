
import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

config(); // Load .env variables

const plugins: GenkitPlugin[] = [];

// Google AI (Gemini) - Always added, may log warnings if GOOGLE_API_KEY or ADC is missing.
// This initialization is separate from selecting Gemini as the active provider for a flow.
plugins.push(googleAI());

// OpenAI - Conditionally load and add if API key is present and module exists
try {
  // Dynamically require the openai plugin
  const { openAI: openAIFn } = require('@genkit-ai/openai');
  if (openAIFn && typeof openAIFn === 'function') {
    if (process.env.OPENAI_API_KEY) {
      plugins.push(openAIFn());
      console.log("OpenAI plugin loaded successfully.");
    } else {
      console.warn("OpenAI API key not found in environment variables. OpenAI services will not be available via Genkit, even though the @genkit-ai/openai module is present.");
    }
  } else {
    console.warn("Failed to load openAIFn function from @genkit-ai/openai module. OpenAI services will be unavailable.");
  }
} catch (e: any) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.warn("@genkit-ai/openai module not found. OpenAI services will be unavailable. If you intend to use OpenAI, please ensure the package is correctly installed (npm install @genkit-ai/openai).");
  } else {
    console.error("An unexpected error occurred while trying to load the @genkit-ai/openai module:", e);
  }
}

// Anthropic (Claude) - Conditionally load and add if API key is present and module exists
try {
  // Dynamically require the anthropic plugin
  const { anthropic: anthropicFn } = require('genkitx-anthropic');
  if (anthropicFn && typeof anthropicFn === 'function') {
    if (process.env.ANTHROPIC_API_KEY) {
      plugins.push(anthropicFn());
      console.log("Anthropic plugin loaded successfully.");
    } else {
      console.warn("Anthropic API key not found in environment variables. Anthropic services will not be available via Genkit, even though the genkitx-anthropic module is present.");
    }
  } else {
    console.warn("Failed to load anthropicFn function from genkitx-anthropic module. Anthropic services will be unavailable.");
  }
} catch (e: any) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.warn("genkitx-anthropic module not found. Anthropic services will be unavailable. If you intend to use Anthropic, please ensure the package is correctly installed (npm install genkitx-anthropic).");
  } else {
    console.error("An unexpected error occurred while trying to load the genkitx-anthropic module:", e);
  }
}

export const ai = genkit({
  plugins: plugins,
  // Default model if none is specified in ai.generate calls for Genkit plugins
  // This default is less critical now as flows will specify models directly.
  // model: 'googleai/gemini-2.0-flash',
});
