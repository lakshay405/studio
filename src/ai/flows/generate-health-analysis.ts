// 'use server';

/**
 * @fileOverview AI flow to generate a health analysis of a product based on its label or ingredient list.
 *
 * - generateHealthAnalysis - A function that generates the health analysis.
 * - HealthAnalysisInput - The input type for the generateHealthAnalysis function.
 * - HealthAnalysisOutput - The return type for the generateHealthAnalysis function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthAnalysisInputSchema = z.object({
  productInfo: z
    .string()
    .describe(
      'The product label or ingredient list to analyze.  Can include image data URI for label.'
    ),
});
export type HealthAnalysisInput = z.infer<typeof HealthAnalysisInputSchema>;

const HealthAnalysisOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the health analysis.'),
  breakdown: z.string().describe('A detailed breakdown of the ingredients and their potential health effects.'),
  regulatoryStatus: z
    .string()
    .describe('Information on the regulatory status of the product and its ingredients.'),
  confidenceScore: z.number().describe('A confidence score for the health report based on data quality and recency.'),
  sources: z.array(z.string()).describe('A list of data sources used to generate the health report.'),
});
export type HealthAnalysisOutput = z.infer<typeof HealthAnalysisOutputSchema>;

export async function generateHealthAnalysis(input: HealthAnalysisInput): Promise<HealthAnalysisOutput> {
  return generateHealthAnalysisFlow(input);
}

const generateHealthAnalysisPrompt = ai.definePrompt({
  name: 'generateHealthAnalysisPrompt',
  input: {schema: HealthAnalysisInputSchema},
  output: {schema: HealthAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in providing health analysis of food products.

  Analyze the following product information and generate a comprehensive health report.
  Include a breakdown of ingredients, potential health effects, and regulatory status.
  Also, provide a confidence score for the report based on the quality and recency of data sources.
  List the sources used to generate the report.
  Finally, create a simplified summary of the analysis.

  Product Information: {{{productInfo}}}
  `,
});

const generateHealthAnalysisFlow = ai.defineFlow(
  {
    name: 'generateHealthAnalysisFlow',
    inputSchema: HealthAnalysisInputSchema,
    outputSchema: HealthAnalysisOutputSchema,
  },
  async input => {
    try {
      const {output} = await generateHealthAnalysisPrompt(input);

      if (!output) {
        // Retry once if the output is empty
        console.warn('Initial health analysis output was empty, retrying once.');
        const retryResult = await generateHealthAnalysisPrompt(input);
        if (retryResult.output) {
          return retryResult.output;
        } else {
          throw new Error('Failed to generate health analysis after retry.');
        }
      }

      return output;
    } catch (error) {
      console.error('Error generating health analysis:', error);
      // Provide a partial report in case of failure
      return {
        summary: 'Health analysis could not be fully generated due to an error.',
        breakdown: 'Partial data available.',
        regulatoryStatus: 'Status not available.',
        confidenceScore: 0,
        sources: [],
      };
    }
  }
);
