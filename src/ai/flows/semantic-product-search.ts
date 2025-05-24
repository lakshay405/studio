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

const prompt = ai.definePrompt({
  name: 'semanticProductSearchPrompt',
  input: {schema: SemanticProductSearchInputSchema},
  output: {schema: SemanticProductSearchOutputSchema},
  prompt: `You are a product search assistant. Given the product name, you will search for relevant products using semantic search.

Product name: {{{productName}}}

Return a list of relevant product names.`,
});

const semanticProductSearchFlow = ai.defineFlow(
  {
    name: 'semanticProductSearchFlow',
    inputSchema: SemanticProductSearchInputSchema,
    outputSchema: SemanticProductSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
