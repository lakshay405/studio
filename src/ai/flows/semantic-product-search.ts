
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
  aiService: z.enum(['gemini', 'ollama']).optional().describe('Specifies which AI service to use. If undefined, defaults based on USE_OLLAMA_LOCALLY env var.'),
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

const geminiSearchPromptTemplate = `You are a product search assistant. Given the product name, you will search for relevant products using semantic search.

Product name: {{{productName}}}

Return a list of relevant product names.`;

const semanticProductSearchPrompt = ai.definePrompt({
  name: 'semanticProductSearchPrompt',
  input: {schema: SemanticProductSearchInputSchema.omit({aiService: true})}, // aiService is for routing, not for the prompt itself
  output: {schema: SemanticProductSearchOutputSchema},
  prompt: geminiSearchPromptTemplate,
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
      const shouldUseOllama = (input.aiService === 'ollama') || (input.aiService === undefined && process.env.USE_OLLAMA_LOCALLY === 'true');
      const ollamaModel = 'qwen3:8b'; // Or make this dynamic if needed

      if (shouldUseOllama) {
        console.log(`Using Ollama (${ollamaModel}) for semantic product search...`);
        const ollamaPromptText = fillSearchPromptTemplate(geminiSearchPromptTemplate, { productName: input.productName });
        const finalOllamaPrompt = ollamaPromptText + "\\n\\nIMPORTANT: Your entire response must be a single, valid JSON object with a single key 'searchResults' which is an array of strings. Do not include any explanatory text or markdown formatting before or after the JSON object.";
        
        const ollamaPayload = {
          model: ollamaModel, 
          prompt: finalOllamaPrompt,
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
            try {
                outputJson = JSON.parse(ollamaResult.response);
            } catch (e) {
                 console.error("Failed to parse JSON string from Ollama's response field (search):", ollamaResult.response, e);
                throw new Error(`Ollama returned a string in 'response' (search) that is not valid JSON. Content: ${ollamaResult.response}`);
            }
        } else if (typeof ollamaResult.response === 'object') {
            outputJson = ollamaResult.response;
        } else {
            console.error("Unexpected Ollama response structure (search):", ollamaResult);
            throw new Error(`Ollama response field (search) is not a JSON string or expected object. Full response: ${JSON.stringify(ollamaResult)}`);
        }

        const validatedOutput = SemanticProductSearchOutputSchema.safeParse(outputJson);
        if (!validatedOutput.success) {
          console.error("Ollama output (semantic search) failed Zod validation:", validatedOutput.error.errors);
          console.error("Problematic Ollama output (search, raw JSON):", JSON.stringify(outputJson, null, 2));
          throw new Error(`Ollama output (semantic search) did not match schema. Errors: ${JSON.stringify(validatedOutput.error.format())}`);
        }
        return validatedOutput.data;

      } else { 
        console.log('Using Google AI (Gemini) for semantic product search...');
        // For Gemini, we pass the productName directly. aiService is not used by the prompt.
        const {output} = await semanticProductSearchPrompt({productName: input.productName});
        return output!;
      }
    } catch (error: any) {
        console.error('Error in semanticProductSearchFlow:', error);
        return {
            searchResults: [`Search failed: ${error.message ? error.message : 'Unknown error'}`],
        };
    }
  }
);
