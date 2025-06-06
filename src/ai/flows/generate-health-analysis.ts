
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
  aiServiceProvider: z.enum(['ollama', 'gemini', 'openai', 'anthropic']).describe('Specifies which AI service provider to use.'),
  ollamaModelName: z.string().optional().describe('The name of the Ollama model to use, if aiServiceProvider is "ollama".'),
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
  preservativesAndAdditivesAnalysis: z.string().describe('Specific analysis of common preservatives and additives identified or typically found in the product for the detected/assumed region, and their health implications. Mention specific additive names (e.g., "Sodium Benzoate (E211)", "Aspartame (E951)") and discuss their role, potential side effects, and regulatory status in the detected region vs. others like EU/US. Address concerns about specific E-numbers if identifiable.'),
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
  estimatedNutriScore: z.enum(["A", "B", "C", "D", "E"]).optional().describe('An estimated Nutri-Score like rating (A-E) based on the qualitative analysis of ingredients, overall product type, and likely nutritional profile. This is an approximation, not a precise calculation from quantitative nutritional data. Explain the basis of this estimation briefly within the overall breakdown or summary.'),
});
export type HealthAnalysisOutput = z.infer<typeof HealthAnalysisOutputSchema>;

export async function generateHealthAnalysis(input: HealthAnalysisInput): Promise<HealthAnalysisOutput> {
  return generateHealthAnalysisFlow(input);
}

const basePromptTemplate = `You are an expert AI assistant specializing in providing comprehensive, detailed, culturally-aware, and unbiased health analysis of food products. Your goal is to empower users, especially in INDIA, to make informed choices. Your language must be PLAIN, DIRECT, and ACTIONABLE. Avoid jargon.

Product Information: {{{productInfo}}}
{{#if userRegionHint}}User's Region Hint: {{{userRegionHint}}}{{/if}}

Primary Task: Analyze the provided product information and generate a thorough health report according to the HealthAnalysisOutputSchema.

**CRITICAL INSTRUCTIONS FOR INDIAN AUDIENCE FOCUS:**

1.  **User-Focused Summary (\`summary\`)**:
    *   LANGUAGE: Use simple, direct language. Translate scientific terms into plain talk.
    *   IMMEDIACY: Connect directly with everyday consumption. E.g., "In India, Coca-Cola contains very high sugar – about 5-6 teaspoons per can – plus chemical additives that can impact your health over time."
    *   REGIONAL COMPARISON (EARLY): If analyzing a global brand, immediately highlight differences if the Indian version is inferior. E.g., "While these ingredients are technically allowed by Indian food laws (FSSAI), many are discouraged or banned in countries like Europe due to health concerns."

2.  **Determine Product Region (\`detectedRegion\`)**:
    *   Attempt to determine the 'detectedRegion'. If 'productInfo' contains an explicit region (e.g., "Coca-Cola India"), use that.
    *   If an image is provided, look for regional cues (language, FSSAI marks for India).
    *   If only a product name is given (e.g., "Maggi Noodles"), **assume the 'detectedRegion' is "India" by default if userRegionHint is India or not provided, or based on common knowledge for that product in India.** Clearly state this assumption in your analysis reasoning if not explicitly given.
    *   All subsequent analysis (ingredients, regulations, etc.) should be relevant to this 'detectedRegion'.

3.  **Ingredient-by-Ingredient Analysis (\`ingredientAnalysis\`)**:
    *   For each ingredient:
        *   \`name\`, \`description\` (purpose in product).
        *   \`healthEffects\`: **Crucially, link to common Indian health issues.** E.g., for Sugar: "Increases risk of diabetes (India has over 100 million people with or at risk of diabetes) and obesity." For Phosphoric Acid: "May weaken bones over time, a concern for older adults and women in India."
        *   \`safetyLevel\`: Be specific. E.g., "High Sugar Content", "Potential Carcinogen", "Generally Safe".
        *   \`regionalNotes\`: **This is VITAL.** Clearly state if an ingredient is "Allowed in India, but banned/restricted in EU/US due to [specific reasons like cancer risk, neurotoxicity, etc.]." Example: "Caramel Color IV: Allowed in India. Linked to 4-MEI, a possible cancer risk. Its use is restricted or replaced with natural alternatives in EU/US."
        *   \`ingredientRiskFlag\`: Set to "REGIONAL_CONCERN" if particularly problematic in the Indian formulation compared to others.
        *   \`specificConcerns\`: Populate with short, impactful phrases for UI flags. E.g., ["High Sugar", "Contains 4-MEI (possible cancer risk)", "Artificial Sweetener (Aspartame)"].

4.  **Preservatives and Additives Analysis (\`preservativesAndAdditivesAnalysis\`)**:
    *   Provide a DETAILED breakdown of common preservatives and additives.
    *   Identify them by name and E-number if possible (e.g., "Sodium Benzoate (E211)").
    *   Discuss their purpose, potential health impacts (especially those debated or with concerns in the Indian context), and regulatory status differences between India and stricter regions (EU/US).
    *   If the input is generic (e.g., product name), list common additives found in that product category for the 'detectedRegion'.

5.  **Regional Variations (\`regionalVariations\`)**:
    *   For global brands, actively research and report on known variations in major regions like EU, US, UK.
    *   Compare them to the product from 'detectedRegion'. If analyzing an Indian product, highlight if EU/US versions are "CLEANER_VARIANT".
    *   Use "+ " for positive changes and "- " for negative/absent controversial ingredients relative to the primary product.

6.  **Packaging Analysis (\`packagingAnalysis\`)**:
    *   Focus on 'detectedRegion'. E.g., For India: "Many products use PET plastic bottles. Under Indian heat and storage conditions, there's a concern these plastics might leach small amounts of chemicals into the food/drink over time."

7.  **Overall Risk Score & Level (\`overallRiskScore\`, \`overallRiskLevel\`)**:
    *   Derive a numeric score (1-5, 1=low concern, 5=high concern) and a qualitative level ("Low Concern", "Moderate Concern", "High Concern").
    *   Base this on: severity of ingredient concerns (especially those flagged for India), number of controversial additives, comparison to cleaner international variants, and sugar/salt/fat levels if discernible.
    *   Example: A product with high sugar, multiple controversial additives common in India but banned elsewhere, and a "POTENTIALLY_RISKIER_VARIANT" status compared to EU might get a 4/5 ("High Concern").

8.  **Estimated Nutri-Score (\`estimatedNutriScore\`)**:
    *   Based on your overall qualitative analysis of ingredients (sugar content, presence of beneficial vs. harmful ingredients, product type), provide an *estimated* Nutri-Score like letter grade (A, B, C, D, E).
    *   'A' indicates a healthier choice, 'E' a less healthy one.
    *   **This is an estimation.** Since you don't have quantitative nutritional data (grams of sugar, fat, etc.), clearly state that this is an approximation in the 'breakdown' or 'summary' section (e.g., "Based on its ingredients, we estimate this product would likely receive a Nutri-Score of C. This is an approximation as full nutritional data is not available for precise calculation.").
    *   If the product is clearly very unhealthy (e.g., sugary drink with many additives), it should be D or E. If it's relatively clean (e.g., plain yogurt), it might be A or B.

9.  **Healthier Alternatives (\`healthierAlternatives\`)**:
    *   Suggest 2-4 PRACTICAL and LOCALLY AVAILABLE alternatives in India. E.g., "Fresh lime soda (nimbu pani)", "Plain Lassi", "Coconut Water", "Branded options with lower sugar if known".

10. **Corporate Practices Note (\`corporatePracticesNote\`)**:
    *   If applicable for global brands, include a statement like: "It's common for some multinational companies to use cheaper or lower-grade ingredients in countries like India, while their products sold in regions with stricter laws (like the EU or US) use higher-quality or safer alternatives. This is often a cost-saving measure."

11. **Consumer Rights Tip (\`consumerRightsTip\`)**:
    *   For India (or detectedRegion if different and known), provide a relevant tip.
    *   **Default for India:** "Did you know? As a consumer in India, you can file complaints with the Food Safety and Standards Authority of India (FSSAI) if you find product labeling to be misleading or incomplete. Visit their portal: https://foodlicensing.fssai.gov.in/cmsweb/Complaints.aspx"

12. **Confidence Score (\`confidenceScore\`)**:
    *   Maintain existing logic but ensure reasoning reflects that analysis of a product name is for a *typical regional variant*.

13. **Sources**: Prioritize FSSAI, Indian consumer reports, Open Food Facts (India), alongside global databases.

Tone: Empathetic, empowering, informative, and direct. Highlight discrepancies to build trust.

Generate the full JSON output according to the HealthAnalysisOutputSchema. Ensure all new fields are populated thoughtfully.
`;

const genkitPromptDefinition = ai.definePrompt({
  name: 'generateHealthAnalysisPrompt',
  input: {schema: HealthAnalysisInputSchema.omit({aiServiceProvider: true, ollamaModelName: true })}, // These are for routing, not the prompt itself
  output: {schema: HealthAnalysisOutputSchema},
  prompt: basePromptTemplate,
  // Adding instructions for JSON for cloud providers, though basePrompt already asks for it.
  // This can be more specific if needed for OpenAI/Anthropic.
  // system: "Your entire response MUST be a single, valid JSON object matching the HealthAnalysisOutputSchema. Do not include any explanatory text or markdown formatting like ```json ... ``` before or after the JSON object itself.",
});

// Helper to manually fill a simplified "template" for Ollama
function fillPromptTemplate(template: string, data: Record<string, any>): string {
  let result = template;
  for (const key in data) {
    if (data[key] !== undefined) {
      result = result.replace(new RegExp(`{{{${key}}}}`, 'g'), String(data[key]));
    }
  }
  // Specifically handle the optional block for userRegionHint
  if (data.userRegionHint) {
    result = result.replace(/{{#if userRegionHint}}([\s\S]*?){{\/if}}/g, (match, p1) =>
      p1.replace('{{{userRegionHint}}}', String(data.userRegionHint))
    );
  } else {
    result = result.replace(/{{#if userRegionHint}}([\s\S]*?){{\/if}}/g, '');
  }
  return result;
}

const generateHealthAnalysisFlow = ai.defineFlow(
  {
    name: 'generateHealthAnalysisFlow',
    inputSchema: HealthAnalysisInputSchema,
    outputSchema: HealthAnalysisOutputSchema,
  },
  async (input: HealthAnalysisInput): Promise<HealthAnalysisOutput> => {
    try {
      const { aiServiceProvider, ollamaModelName, productInfo, userRegionHint } = input;
      const promptData = { productInfo, userRegionHint };
      let modelIdentifier: string;
      let serviceName = aiServiceProvider; // Used for logging and default source

      if (aiServiceProvider === 'ollama') {
        modelIdentifier = ollamaModelName || 'qwen3:8b'; // Default Ollama model if not provided
        serviceName = `Ollama (${modelIdentifier})`;
        console.log(`Using ${serviceName} for health analysis...`);
        const ollamaPromptText = fillPromptTemplate(basePromptTemplate, promptData);
        // Append JSON enforcement for Ollama more explicitly
        const finalOllamaPrompt = ollamaPromptText + "\\n\\nIMPORTANT: Your entire response MUST be a single, valid JSON object matching the HealthAnalysisOutputSchema structure described in the initial instructions. Do not include any explanatory text, comments, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON object itself.";
        
        const ollamaPayload = {
          model: modelIdentifier, // Use the determined model name
          prompt: finalOllamaPrompt,
          stream: false,
          format: 'json', // Request JSON format from Ollama if supported by the model/Ollama version
        };

        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ollamaPayload),
        });

        if (!ollamaResponse.ok) {
          const errorBody = await ollamaResponse.text();
          console.error('Ollama API error:', ollamaResponse.status, errorBody);
          throw new Error(`Ollama API request failed: ${ollamaResponse.status} - ${errorBody}`);
        }

        const ollamaResult = await ollamaResponse.json();
        let outputJson;

        // Ollama's response structure can vary. Try common patterns.
        if (typeof ollamaResult.response === 'string') {
            try { outputJson = JSON.parse(ollamaResult.response); } 
            catch (e) { throw new Error(`Ollama returned a string in 'response' that is not valid JSON. Content: ${ollamaResult.response}`); }
        } else if (typeof ollamaResult.response === 'object') { // Sometimes it's already an object
            outputJson = ollamaResult.response;
        } else if (ollamaResult.message && ollamaResult.message.content && typeof ollamaResult.message.content === 'string') { // Another possible structure
             try { outputJson = JSON.parse(ollamaResult.message.content); }
             catch (e) { throw new Error(`Ollama returned a string in 'message.content' that is not valid JSON. Content: ${ollamaResult.message.content}`);}
        } else {
            // If no known structure matches, log the whole thing for debugging.
            throw new Error(`Ollama response field is not a JSON string or expected object. Full response: ${JSON.stringify(ollamaResult)}`);
        }
        
        // Validate the parsed JSON against the Zod schema
        const validatedOutput = HealthAnalysisOutputSchema.safeParse(outputJson);
        if (!validatedOutput.success) {
          console.error("Ollama output failed Zod validation:", validatedOutput.error.errors);
          console.error("Problematic Ollama output (raw JSON):", JSON.stringify(outputJson, null, 2));
          throw new Error(`Ollama output did not match the expected schema. Validation errors: ${JSON.stringify(validatedOutput.error.format())}`);
        }
        
        // Return the validated data, ensuring confidence and sources are sensible
        return {
            ...validatedOutput.data,
            confidenceScore: validatedOutput.data.confidenceScore > 0 ? validatedOutput.data.confidenceScore : 60, // Default confidence if 0
            sources: validatedOutput.data.sources?.length > 0 ? validatedOutput.data.sources : [serviceName], // Default source if empty
        };

      } else { // For Genkit-supported cloud providers (Gemini, OpenAI, Anthropic)
        switch (aiServiceProvider) {
          case 'gemini':
            modelIdentifier = 'googleai/gemini-2.0-flash';
            break;
          case 'openai':
            // Ensure your OPENAI_API_KEY is set in .env for this to work
            modelIdentifier = 'openai/gpt-3.5-turbo'; // Example model, can be changed
            break;
          case 'anthropic':
            // Ensure your ANTHROPIC_API_KEY is set in .env for this to work
            modelIdentifier = 'anthropic/claude-3-haiku-20240307'; // Example model
            break;
          default:
            throw new Error(`Unsupported AI service provider: ${aiServiceProvider}`);
        }
        serviceName = `${aiServiceProvider} (${modelIdentifier.split('/')[1]})`;
        console.log(`Using Genkit (${serviceName}) for health analysis...`);

        // Genkit's definePrompt handles JSON output expectations based on the outputSchema for supported models.
        const {output} = await genkitPromptDefinition(promptData, { model: modelIdentifier });

        if (!output) {
          console.warn(`Initial health analysis output from ${serviceName} was empty, retrying once.`);
          // Simple retry logic
          const retryResult = await genkitPromptDefinition(promptData, { model: modelIdentifier });
          if (retryResult.output) {
            return retryResult.output;
          } else {
            console.error(`Failed to generate health analysis from ${serviceName} after retry. Output was still empty.`);
            throw new Error(`Failed to generate health analysis from ${serviceName} after retry.`);
          }
        }
        
        // Basic check for completeness, can be expanded
        if (!output.summary || !output.ingredientAnalysis || output.ingredientAnalysis.length === 0) {
           console.warn(`Health analysis output from ${serviceName} was missing key fields (summary or ingredientAnalysis), retrying once.`);
           const retryResult = await genkitPromptDefinition(promptData, { model: modelIdentifier });
           if (retryResult.output && retryResult.output.summary && retryResult.output.ingredientAnalysis && retryResult.output.ingredientAnalysis.length > 0) {
             return retryResult.output;
           } else {
             console.error(`Failed to generate health analysis with key fields from ${serviceName} after retry.`);
             // Return a partial error structure that matches the schema
             return {
               summary: output.summary || `Health analysis from ${serviceName} could not be fully generated. Key information is missing.`,
               ingredientAnalysis: output.ingredientAnalysis || [],
               packagingAnalysis: output.packagingAnalysis || 'Not available.',
               preservativesAndAdditivesAnalysis: output.preservativesAndAdditivesAnalysis || 'Not available.',
               breakdown: output.breakdown || 'Partial data available. Critical analysis components might be missing.',
               regulatoryStatus: output.regulatoryStatus || 'Status not available.',
               confidenceScore: output.confidenceScore || 0, // Or a specific low score
               sources: output.sources?.length > 0 ? output.sources : [serviceName],
               detectedRegion: output.detectedRegion || input.userRegionHint || 'Unknown',
                // Ensure all other optional fields from HealthAnalysisOutputSchema are present or undefined
                regionalVariations: output.regionalVariations || [],
                overallWarning: output.overallWarning || undefined,
                overallRiskScore: output.overallRiskScore, // Will be undefined if not present
                overallRiskLevel: output.overallRiskLevel,
                healthierAlternatives: output.healthierAlternatives,
                corporatePracticesNote: output.corporatePracticesNote,
                consumerRightsTip: output.consumerRightsTip,
                estimatedNutriScore: output.estimatedNutriScore,
             };
           }
        }

        // Add default consumer tip if missing for India
        if (!output.consumerRightsTip && (output.detectedRegion?.toLowerCase() === 'india' || (!output.detectedRegion && input.userRegionHint?.toLowerCase() === 'india'))) {
          output.consumerRightsTip = "Did you know? As a consumer in India, you can file complaints with the Food Safety and Standards Authority of India (FSSAI) if you find product labeling to be misleading or incomplete. Visit their portal: https://foodlicensing.fssai.gov.in/cmsweb/Complaints.aspx";
        }
        if (!output.sources || output.sources.length === 0) {
            output.sources = [serviceName];
        }
        return output;
      }
    } catch (error: any) {
      console.error('Error in generateHealthAnalysisFlow:', error);
      const serviceDetail = input.aiServiceProvider === 'ollama' ? `Ollama (${input.ollamaModelName || 'default'})` : input.aiServiceProvider;
      // Return a valid HealthAnalysisOutput structure even on error
      return { // This structure must match HealthAnalysisOutputSchema
        summary: `AI service error (${serviceDetail}): ${error.message ? error.message : 'Unknown error during health analysis.'}`,
        ingredientAnalysis: [],
        packagingAnalysis: 'Not available due to error.',
        preservativesAndAdditivesAnalysis: 'Not available due to error.',
        breakdown: 'Analysis incomplete due to an error.',
        regulatoryStatus: 'Status not available.',
        confidenceScore: 0,
        sources: ['Error in processing'],
        detectedRegion: input.userRegionHint || 'Error', // Or a more suitable default
        regionalVariations: [],
        overallWarning: `Analysis could not be performed due to an internal error with ${serviceDetail}.`,
        overallRiskScore: undefined, // Optional fields can be undefined
        overallRiskLevel: 'Error',
        healthierAlternatives: [],
        corporatePracticesNote: 'Not available due to error.',
        consumerRightsTip: 'Not available due to error.',
        estimatedNutriScore: undefined,
      };
    }
  }
);

    

    