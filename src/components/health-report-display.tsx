
import type { HealthAnalysisOutput, HealthAnalysisInput } from "@/ai/flows/generate-health-analysis"; // Added HealthAnalysisInput for type consistency if needed later
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ThumbsUp, Info, BookOpen, AlertCircle, CheckCircle, BarChart3, ClipboardList, 
  PackageSearch, FlaskConical, Microscope, MapPin, Globe, AlertTriangle, 
  ShieldCheck, Shuffle, AlertOctagon, PlusCircle, MinusCircle, ArrowRightCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthReportDisplayProps {
  report: HealthAnalysisOutput;
  productIdentifier?: string; // Optional: name of the product analyzed
}

const RegionalVariantIcon: React.FC<{ indicator?: HealthAnalysisOutput['regionalVariations'][0]['variantIndicator'] }> = ({ indicator }) => {
  switch (indicator) {
    case "CLEANER_VARIANT":
      return <ShieldCheck className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />;
    case "POTENTIALLY_RISKIER_VARIANT":
      return <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />;
    case "DIFFERENT_VARIANT":
      return <Shuffle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />;
  }
};

const IngredientRiskIcon: React.FC<{ flag?: HealthAnalysisOutput['ingredientAnalysis'][0]['ingredientRiskFlag'] }> = ({ flag }) => {
  if (flag === "REGIONAL_CONCERN") {
    return <AlertOctagon className="h-4 w-4 text-accent inline-block ml-1" />;
  }
  return null;
};

const KeyDifferenceIcon: React.FC<{item: string}> = ({ item }) => {
  if (item.startsWith('+')) return <PlusCircle className="h-4 w-4 text-green-500 mr-1 flex-shrink-0" />;
  if (item.startsWith('-')) return <MinusCircle className="h-4 w-4 text-red-500 mr-1 flex-shrink-0" />;
  return <ArrowRightCircle className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />;
};

export function HealthReportDisplay({ report, productIdentifier }: HealthReportDisplayProps) {
  const getConfidenceColorClasses = (score: number) => {
    if (score >= 70) return "bg-green-500 text-green-50";
    if (score >= 40) return "bg-yellow-500 text-yellow-900";
    return "bg-red-500 text-red-50";
  };

  return (
    <Card className="mt-8 shadow-xl w-full overflow-hidden">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
          <CheckCircle className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <CardTitle className="text-2xl md:text-3xl text-primary">Health Analysis Report</CardTitle>
            {productIdentifier && <CardDescription className="text-md text-muted-foreground mt-1">For: {productIdentifier}</CardDescription>}
            {report.detectedRegion && (
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <MapPin className="h-4 w-4 mr-1 text-primary" />
                <span>Product Region Analysis: <strong>{report.detectedRegion}</strong></span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        
        {report.overallWarning && (
          <>
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Important Regional Advisory</AlertTitle>
              <AlertDescription>{report.overallWarning}</AlertDescription>
            </Alert>
            <Separator />
          </>
        )}

        <section aria-labelledby="summary-section">
          <h2 id="summary-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <ThumbsUp className="h-5 w-5" />
            Summary ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.summary || "No summary provided."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="ingredient-analysis-section">
          <h2 id="ingredient-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
            <ClipboardList className="h-5 w-5" />
            Ingredient Analysis ({report.detectedRegion || "General"})
          </h2>
          {report.ingredientAnalysis && report.ingredientAnalysis.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {report.ingredientAnalysis.map((ingredient, index) => (
                <AccordionItem value={`item-${index}`} key={index} className="border-border">
                  <AccordionTrigger className="hover:no-underline text-left">
                    <span className="font-medium">{ingredient.name || "Unnamed Ingredient"}</span>
                    <IngredientRiskIcon flag={ingredient.ingredientRiskFlag} />
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2 text-sm">
                    <p><strong className="font-semibold text-primary/90">Purpose:</strong> <span className="text-foreground/80">{ingredient.description || "N/A"}</span></p>
                    <p><strong className="font-semibold text-primary/90">Health Effects:</strong> <span className="text-foreground/80">{ingredient.healthEffects || "N/A"}</span></p>
                    <p><strong className="font-semibold text-primary/90">Safety/Concern Level:</strong> <Badge variant={ingredient.safetyLevel?.toLowerCase().includes("safe") ? "default" : "secondary"} className="text-xs">{ingredient.safetyLevel || "N/A"}</Badge></p>
                    {ingredient.regionalNotes && (
                      <p className="italic text-accent"><strong className="font-semibold">Regional Note:</strong> {ingredient.regionalNotes}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground">No detailed ingredient analysis available for {report.detectedRegion || "this product"}.</p>
          )}
        </section>

        <Separator />

        {report.regionalVariations && report.regionalVariations.length > 0 && (
          <section aria-labelledby="regional-variations-section">
            <h2 id="regional-variations-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
              <Globe className="h-5 w-5" />
              Regional Product Variations
            </h2>
            <div className="space-y-4">
              {report.regionalVariations.map((variation, index) => (
                <Card key={index} className="bg-muted/20">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-lg flex items-center">
                      <RegionalVariantIcon indicator={variation.variantIndicator} />
                      Variation: {variation.region}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 text-sm">
                    <p className="text-foreground/80 mb-2">{variation.summary}</p>
                    {variation.keyDifferences && variation.keyDifferences.length > 0 && (
                      <>
                        <strong className="font-semibold text-primary/90">Key Differences:</strong>
                        <ul className="list-none space-y-1 mt-1">
                          {variation.keyDifferences.map((diff, i) => (
                            <li key={i} className="flex items-center text-foreground/80">
                              <KeyDifferenceIcon item={diff} /> 
                              {diff.substring(diff.startsWith('+') || diff.startsWith('-') ? 1 : 0).trim()}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
        
        <Separator />
        
        <section aria-labelledby="overall-breakdown-section">
          <h2 id="overall-breakdown-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <Microscope className="h-5 w-5" />
            Overall Product Breakdown ({report.detectedRegion || "General"})
          </h2>
          <ScrollArea className="h-40 md:h-48 p-4 border rounded-md bg-background shadow-inner">
            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.breakdown || "No overall breakdown available."}</p>
          </ScrollArea>
        </section>

        <Separator />

        <section aria-labelledby="packaging-analysis-section">
          <h2 id="packaging-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <PackageSearch className="h-5 w-5" />
            Packaging Analysis ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.packagingAnalysis || "No packaging analysis provided."}</p>
        </section>

        <Separator />

        <section aria-labelledby="preservatives-additives-section">
          <h2 id="preservatives-additives-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <FlaskConical className="h-5 w-5" />
            Preservatives & Additives ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.preservativesAndAdditivesAnalysis || "No specific analysis on preservatives and additives provided."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="regulatory-status-section">
          <h2 id="regulatory-status-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-accent">
            <AlertCircle className="h-5 w-5" />
            Regulatory Status ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.regulatoryStatus || "Regulatory status not specified."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="confidence-score-section">
            <h2 id="confidence-score-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
                <BarChart3 className="h-5 w-5"/>
                Confidence Score
            </h2>
            <div className="flex items-center gap-3">
              <Progress value={report.confidenceScore} aria-label={`Confidence score: ${report.confidenceScore}%`} className={cn("w-full h-3", getConfidenceColorClasses(report.confidenceScore).split(' ')[0])} />
              <span className={cn("font-semibold text-lg", getConfidenceColorClasses(report.confidenceScore).split(' ')[1] || 'text-primary')}>{report.confidenceScore}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Based on data quality, specificity, and recency. The model states the primary factors influencing this score in its detailed output.</p>
        </section>
        
      </CardContent>

      {report.sources && report.sources.length > 0 && (
        <>
          <Separator />
          <CardFooter className="p-6 bg-muted/30">
            <div className="w-full">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <BookOpen className="h-5 w-5" />
                Sources
              </h3>
              <ScrollArea className="h-24">
                <ul className="space-y-1 list-disc list-inside">
                  {report.sources.map((source, index) => (
                    <li key={index} className="text-sm">
                      <Badge variant="outline" className="text-xs font-normal bg-background">{source}</Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
