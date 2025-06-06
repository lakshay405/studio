import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {openAI} from '@genkit-ai/openai';
import {anthropic} from 'genkitx-anthropic'; // Changed import
import { config } from 'dotenv';

config(); // Load .env variables

const plugins: GenkitPlugin[] = [];

// Google AI (Gemini) - Assuming GOOGLE_API_KEY or Application Default Credentials are set
plugins.push(googleAI());

// OpenAI - Conditionally add if API key is present
if (process.env.OPENAI_API_KEY) {
  plugins.push(openAI());
} else {
  console.warn("OpenAI API key not found in environment variables. OpenAI services will not be available via Genkit.");
}

// Anthropic (Claude) - Conditionally add if API key is present
if (process.env.ANTHROPIC_API_KEY) {
  plugins.push(anthropic());
} else {
  console.warn("Anthropic API key not found in environment variables. Anthropic services will not be available via Genkit.");
}

export const ai = genkit({
  plugins: plugins,
  // Default model if none is specified in ai.generate calls for Genkit plugins
  // This default is less critical now as flows will specify models directly.
  // model: 'googleai/gemini-2.0-flash', 
});
