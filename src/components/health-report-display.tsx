
import type { HealthAnalysisOutput } from "@/ai/flows/generate-health-analysis";
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
  ShieldCheck, Shuffle, AlertOctagon, PlusCircle, MinusCircle, ArrowRightCircle,
  HeartPulse, Users, ShieldAlert, Lightbulb, Scale, ThumbsDown, FileText, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthReportDisplayProps {
  report: HealthAnalysisOutput;
  productIdentifier?: string; 
}

const RiskLevelBadge: React.FC<{ level?: string, score?: number }> = ({ level, score }) => {
  if (!level && !score) return null;
  if (!level && score) level = score <= 2 ? "Low Concern" : score <= 3.5 ? "Moderate Concern" : "High Concern";

  let variant: "default" | "secondary" | "destructive" = "secondary";
  let icon = <Info className="h-4 w-4 mr-1" />;
  let textColor = "text-yellow-700 dark:text-yellow-300"; 

  const normalizedLevel = level?.toLowerCase() || "";
  if (normalizedLevel.includes("low")) {
    variant = "default"; 
    icon = <ShieldCheck className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />;
    textColor = "text-green-700 dark:text-green-300";
  } else if (normalizedLevel.includes("moderate") || normalizedLevel.includes("medium")) {
    variant = "secondary"; 
    icon = <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500 dark:text-yellow-400" />;
    textColor = "text-yellow-700 dark:text-yellow-300";
  } else if (normalizedLevel.includes("high")) {
    variant = "destructive";
    icon = <ShieldAlert className="h-4 w-4 mr-1" />; // Destructive variant handles color
    textColor = "text-red-700 dark:text-red-300";
  }
  
  return (
    <Badge variant={variant} className={cn("text-sm py-1 px-3", textColor, 
      variant === 'default' && 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
      variant === 'secondary' && 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
      variant === 'destructive' && 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700' // Destructive badge itself has red bg/text
    )}>
      {icon}
      {level} {score && `(${score.toFixed(1)}/5)`}
    </Badge>
  );
};

const NUTRIGRADE_DESCRIPTIONS: Record<string, string> = {
  A: "Excellent nutritional quality",
  B: "Good nutritional quality",
  C: "Average nutritional quality",
  D: "Poor nutritional quality",
  E: "Very poor nutritional quality",
};

const NUTRIGRADE_TEXT_COLORS: Record<string, string> = {
  A: "text-green-700 dark:text-green-400",
  B: "text-lime-600 dark:text-lime-400", 
  C: "text-yellow-600 dark:text-yellow-400",
  D: "text-orange-600 dark:text-orange-400",
  E: "text-red-700 dark:text-red-400",
};

const EstimatedNutriScoreDisplay: React.FC<{ score: "A" | "B" | "C" | "D" | "E" }> = ({ score }) => {
  const allGrades = ["A", "B", "C", "D", "E"];
  const description = NUTRIGRADE_DESCRIPTIONS[score];
  const activeColorClass = NUTRIGRADE_TEXT_COLORS[score];

  return (
    <p className="text-lg font-medium">
      {allGrades.map((gradeLetter) => (
        <span
          key={gradeLetter}
          className={cn(
            "font-mono font-semibold px-0.5",
            gradeLetter === score
              ? `${activeColorClass} text-xl sm:text-2xl`
              : "text-muted-foreground/60 dark:text-muted-foreground/50 text-lg sm:text-xl"
          )}
        >
          {gradeLetter === score ? gradeLetter.toUpperCase() : gradeLetter.toLowerCase()}
        </span>
      ))}
      {description && (
         <span className={cn("ml-2 text-sm sm:text-base italic", activeColorClass)}>- {description}</span>
      )}
    </p>
  );
};


const SpecificConcernIcon: React.FC<{ concern: string }> = ({ concern }) => {
  const lcConcern = concern.toLowerCase();
  if (lcConcern.includes("high sugar")) return <ThumbsDown className="h-4 w-4 text-red-500 dark:text-red-400 inline-block mr-1" title="High Sugar" />;
  if (lcConcern.includes("carcinogen") || lcConcern.includes("4-mei")) return <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-500 inline-block mr-1" title="Potential Carcinogen" />;
  if (lcConcern.includes("artificial sweetener")) return <FlaskConical className="h-4 w-4 text-yellow-500 dark:text-yellow-400 inline-block mr-1" title="Artificial Sweetener"/>;
  return <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 inline-block mr-1" title={concern} />;
};


const RegionalVariantIcon: React.FC<{ indicator?: HealthAnalysisOutput['regionalVariations'][0]['variantIndicator'] }> = ({ indicator }) => {
  switch (indicator) {
    case "CLEANER_VARIANT":
      return <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />;
    case "POTENTIALLY_RISKIER_VARIANT":
      return <AlertTriangle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0" />;
    case "DIFFERENT_VARIANT":
      return <Shuffle className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0" />;
  }
};

const IngredientRiskIcon: React.FC<{ flag?: HealthAnalysisOutput['ingredientAnalysis'][0]['ingredientRiskFlag'] }> = ({ flag }) => {
  if (flag === "REGIONAL_CONCERN") {
    return <AlertOctagon className="h-4 w-4 text-accent inline-block ml-1" title="Regional Concern" />;
  }
  return null;
};

const IndiaBannedInEUText: React.FC<{ notes?: string }> = ({ notes }) => {
  if (notes?.toLowerCase().includes("allowed in india") && (notes?.toLowerCase().includes("banned in eu") || notes?.toLowerCase().includes("restricted in eu"))) {
    return <span className="text-xs font-semibold text-destructive ml-1">(🇮🇳 India-Allowed / EU-Restricted/Banned)</span>;
  }
  return null;
};

const KeyDifferenceIcon: React.FC<{item: string}> = ({ item }) => {
  if (item.startsWith('+')) return <PlusCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-1 flex-shrink-0" />;
  if (item.startsWith('-')) return <MinusCircle className="h-4 w-4 text-red-500 dark:text-red-400 mr-1 flex-shrink-0" />;
  return <ArrowRightCircle className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />;
};

export function HealthReportDisplay({ report, productIdentifier }: HealthReportDisplayProps) {
  const getConfidenceColorClasses = (score: number) => {
    if (score >= 70) return "bg-green-500 text-green-50 dark:bg-green-700 dark:text-green-100";
    if (score >= 40) return "bg-yellow-500 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100";
    return "bg-red-500 text-red-50 dark:bg-red-700 dark:text-red-100";
  };

  return (
    <Card className="mt-8 shadow-xl w-full overflow-hidden">
      <CardHeader className="bg-muted/30 dark:bg-muted/10 p-6">
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <CardTitle className="text-2xl md:text-3xl text-primary">Health & Nutrition Analysis</CardTitle>
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
            Plain-Talk Summary ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 dark:text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.summary || "No summary provided."}</p>
        </section>
        
        <Separator />
        
        <section aria-labelledby="overall-risk-section">
            <h2 id="overall-risk-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
              <Scale className="h-5 w-5" />
              Overall Health Risk
            </h2>
            <RiskLevelBadge level={report.overallRiskLevel} score={report.overallRiskScore} />
            <p className="text-sm text-muted-foreground mt-1">Based on ingredients, additives, and regional considerations for {report.detectedRegion || "this product"}.</p>
        </section>
        
        {report.estimatedNutriScore && (
          <>
            <Separator />
            <section aria-labelledby="nutri-score-section">
              <h2 id="nutri-score-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
                <Star className="h-5 w-5 text-yellow-400" />
                Estimated Nutri-Score
              </h2>
              <EstimatedNutriScoreDisplay score={report.estimatedNutriScore} />
              <p className="text-xs text-muted-foreground mt-1 w-full">
                Note: This is an AI-generated estimate based on ingredients, not a precise calculation.
              </p>
            </section>
          </>
        )}
        
        <Separator />

        <section aria-labelledby="ingredient-analysis-section">
          <h2 id="ingredient-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
            <ClipboardList className="h-5 w-5" />
            Ingredient Deep-Dive ({report.detectedRegion || "General"})
          </h2>
          {report.ingredientAnalysis && report.ingredientAnalysis.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {report.ingredientAnalysis.map((ingredient, index) => (
                <AccordionItem value={`item-${index}`} key={index} className="border-border">
                  <AccordionTrigger className="hover:no-underline text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                       {ingredient.specificConcerns && ingredient.specificConcerns.length > 0 && ingredient.specificConcerns.map(concern => <SpecificConcernIcon key={concern} concern={concern} />)}
                      <span className="font-medium">{ingredient.name || "Unnamed Ingredient"}</span>
                      <IngredientRiskIcon flag={ingredient.ingredientRiskFlag} />
                      <IndiaBannedInEUText notes={ingredient.regionalNotes} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2 text-sm">
                    <p><strong className="font-semibold text-primary/90 dark:text-primary/80">Purpose:</strong> <span className="text-foreground/80 dark:text-foreground/70">{ingredient.description || "N/A"}</span></p>
                    <p><strong className="font-semibold text-primary/90 dark:text-primary/80">Health Effects ({report.detectedRegion || "Local"} Context):</strong> <span className="text-foreground/80 dark:text-foreground/70">{ingredient.healthEffects || "N/A"}</span></p>
                    <p><strong className="font-semibold text-primary/90 dark:text-primary/80">Safety/Concern Level:</strong> <Badge variant={ingredient.safetyLevel?.toLowerCase().includes("safe") ? "default" : ingredient.safetyLevel?.toLowerCase().includes("limit") || ingredient.safetyLevel?.toLowerCase().includes(" debated") ? "secondary" : "destructive"} className="text-xs">{ingredient.safetyLevel || "N/A"}</Badge></p>
                    {ingredient.regionalNotes && (
                      <p className="italic"><strong className="font-semibold text-accent dark:text-accent/90">Regional Note:</strong> {ingredient.regionalNotes}</p>
                    )}
                    {ingredient.specificConcerns && ingredient.specificConcerns.length > 0 && (
                       <p><strong className="font-semibold text-destructive">Specific Flags:</strong> {ingredient.specificConcerns.join(", ")}</p>
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
          <>
            <section aria-labelledby="regional-variations-section">
              <h2 id="regional-variations-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
                <Globe className="h-5 w-5" />
                Regional Product Variations
              </h2>
              <div className="space-y-4">
                {report.regionalVariations.map((variation, index) => (
                  <Card key={index} className="bg-muted/20 dark:bg-muted/10">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-lg flex items-center">
                        <RegionalVariantIcon indicator={variation.variantIndicator} />
                        Variation: {variation.region}
                         {variation.variantIndicator === "CLEANER_VARIANT" && <Badge variant="default" className="ml-2 bg-green-500 text-white dark:bg-green-600 dark:text-green-50">Regulated Safer</Badge>}
                         {variation.variantIndicator === "POTENTIALLY_RISKIER_VARIANT" && <Badge variant="destructive" className="ml-2">Potentially Riskier</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 text-sm">
                      <p className="text-foreground/80 dark:text-foreground/70 mb-2">{variation.summary}</p>
                      {variation.keyDifferences && variation.keyDifferences.length > 0 && (
                        <>
                          <strong className="font-semibold text-primary/90 dark:text-primary/80">Key Differences:</strong>
                          <ul className="list-none space-y-1 mt-1">
                            {variation.keyDifferences.map((diff, i) => (
                              <li key={i} className="flex items-center text-foreground/80 dark:text-foreground/70">
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
            <Separator />
          </>
        )}
        
        {report.healthierAlternatives && report.healthierAlternatives.length > 0 && (
          <>
            <section aria-labelledby="healthier-alternatives-section">
              <h2 id="healthier-alternatives-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
                <Lightbulb className="h-5 w-5" />
                Healthier Alternatives
              </h2>
              <ul className="list-disc list-inside space-y-1 pl-2 text-foreground/90 dark:text-foreground/80">
                {report.healthierAlternatives.map((alt, index) => (
                  <li key={index}>{alt}</li>
                ))}
              </ul>
            </section>
            <Separator />
          </>
        )}

        <section aria-labelledby="overall-breakdown-section">
          <h2 id="overall-breakdown-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <Microscope className="h-5 w-5" />
            Overall Product Profile ({report.detectedRegion || "General"})
          </h2>
          <ScrollArea className="h-40 md:h-48 p-4 border rounded-md bg-background dark:bg-muted/5 shadow-inner">
            <p className="text-foreground/80 dark:text-foreground/70 leading-relaxed whitespace-pre-wrap">{report.breakdown || "No overall breakdown available."}</p>
          </ScrollArea>
        </section>

        <Separator />

        <section aria-labelledby="packaging-analysis-section">
          <h2 id="packaging-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <PackageSearch className="h-5 w-5" />
            Packaging Insights ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 dark:text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.packagingAnalysis || "No packaging analysis provided."}</p>
        </section>

        <Separator />

        <section aria-labelledby="preservatives-additives-section">
          <h2 id="preservatives-additives-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <FlaskConical className="h-5 w-5" />
            Preservatives & Additives ({report.detectedRegion || "General"})
          </h2>
           <ScrollArea className="h-40 md:h-48 p-4 border rounded-md bg-background dark:bg-muted/5 shadow-inner">
            <p className="text-foreground/80 dark:text-foreground/70 leading-relaxed whitespace-pre-wrap">{report.preservativesAndAdditivesAnalysis || "No specific analysis on preservatives and additives provided."}</p>
          </ScrollArea>
        </section>
        
        <Separator />

        <section aria-labelledby="regulatory-status-section">
          <h2 id="regulatory-status-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-accent dark:text-accent/90">
            <AlertCircle className="h-5 w-5" />
            Regulatory Status ({report.detectedRegion || "General"})
          </h2>
          <p className="text-foreground/90 dark:text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.regulatoryStatus || "Regulatory status not specified."}</p>
        </section>
        
        <Separator />
        
        {report.corporatePracticesNote && (
          <>
            <section aria-labelledby="corporate-practices-section">
              <h2 id="corporate-practices-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
                <Users className="h-5 w-5" />
                A Note on Global Brands
              </h2>
              <Alert variant="default" className="border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-700 dark:text-amber-300">Regional Practices</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  {report.corporatePracticesNote}
                </AlertDescription>
              </Alert>
            </section>
            <Separator />
          </>
        )}

        {report.consumerRightsTip && (
          <>
            <section aria-labelledby="consumer-rights-section">
              <h2 id="consumer-rights-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-5 w-5" />
                Consumer Corner
              </h2>
               <Alert variant="default" className="border-blue-500 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Know Your Rights!</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  {report.consumerRightsTip}
                </AlertDescription>
              </Alert>
            </section>
            <Separator />
          </>
        )}

        <section aria-labelledby="confidence-score-section">
            <h2 id="confidence-score-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
                <BarChart3 className="h-5 w-5"/>
                Analysis Confidence
            </h2>
            <div className="flex items-center gap-3">
              <Progress value={report.confidenceScore} aria-label={`Confidence score: ${report.confidenceScore}%`} className={cn("w-full h-3", getConfidenceColorClasses(report.confidenceScore).split(' ')[0])} />
              <span className={cn("font-semibold text-lg", getConfidenceColorClasses(report.confidenceScore).split(' ')[1] || 'text-primary')}>{report.confidenceScore}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Based on data quality and specificity. An analysis from just a product name is for a typical regional variant.</p>
        </section>
        
      </CardContent>

      {report.sources && report.sources.length > 0 && (
        <>
          <Separator />
          <CardFooter className="p-6 bg-muted/30 dark:bg-muted/10">
            <div className="w-full">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-primary">
                <BookOpen className="h-5 w-5" />
                Key Information Sources
              </h3>
              <ScrollArea className="h-24">
                <ul className="space-y-1 list-disc list-inside">
                  {report.sources.map((source, index) => (
                    <li key={index} className="text-sm">
                      <Badge variant="outline" className="text-xs font-normal bg-background dark:bg-muted/20">{source}</Badge>
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

    