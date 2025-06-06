
'use server';

/**
 * @fileOverview A semantic product search AI agent.
 *
 * - semanticProductSearch - A function that handles the product search process.
 * - SemanticProductSearchInput - The input type for the semanticProductSearch function.
 * - SemanticProductSearchOutput - The return type for the semanticProductSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SemanticProductSearchInputSchema = z.object({
  productName: z.string().describe('The name of the product to search for.'),
  aiServiceProvider: z.enum(['ollama', 'gemini', 'openai', 'anthropic']).describe('Specifies which AI service provider to use.'),
  ollamaModelName: z.string().optional().describe('The name of the Ollama model to use, if aiServiceProvider is "ollama".'),
});
export type SemanticProductSearchInput = z.infer<typeof SemanticProductSearchInputSchema>;

const SemanticProductSearchOutputSchema = z.object({
  searchResults: z
    .array(z.string())
    .describe('A list of relevant product names found using semantic search.'),
});
export type SemanticProductSearchOutput = z.infer<typeof SemanticProductSearchOutputSchema>;

export async function semanticProductSearch(input: SemanticProductSearchInput): Promise<SemanticProductSearchOutput> {
  return semanticProductSearchFlow(input);
}

const baseSearchPromptTemplate = \`You are a product search assistant. Given the product name, you will search for relevant products using semantic search.

Product name: {{{productName}}}

Return a list of relevant product names. Your entire response must be a single, valid JSON object with a single key 'searchResults' which is an array of strings. Do not include any explanatory text or markdown formatting before or after the JSON object.\`;

const genkitSearchPromptDefinition = ai.definePrompt({
  name: 'semanticProductSearchPrompt',
  input: {schema: SemanticProductSearchInputSchema.pick({productName: true})}, 
  output: {schema: SemanticProductSearchOutputSchema},
  prompt: baseSearchPromptTemplate, // Base template, might need adjustments for some models to enforce JSON
});


// Helper to manually fill a simplified "template" for Ollama
function fillSearchPromptTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const key in data) {
    if (data[key] !== undefined) {
      result = result.replace(new RegExp(`{{{${key}}}}`, 'g'), String(data[key]));
    }
  }
  return result;
}

const semanticProductSearchFlow = ai.defineFlow(
  {
    name: 'semanticProductSearchFlow',
    inputSchema: SemanticProductSearchInputSchema,
    outputSchema: SemanticProductSearchOutputSchema,
  },
  async (input: SemanticProductSearchInput) : Promise<SemanticProductSearchOutput> => {
    try {
      const { aiServiceProvider, ollamaModelName, productName } = input;
      const promptData = { productName };
      let modelIdentifier: string;

      if (aiServiceProvider === 'ollama') {
        modelIdentifier = ollamaModelName || 'qwen3:8b'; // Default Ollama model
        console.log(`Using Ollama (${modelIdentifier}) for semantic product search...`);
        const ollamaPromptText = fillSearchPromptTemplate(baseSearchPromptTemplate, promptData);
        // The base prompt already strongly requests JSON, so no need to append further instructions here.
        
        const ollamaPayload = {
          model: modelIdentifier, 
          prompt: ollamaPromptText,
          stream: false,
          format: 'json',
        };

        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ollamaPayload),
        });

        if (!ollamaResponse.ok) {
          const errorBody = await ollamaResponse.text();
          console.error('Ollama API error (semantic search):', ollamaResponse.status, errorBody);
          throw new Error(`Ollama API request failed for semantic search: ${ollamaResponse.status} - ${errorBody}`);
        }
        
        const ollamaResult = await ollamaResponse.json();
        let outputJson;

        if (typeof ollamaResult.response === 'string') {
            try { outputJson = JSON.parse(ollamaResult.response); } 
            catch (e) { throw new Error(`Ollama returned a string in 'response' (search) that is not valid JSON. Content: ${ollamaResult.response}`);}
        } else if (typeof ollamaResult.response === 'object') {
            outputJson = ollamaResult.response;
        } else if (ollamaResult.message && ollamaResult.message.content && typeof ollamaResult.message.content === 'string') {
             try { outputJson = JSON.parse(ollamaResult.message.content); }
             catch (e) { throw new Error(`Ollama returned a string in 'message.content' (search) that is not valid JSON. Content: ${ollamaResult.message.content}`);}
        }
         else {
            throw new Error(`Ollama response field (search) is not a JSON string or expected object. Full response: ${JSON.stringify(ollamaResult)}`);
        }

        const validatedOutput = SemanticProductSearchOutputSchema.safeParse(outputJson);
        if (!validatedOutput.success) {
          console.error("Ollama output (semantic search) failed Zod validation:", validatedOutput.error.errors);
          console.error("Problematic Ollama output (search, raw JSON):", JSON.stringify(outputJson, null, 2));
          throw new Error(`Ollama output (semantic search) did not match schema. Errors: ${JSON.stringify(validatedOutput.error.format())}`);
        }
        return validatedOutput.data;

      } else { // For Genkit-supported cloud providers
        let genkitModelString = '';
        switch (aiServiceProvider) {
          case 'gemini':
            genkitModelString = 'googleai/gemini-2.0-flash';
            break;
          case 'openai':
            genkitModelString = 'openai/gpt-3.5-turbo';
            break;
          case 'anthropic':
            genkitModelString = 'anthropic/claude-3-haiku-20240307';
            break;
          default:
            throw new Error(`Unsupported AI service provider for search: ${aiServiceProvider}`);
        }
        modelIdentifier = genkitModelString;
        console.log(`Using Genkit (${modelIdentifier}) for semantic product search...`);
        
        const {output} = await genkitSearchPromptDefinition(promptData, {model: modelIdentifier});
        if (!output) {
          throw new Error(`Semantic product search with ${modelIdentifier} returned no output.`);
        }
        return output;
      }
    } catch (error: any) {
        console.error('Error in semanticProductSearchFlow:', error);
        const serviceName = input.aiServiceProvider === 'ollama' ? `Ollama (${input.ollamaModelName || 'default'})` : input.aiServiceProvider;
        return {
            searchResults: [`AI service error (${serviceName}): ${error.message ? error.message : 'Unknown error during product search.'}`],
        };
    }
  }
);
