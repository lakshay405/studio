
'use server';

/**
 * @fileOverview AI flow to generate a detailed health analysis of a product.
 *
 * - generateHealthAnalysis - A function that generates the health analysis.
 * - HealthAnalysisInput - The input type for the generateHealthAnalysis function.
 * - HealthAnalysisOutput - The return type for the generateHealthAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthAnalysisInputSchema = z.object({
  productInfo: z
    .string()
    .describe(
      'The product information to analyze. This can be a product name, a list of ingredients, a barcode, or a data URI of a product label image (e.g., "data:image/png;base64,...").'
    ),
});
export type HealthAnalysisInput = z.infer<typeof HealthAnalysisInputSchema>;

const IngredientDetailSchema = z.object({
  name: z.string().describe('The name of the ingredient.'),
  description: z.string().describe('A brief description of the ingredient and its purpose in the product.'),
  healthEffects: z.string().describe('Potential health effects (both positive and negative, if applicable) associated with the ingredient.'),
  safetyLevel: z.string().describe('A general safety or concern level indication (e.g., "Generally Safe", "Common Allergen", "Limit Intake", "Widely Debated", "Source of X Nutrient"). Be specific and informative.')
});

const HealthAnalysisOutputSchema = z.object({
  summary: z.string().describe('A simplified, easy-to-understand summary of the overall health analysis, highlighting key findings.'),
  ingredientAnalysis: z.array(IngredientDetailSchema).describe('A detailed one-by-one analysis of each significant ingredient identified or typically found in the product. If based on a product name, list ingredients common to that type of product.'),
  packagingAnalysis: z.string().describe('Analysis of potential health impacts related to the product\'s typical or known packaging materials (e.g., types of plastics like PET, HDPE; presence of BPA or phthalates in linings or containers; information on glass, metal, or paperboard packaging and any associated concerns or benefits). If only a product name is provided, discuss common packaging for that product type.'),
  preservativesAndAdditivesAnalysis: z.string().describe('Specific analysis of common preservatives (e.g., sorbates, benzoates, nitrites) and additives (e.g., artificial colors, flavors, sweeteners, emulsifiers, thickeners) identified or typically found in the product, and their health implications. Be specific about common examples if analyzing based on product name.'),
  breakdown: z.string().describe('An overall nutritional profile and general commentary on the types of ingredients present (e.g., "high in processed sugars", "contains whole grains", "uses artificial sweeteners", "good source of fiber"). This complements the detailed ingredient-by-ingredient analysis and should provide a holistic view of the product composition beyond individual ingredients.'),
  regulatoryStatus: z
    .string()
    .describe('Information on the regulatory status of the product and its key ingredients in major regions (e.g., FDA in USA, EFSA in EU), including any relevant approvals, warnings, or controversies. If analyzing by product name, discuss general regulatory considerations for that product category.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for this health report. This score must reflect the completeness and specificity of the input data. An analysis based on a clear, full ingredient list (e.g., from an image or direct text) and specific product identification should have higher confidence (e.g., 75-95). If based solely on a product name or a vague description, the analysis will be of a *typical* product of that kind; in this case, the confidence score should be moderate (e.g., 50-70), and you must clearly state that the analysis is for a general product type. State the primary factors influencing your confidence in this specific report.'),
  sources: z.array(z.string()).describe('A list of up to 5 key data sources or types of information (e.g., "General nutritional databases", "FDA guidelines on food additives", "Scientific studies on X ingredient") used to generate this health report. Do not list generic website URLs unless they are highly authoritative and specific to a claim.'),
});
export type HealthAnalysisOutput = z.infer<typeof HealthAnalysisOutputSchema>;

export async function generateHealthAnalysis(input: HealthAnalysisInput): Promise<HealthAnalysisOutput> {
  return generateHealthAnalysisFlow(input);
}

const generateHealthAnalysisPrompt = ai.definePrompt({
  name: 'generateHealthAnalysisPrompt',
  input: {schema: HealthAnalysisInputSchema},
  output: {schema: HealthAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in providing comprehensive, detailed, and unbiased health analysis of food products. Your goal is to empower users to make informed choices.

You will receive product information which could be a product name, a list of ingredients, a barcode number, or a data URI of a product label image.
- If an image data URI is provided (e.g., 'data:image/png;base64,...'), first meticulously extract the product name, brand, and full ingredient list from the image.
- If a barcode is provided, state that you cannot directly look up live barcode data but will analyze based on typical products associated with such a barcode if possible, or request more info.
- If only a product name is provided, base your analysis on the most common and representative formulations for such a product. Clearly state in your analysis (especially in summary and confidence reasoning) that your report is for a *typical* product of that name due to limited input.

Analyze the provided product information and generate a thorough health report covering all aspects of the HealthAnalysisOutputSchema.

Key Instructions:
1.  **Ingredient-by-Ingredient Analysis**: For the 'ingredientAnalysis' field, provide a detailed breakdown for each significant ingredient. Include its purpose, potential health effects (positive/negative), and a nuanced safety/concern level. If analyzing a general product type, list common ingredients and analyze them.
2.  **Packaging**: For 'packagingAnalysis', discuss typical packaging materials for this type of product (or specific if known from image/label). Consider plastics (PET, HDPE, etc.), BPA, phthalates, can linings, glass, metal, and paperboard. Discuss potential chemical leaching, environmental impact if relevant to health, and benefits of certain packaging types.
3.  **Preservatives & Additives**: For 'preservativesAndAdditivesAnalysis', specifically identify and discuss common preservatives (e.g., sorbates, benzoates, nitrites, sulfites) and additives (e.g., artificial colors like Red 40, flavors, MSG, sweeteners like aspartame, emulsifiers, thickeners) found or typically found. Explain their purpose and health implications.
4.  **Overall Breakdown**: The 'breakdown' field should offer a holistic view—nutritional profile (e.g., macros, sugar/salt content if inferable), ingredient categories, and processing level.
5.  **Confidence Score**: The 'confidenceScore' (0-100) is crucial. It MUST reflect input data quality.
    - High (75-95): Clear, full ingredient list from image/text, specific product identified.
    - Moderate (50-70): Based on product name only (typical formulation analysis). State this clearly.
    - Low (below 50): Vague input, significant assumptions needed.
    Explain the reasoning for your score briefly.
6.  **Sources**: List key types of information or highly authoritative general sources (e.g., "FDA Food Additive Status List", "WHO guidelines on sugar intake"). Avoid generic web URLs. Max 5 sources.
7.  **Tone**: Be objective, informative, and balanced. Avoid alarmist language but don't shy away from highlighting genuine concerns backed by evidence.

Product Information:
{{{productInfo}}}

Generate the full JSON output according to the HealthAnalysisOutputSchema.
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
        console.warn('Initial health analysis output was empty, retrying once.');
        const retryResult = await generateHealthAnalysisPrompt(input);
        if (retryResult.output) {
          return retryResult.output;
        } else {
          console.error('Failed to generate health analysis after retry. Output was still empty.');
          throw new Error('Failed to generate health analysis after retry.');
        }
      }
      // Basic validation for key fields to ensure the model is somewhat on track
      if (!output.summary || !output.ingredientAnalysis || output.ingredientAnalysis.length === 0) {
         console.warn('Health analysis output was missing key fields (summary or ingredientAnalysis), retrying once.');
         const retryResult = await generateHealthAnalysisPrompt(input);
         if (retryResult.output && retryResult.output.summary && retryResult.output.ingredientAnalysis && retryResult.output.ingredientAnalysis.length > 0) {
           return retryResult.output;
         } else {
           console.error('Failed to generate health analysis with key fields after retry.');
           // Return a partial error structure if retries also fail to produce key fields.
           return {
             summary: output.summary || 'Health analysis could not be fully generated. Key information is missing.',
             ingredientAnalysis: output.ingredientAnalysis || [],
             packagingAnalysis: output.packagingAnalysis || 'Not available.',
             preservativesAndAdditivesAnalysis: output.preservativesAndAdditivesAnalysis || 'Not available.',
             breakdown: output.breakdown || 'Partial data available. Critical analysis components might be missing.',
             regulatoryStatus: output.regulatoryStatus || 'Status not available.',
             confidenceScore: output.confidenceScore || 0,
             sources: output.sources || [],
           };
         }
      }

      return output;
    } catch (error) {
      console.error('Error generating health analysis:', error);
      // Provide a structured error response matching the schema
      return {
        summary: 'Health analysis encountered an error and could not be completed.',
        ingredientAnalysis: [],
        packagingAnalysis: 'Not available due to error.',
        preservativesAndAdditivesAnalysis: 'Not available due to error.',
        breakdown: 'Analysis incomplete due to an error.',
        regulatoryStatus: 'Status not available.',
        confidenceScore: 0,
        sources: ['Error in processing'],
      };
    }
  }
);

