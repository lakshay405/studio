
'use server';

/**
 * @fileOverview AI flow to generate a detailed health analysis of a product,
 * with a strong focus on regional variations, Indian context, actionable advice, and consumer awareness.
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
  healthEffects: z.string().describe('Potential health effects (both positive and negative, if applicable) associated with the ingredient, specifically contextualized for common health issues in the detected region (e.g., India - diabetes, bone density).'),
  safetyLevel: z.string().describe('A general safety or concern level indication (e.g., "Generally Safe", "Common Allergen", "Limit Intake", "High Sugar Content", "Widely Debated", "Source of X Nutrient"). Be specific and informative.'),
  regionalNotes: z.string().optional().describe('Specific notes about this ingredient related to regional regulations or common usage, especially if it varies significantly from other regions or is a point of concern in the detected region (e.g., "Allowed in India, but banned/restricted in EU/US due to health concerns like X, Y, Z.").'),
  ingredientRiskFlag: z.enum(["REGIONAL_CONCERN", "GENERALLY_CONSISTENT", "NONE"]).optional().describe('Flag indicating if this ingredient poses a specific concern in the detected region (e.g., "REGIONAL_CONCERN" if it\'s a high-risk ingredient primarily in the Indian variant). Defaults to "NONE" or "GENERALLY_CONSISTENT".'),
  specificConcerns: z.array(z.string()).optional().describe('List of specific, easily understandable concerns for this ingredient, e.g., ["High Sugar", "Potential Carcinogen (4-MEI)", "Artificial Sweetener"]. Used for UI flags.'),
});

const RegionalVariationSchema = z.object({
  region: z.string().describe('The other region (e.g., "EU", "US", "UK").'),
  summary: z.string().describe('A brief summary of how the product formulation in this region differs, e.g., "Uses natural sweeteners, no artificial colors."'),
  keyDifferences: z.array(z.string()).describe('List of key ingredient differences or regulatory notes, e.g., "- No caramel color IV", "+ Contains citric acid instead of phosphoric acid", "- Lower sugar content". Start each difference with "+" for additions/better alternatives and "-" for removals/absent controversial ingredients compared to the primary analyzed product, or just list if neutral. Example: "+ Natural caramel color", "- No phosphoric acid"'),
  variantIndicator: z.enum(["CLEANER_VARIANT", "DIFFERENT_VARIANT", "POTENTIALLY_RISKIER_VARIANT", "UNKNOWN_VARIANT_STATUS"]).optional().describe('Indicator of this variation\'s nature relative to the primary analyzed product. "CLEANER_VARIANT" if objectively better (e.g. less sugar, no controversial additives). "POTENTIALLY_RISKIER_VARIANT" if it contains more controversial items. "DIFFERENT_VARIANT" for neutral changes. "UNKNOWN_VARIANT_STATUS" if differences are noted but qualitative assessment is hard.')
});

const HealthAnalysisOutputSchema = z.object({
  summary: z.string().describe('A simplified, user-focused, easy-to-understand summary of the overall health analysis using plain language. It must highlight key findings for the primary product analyzed, immediately connect with common consumption habits, and expose Indian vs. global double standards if applicable. E.g., "In India, [Product X] contains very high sugar levels – about Y teaspoons per serving – and chemical additives like Z that may affect your long-term health. While these are technically allowed by Indian food laws, many are discouraged or banned in countries like Europe."'),
  detectedRegion: z.string().optional().describe('The region/country for which this specific product formulation is most likely intended or was identified (e.g., "India", "EU", "US"). If input is generic, this might be an assumed region based on common formulations (e.g., "Typical Indian variant").'),
  ingredientAnalysis: z.array(IngredientDetailSchema).describe('A detailed one-by-one analysis of each significant ingredient identified or typically found in the product. If based on a product name, list ingredients common to that type of product for the detected/assumed region.'),
  packagingAnalysis: z.string().describe('Analysis of potential health impacts related to the product\'s typical or known packaging materials for the detected/assumed region (e.g., PET bottles leaching chemicals under heat in Indian storage conditions).'),
  preservativesAndAdditivesAnalysis: z.string().describe('Specific analysis of common preservatives and additives identified or typically found in the product for the detected/assumed region, and their health implications.'),
  breakdown: z.string().describe('An overall nutritional profile and general commentary on the types of ingredients present for the detected/assumed region. This complements the detailed ingredient-by-ingredient analysis.'),
  regulatoryStatus: z
    .string()
    .describe('Information on the regulatory status of the product and its key ingredients, with a focus on the detected region (e.g., FSSAI in India, FDA in USA, EFSA in EU). Mention any relevant approvals, warnings, or controversies.'),
  regionalVariations: z.array(RegionalVariationSchema).optional().describe('Information about known variations of this product in other major regions (e.g., EU, US, UK), especially if they have cleaner or different ingredient profiles. Compare them to the primary product analyzed. If the primary product is from India, highlight how EU/US versions might differ.'),
  overallWarning: z.string().optional().describe('A general warning message if the analyzed product (especially if detected as an Indian variant) is found to have significantly lower-quality or more controversial ingredients compared to its counterparts in regions with stricter regulations like the EU or US. This should be phrased carefully and factually.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for this health report. This score must reflect the completeness and specificity of the input data. An analysis based on a clear, full ingredient list (e.g., from an image or direct text) and specific product identification should have higher confidence (e.g., 75-95). If based solely on a product name, the analysis will be of a *typical* product of that kind for the *assumed/detected region*; in this case, the confidence score should be moderate (e.g., 50-75), and you must clearly state that the analysis is for a general product type of a specific region. State the primary factors influencing your confidence.'),
  sources: z.array(z.string()).describe('A list of up to 5 key data sources or types of information (e.g., "FSSAI guidelines", "Open Food Facts (India)", "EU food additive database") used to generate this health report. Be specific about regional sources if used.'),
  overallRiskScore: z.number().min(1).max(5).optional().describe('A numeric health risk score from 1 (low concern) to 5 (high concern), derived from the overall analysis.'),
  overallRiskLevel: z.string().optional().describe('Qualitative risk level corresponding to the score, e.g., "Low Concern", "Moderate Concern", "High Concern".'),
  healthierAlternatives: z.array(z.string()).optional().describe('A list of 2-4 actionable, locally relevant healthier alternatives to the analyzed product. E.g., "Fresh lime soda (homemade)", "Plain soda with lemon".'),
  corporatePracticesNote: z.string().optional().describe('A brief note on corporate double standards if applicable, e.g., "Global brands like [Brand Name] sometimes use cheaper, lower-grade additives in regions like India to reduce costs, while their products in the EU/US may use higher-quality ingredients due to stricter laws."'),
  consumerRightsTip: z.string().optional().describe('A helpful tip for consumers in the detected region. For India, default to: "Did you know? You can file complaints with FSSAI if product labeling is misleading or incomplete. Visit: https://foodlicensing.fssai.gov.in/cmsweb/Complaints.aspx"'),
});
export type HealthAnalysisOutput = z.infer<typeof HealthAnalysisOutputSchema>;

export async function generateHealthAnalysis(input: HealthAnalysisInput): Promise<HealthAnalysisOutput> {
  return generateHealthAnalysisFlow(input);
}

const generateHealthAnalysisPrompt = ai.definePrompt({
  name: 'generateHealthAnalysisPrompt',
  input: {schema: HealthAnalysisInputSchema},
  output: {schema: HealthAnalysisOutputSchema},
  prompt: `You are an expert AI assistant specializing in providing comprehensive, detailed, culturally-aware, and unbiased health analysis of food products. Your goal is to empower users, especially in INDIA, to make informed choices. Your language must be PLAIN, DIRECT, and ACTIONABLE. Avoid jargon.

Product Information: {{{productInfo}}}
{{#if userRegionHint}}User's Region Hint: {{{userRegionHint}}}{{/if}}

Primary Task: Analyze the provided product information and generate a thorough health report according to the HealthAnalysisOutputSchema.

**CRITICAL INSTRUCTIONS FOR INDIAN AUDIENCE FOCUS:**

1.  **User-Focused Summary ('summary')**:
    *   LANGUAGE: Use simple, direct language. Translate scientific terms into plain talk.
    *   IMMEDIACY: Connect directly with everyday consumption. E.g., "In India, Coca-Cola contains very high sugar – about 5-6 teaspoons per can – plus chemical additives that can impact your health over time."
    *   REGIONAL COMPARISON (EARLY): If analyzing a global brand, immediately highlight differences if the Indian version is inferior. E.g., "While these ingredients are technically allowed by Indian food laws (FSSAI), many are discouraged or banned in countries like Europe due to health concerns."

2.  **Determine Product Region ('detectedRegion')**:
    *   Attempt to determine the 'detectedRegion'. If 'productInfo' contains an explicit region (e.g., "Coca-Cola India"), use that.
    *   If an image is provided, look for regional cues (language, FSSAI marks for India).
    *   If only a product name is given (e.g., "Maggi Noodles"), **assume the 'detectedRegion' is "India" by default if userRegionHint is India or not provided, or based on common knowledge for that product in India.** Clearly state this assumption in your analysis reasoning if not explicitly given.
    *   All subsequent analysis (ingredients, regulations, etc.) should be relevant to this 'detectedRegion'.

3.  **Ingredient-by-Ingredient Analysis ('ingredientAnalysis')**:
    *   For each ingredient:
        *   \\\`name\\\`, \\\`description\\\` (purpose in product).
        *   \\\`healthEffects\\\`: **Crucially, link to common Indian health issues.** E.g., for Sugar: "Increases risk of diabetes (India has over 100 million people with or at risk of diabetes) and obesity." For Phosphoric Acid: "May weaken bones over time, a concern for older adults and women in India."
        *   \\\`safetyLevel\\\`: Be specific. E.g., "High Sugar Content", "Potential Carcinogen", "Generally Safe".
        *   \\\`regionalNotes\\\`: **This is VITAL.** Clearly state if an ingredient is "Allowed in India, but banned/restricted in EU/US due to [specific reasons like cancer risk, neurotoxicity, etc.]." Example: "Caramel Color IV: Allowed in India. Linked to 4-MEI, a possible cancer risk. Its use is restricted or replaced with natural alternatives in EU/US."
        *   \\\`ingredientRiskFlag\\\`: Set to "REGIONAL_CONCERN" if particularly problematic in the Indian formulation compared to others.
        *   \\\`specificConcerns\\\`: Populate with short, impactful phrases for UI flags. E.g., ["High Sugar", "Contains 4-MEI (possible cancer risk)", "Artificial Sweetener (Aspartame)"].

4.  **Regional Variations ('regionalVariations')**:
    *   For global brands, actively research and report on known variations in major regions like EU, US, UK.
    *   Compare them to the product from 'detectedRegion'. If analyzing an Indian product, highlight if EU/US versions are "CLEANER_VARIANT".
    *   Use "+ " for positive changes and "- " for negative/absent controversial ingredients relative to the primary product.

5.  **Packaging Analysis ('packagingAnalysis')**:
    *   Focus on 'detectedRegion'. E.g., For India: "Many products use PET plastic bottles. Under Indian heat and storage conditions, there's a concern these plastics might leach small amounts of chemicals into the food/drink over time."

6.  **Overall Risk Score & Level ('overallRiskScore', 'overallRiskLevel')**:
    *   Derive a numeric score (1-5, 1=low concern, 5=high concern) and a qualitative level ("Low Concern", "Moderate Concern", "High Concern").
    *   Base this on: severity of ingredient concerns (especially those flagged for India), number of controversial additives, comparison to cleaner international variants, and sugar/salt/fat levels if discernible.
    *   Example: A product with high sugar, multiple controversial additives common in India but banned elsewhere, and a "POTENTIALLY_RISKIER_VARIANT" status compared to EU might get a 4/5 ("High Concern").

7.  **Healthier Alternatives ('healthierAlternatives')**:
    *   Suggest 2-4 PRACTICAL and LOCALLY AVAILABLE alternatives in India. E.g., "Fresh lime soda (nimbu pani)", "Plain Lassi", "Coconut Water", "Branded options with lower sugar if known".

8.  **Corporate Practices Note ('corporatePracticesNote')**:
    *   If applicable for global brands, include a statement like: "It's common for some multinational companies to use cheaper or lower-grade ingredients in countries like India, while their products sold in regions with stricter laws (like the EU or US) use higher-quality or safer alternatives. This is often a cost-saving measure."

9.  **Consumer Rights Tip ('consumerRightsTip')**:
    *   For India (or detectedRegion if different and known), provide a relevant tip.
    *   **Default for India:** "Did you know? As a consumer in India, you can file complaints with the Food Safety and Standards Authority of India (FSSAI) if you find product labeling to be misleading or incomplete. Visit their portal: https://foodlicensing.fssai.gov.in/cmsweb/Complaints.aspx"

10. **Confidence Score ('confidenceScore')**:
    *   Maintain existing logic but ensure reasoning reflects that analysis of a product name is for a *typical regional variant*.

11. **Sources**: Prioritize FSSAI, Indian consumer reports, Open Food Facts (India), alongside global databases.

Tone: Empathetic, empowering, informative, and direct. Highlight discrepancies to build trust.

Generate the full JSON output according to the HealthAnalysisOutputSchema. Ensure all new fields are populated thoughtfully.
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
           // Return a more structured partial error response
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
             // Populate new fields with defaults in case of partial failure
             overallRiskScore: output.overallRiskScore,
             overallRiskLevel: output.overallRiskLevel,
             healthierAlternatives: output.healthierAlternatives,
             corporatePracticesNote: output.corporatePracticesNote,
             consumerRightsTip: output.consumerRightsTip || "Consumer rights information could not be loaded.",
           };
         }
      }

      // Ensure consumerRightsTip has a default if missing from AI (though prompt gives a default)
      if (!output.consumerRightsTip && (output.detectedRegion?.toLowerCase() === 'india' || !output.detectedRegion)) {
        output.consumerRightsTip = "Did you know? As a consumer in India, you can file complaints with the Food Safety and Standards Authority of India (FSSAI) if you find product labeling to be misleading or incomplete. Visit their portal: https://foodlicensing.fssai.gov.in/cmsweb/Complaints.aspx";
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
        overallRiskScore: undefined,
        overallRiskLevel: 'Error',
        healthierAlternatives: [],
        corporatePracticesNote: 'Not available due to error.',
        consumerRightsTip: 'Not available due to error.',
      };
    }
  }
);

    
