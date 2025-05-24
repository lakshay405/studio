
'use server';

/**
 * @fileOverview AI flow to generate a detailed health analysis of a product,
 * with a focus on regional variations and Indian context.
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
      'The product information to analyze. This can be a product name, a list of ingredients, a barcode, or a data URI of a product label image (e.g., "data:image/png;base64,..."). If providing a product name for a global brand, specify region if known (e.g., "Coca-Cola India").'
    ),
  userRegionHint: z.string().optional().describe('Optional hint for the user\'s current region, e.g., "India". This helps in tailoring warnings and comparisons.'),
});
export type HealthAnalysisInput = z.infer<typeof HealthAnalysisInputSchema>;

const IngredientDetailSchema = z.object({
  name: z.string().describe('The name of the ingredient.'),
  description: z.string().describe('A brief description of the ingredient and its purpose in the product.'),
  healthEffects: z.string().describe('Potential health effects (both positive and negative, if applicable) associated with the ingredient.'),
  safetyLevel: z.string().describe('A general safety or concern level indication (e.g., "Generally Safe", "Common Allergen", "Limit Intake", "Widely Debated", "Source of X Nutrient"). Be specific and informative.'),
  regionalNotes: z.string().optional().describe('Specific notes about this ingredient related to regional regulations or common usage, especially if it varies significantly from other regions or is a point of concern in the detected region (e.g., specific to India).'),
  ingredientRiskFlag: z.enum(["REGIONAL_CONCERN", "GENERALLY_CONSISTENT", "NONE"]).optional().describe('Flag indicating if this ingredient poses a specific concern in the detected region (e.g., "REGIONAL_CONCERN" if it\'s a high-risk ingredient primarily in the Indian variant). Defaults to "NONE" or "GENERALLY_CONSISTENT".')
});

const RegionalVariationSchema = z.object({
  region: z.string().describe('The other region (e.g., "EU", "US", "UK").'),
  summary: z.string().describe('A brief summary of how the product formulation in this region differs, e.g., "Uses natural sweeteners, no artificial colors."'),
  keyDifferences: z.array(z.string()).describe('List of key ingredient differences or regulatory notes, e.g., "- No caramel color IV", "+ Contains citric acid instead of phosphoric acid", "- Lower sugar content". Start each difference with "+" for additions/better alternatives and "-" for removals/absent controversial ingredients compared to the primary analyzed product, or just list if neutral. Example: "+ Natural caramel color", "- No phosphoric acid"'),
  variantIndicator: z.enum(["CLEANER_VARIANT", "DIFFERENT_VARIANT", "POTENTIALLY_RISKIER_VARIANT", "UNKNOWN_VARIANT_STATUS"]).optional().describe('Indicator of this variation\'s nature relative to the primary analyzed product. "CLEANER_VARIANT" if objectively better (e.g. less sugar, no controversial additives). "POTENTIALLY_RISKIER_VARIANT" if it contains more controversial items. "DIFFERENT_VARIANT" for neutral changes. "UNKNOWN_VARIANT_STATUS" if differences are noted but qualitative assessment is hard.')
});

const HealthAnalysisOutputSchema = z.object({
  summary: z.string().describe('A simplified, easy-to-understand summary of the overall health analysis, highlighting key findings for the primary product analyzed.'),
  detectedRegion: z.string().optional().describe('The region/country for which this specific product formulation is most likely intended or was identified (e.g., "India", "EU", "US"). If input is generic, this might be an assumed region based on common formulations (e.g., "Typical Indian variant").'),
  ingredientAnalysis: z.array(IngredientDetailSchema).describe('A detailed one-by-one analysis of each significant ingredient identified or typically found in the product. If based on a product name, list ingredients common to that type of product for the detected/assumed region.'),
  packagingAnalysis: z.string().describe('Analysis of potential health impacts related to the product\'s typical or known packaging materials for the detected/assumed region.'),
  preservativesAndAdditivesAnalysis: z.string().describe('Specific analysis of common preservatives and additives identified or typically found in the product for the detected/assumed region, and their health implications.'),
  breakdown: z.string().describe('An overall nutritional profile and general commentary on the types of ingredients present for the detected/assumed region. This complements the detailed ingredient-by-ingredient analysis.'),
  regulatoryStatus: z
    .string()
    .describe('Information on the regulatory status of the product and its key ingredients, with a focus on the detected region (e.g., FSSAI in India, FDA in USA, EFSA in EU). Mention any relevant approvals, warnings, or controversies.'),
  regionalVariations: z.array(RegionalVariationSchema).optional().describe('Information about known variations of this product in other major regions (e.g., EU, US, UK), especially if they have cleaner or different ingredient profiles. Compare them to the primary product analyzed. If the primary product is from India, highlight how EU/US versions might differ.'),
  overallWarning: z.string().optional().describe('A general warning message if the analyzed product (especially if detected as an Indian variant) is found to have significantly lower-quality or more controversial ingredients compared to its counterparts in regions with stricter regulations like the EU or US. This should be phrased carefully and factually.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for this health report. This score must reflect the completeness and specificity of the input data. An analysis based on a clear, full ingredient list (e.g., from an image or direct text) and specific product identification should have higher confidence (e.g., 75-95). If based solely on a product name, the analysis will be of a *typical* product of that kind for the *assumed/detected region*; in this case, the confidence score should be moderate (e.g., 50-75), and you must clearly state that the analysis is for a general product type of a specific region. State the primary factors influencing your confidence.'),
  sources: z.array(z.string()).describe('A list of up to 5 key data sources or types of information (e.g., "FSSAI guidelines", "Open Food Facts (India)", "EU food additive database") used to generate this health report. Be specific about regional sources if used.'),
});
export type HealthAnalysisOutput = z.infer<typeof HealthAnalysisOutputSchema>;

export async function generateHealthAnalysis(input: HealthAnalysisInput): Promise<HealthAnalysisOutput> {
  return generateHealthAnalysisFlow(input);
}

const generateHealthAnalysisPrompt = ai.definePrompt({
  name: 'generateHealthAnalysisPrompt',
  input: {schema: HealthAnalysisInputSchema},
  output: {schema: HealthAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in providing comprehensive, detailed, and unbiased health analysis of food products. Your goal is to empower users to make informed choices, with a special focus on the Indian market and regional product variations.

Product Information: {{{productInfo}}}
{{#if userRegionHint}}User's Region Hint: {{{userRegionHint}}}{{/if}}

Primary Task: Analyze the provided product information and generate a thorough health report according to the HealthAnalysisOutputSchema.

Key Instructions for Analysis (Prioritize Indian Context where applicable):

1.  **Determine Product Region**:
    *   Attempt to determine the 'detectedRegion' for the product. If 'productInfo' contains an explicit region (e.g., "Coca-Cola India"), use that.
    *   If an image is provided, look for regional cues (language, regulatory marks).
    *   If only a product name is given (e.g., "Maggi Noodles"), assume the 'detectedRegion' is "India" by default or based on common knowledge for that product in India. Clearly state this assumption.
    *   All subsequent analysis (ingredients, regulations, etc.) should be relevant to this 'detectedRegion'.

2.  **Ingredient-by-Ingredient Analysis ('ingredientAnalysis')**:
    *   Provide a detailed breakdown for each significant ingredient typically found in the product within the 'detectedRegion'.
    *   For each ingredient, include its purpose, potential health effects, safety/concern level.
    *   Crucially, add 'regionalNotes': Highlight if an ingredient is banned/restricted elsewhere (e.g., in EU/US) but permitted in the 'detectedRegion' (e.g., India). Note if ingredient quality or type varies by region (e.g., "Caramel Color IV" vs. "natural caramel").
    *   Set 'ingredientRiskFlag' to "REGIONAL_CONCERN" if an ingredient is particularly problematic in the 'detectedRegion's' formulation compared to other regions, or if it's a high-risk additive more common in that region. Otherwise, set to "GENERALLY_CONSISTENT" or "NONE".

3.  **Regional Variations ('regionalVariations')**:
    *   If the product is a global brand (e.g., Coca-Cola, Nestlé products, Lays), actively research and report on known variations in other major regions like the EU, US, UK.
    *   For each variation, specify the 'region', a 'summary' of differences, and 'keyDifferences' (e.g., ingredient substitutions, absence of certain additives). Use "+" for positive changes (e.g., "+ Uses natural sweeteners") and "-" for removal of controversial ones (e.g., "- No BVO") relative to the primary product from 'detectedRegion'.
    *   Set 'variantIndicator': "CLEANER_VARIANT" if it's demonstrably healthier (e.g., no artificial sweeteners, lower sodium), "POTENTIALLY_RISKIER_VARIANT" if it seems worse, "DIFFERENT_VARIANT" for neutral differences, or "UNKNOWN_VARIANT_STATUS".
    *   Example: If analyzing "Coca-Cola India", a regional variation for "Coca-Cola EU" might state: region="EU", summary="Uses natural caramel, different acidulant.", keyDifferences=["+ Natural caramel color", "- No phosphoric acid, uses citric acid"], variantIndicator="CLEANER_VARIANT".

4.  **Packaging, Preservatives & Additives, Overall Breakdown**: Analyze these for the 'detectedRegion'. Highlight any region-specific concerns (e.g., types of plastics used, additives common in Indian variants).

5.  **Regulatory Status ('regulatoryStatus')**: Focus on the 'detectedRegion'. For India, refer to FSSAI standards. Compare with FDA (US) and EFSA (EU) if relevant differences exist for key ingredients or product category.

6.  **Overall Warning ('overallWarning')**: If the analysis reveals that the product in the 'detectedRegion' (especially if India) uses significantly lower-quality ingredients or additives that are restricted/banned in regions like the EU/US, provide a concise, factual warning. E.g., "Note: The Indian version of this product may contain [specific ingredient] which is subject to restrictions or not used in its EU/US counterparts due to health concerns."

7.  **Confidence Score ('confidenceScore')**:
    *   Base this on input quality. High (75-95) for full ingredient lists/images.
    *   Moderate (50-75) if based on product name only, even if for a "typical [detectedRegion] variant". Clearly state the analysis is for a *typical* product of that name in the *specified region*. Quality of this "typical" analysis will influence the score within this range.
    *   Explain the reasoning for your score briefly.

8.  **Sources**: Prioritize regional sources like FSSAI, Open Food Facts (India), local consumer reports if applicable, alongside global databases.

Global Brand Example (Coca-Cola):
- If input is "Coca-Cola India" or "Coca-Cola" (and you assume India as detectedRegion):
    - Main analysis focuses on typical Indian formulation (e.g., "caramel color IV", "phosphoric acid").
    - 'regionalVariations' should include an entry for "EU" detailing differences like "natural caramel", "citric acid", and flag it as "CLEANER_VARIANT".
- If input is "Coca-Cola EU":
    - Main analysis for EU formulation.
    - 'regionalVariations' might include "India" and flag it as "POTENTIALLY_RISKIER_VARIANT" if applicable.

Tone: Objective, informative, balanced. Avoid alarmist language but highlight genuine, evidence-backed concerns, especially regional disparities.

Generate the full JSON output according to the HealthAnalysisOutputSchema.
`,
});

const generateHealthAnalysisFlow = ai.defineFlow(
  {
    name: 'generateHealthAnalysisFlow',
    inputSchema: HealthAnalysisInputSchema,
    outputSchema: HealthAnalysisOutputSchema,
  },
  async (input: HealthAnalysisInput) => {
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
      // Basic validation for key fields
      if (!output.summary || !output.ingredientAnalysis || output.ingredientAnalysis.length === 0) {
         console.warn('Health analysis output was missing key fields (summary or ingredientAnalysis), retrying once.');
         const retryResult = await generateHealthAnalysisPrompt(input);
         if (retryResult.output && retryResult.output.summary && retryResult.output.ingredientAnalysis && retryResult.output.ingredientAnalysis.length > 0) {
           return retryResult.output;
         } else {
           console.error('Failed to generate health analysis with key fields after retry.');
           return {
             summary: output.summary || 'Health analysis could not be fully generated. Key information is missing.',
             ingredientAnalysis: output.ingredientAnalysis || [],
             packagingAnalysis: output.packagingAnalysis || 'Not available.',
             preservativesAndAdditivesAnalysis: output.preservativesAndAdditivesAnalysis || 'Not available.',
             breakdown: output.breakdown || 'Partial data available. Critical analysis components might be missing.',
             regulatoryStatus: output.regulatoryStatus || 'Status not available.',
             confidenceScore: output.confidenceScore || 0,
             sources: output.sources || [],
             detectedRegion: output.detectedRegion || 'Unknown',
             regionalVariations: output.regionalVariations || [],
             overallWarning: output.overallWarning || undefined,
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
        detectedRegion: 'Error',
        regionalVariations: [],
        overallWarning: 'Analysis could not be performed due to an internal error.',
      };
    }
  }
);
