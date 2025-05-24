
import type { HealthAnalysisOutput } from "@/ai/flows/generate-health-analysis";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, Info, BookOpen, AlertCircle, CheckCircle, BarChart3, ClipboardList, PackageSearch, FlaskConical, Microscope } from "lucide-react";

interface HealthReportDisplayProps {
  report: HealthAnalysisOutput;
  productIdentifier?: string; // Optional: name of the product analyzed
}

export function HealthReportDisplay({ report, productIdentifier }: HealthReportDisplayProps) {
  const getConfidenceColorClasses = (score: number) => {
    if (score > 70) return "bg-green-500 text-green-50"; // High confidence, ensure foreground is light
    if (score > 40) return "bg-yellow-500 text-yellow-900"; // Medium confidence
    return "bg-red-500 text-red-50"; // Low confidence, ensure foreground is light
  };

  return (
    <Card className="mt-8 shadow-xl w-full overflow-hidden">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
          <CheckCircle className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <CardTitle className="text-2xl md:text-3xl text-primary">Health Analysis Report</CardTitle>
            {productIdentifier && <CardDescription className="text-md text-muted-foreground mt-1">For: {productIdentifier}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        
        <section aria-labelledby="summary-section">
          <h2 id="summary-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <ThumbsUp className="h-5 w-5" />
            Summary
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.summary || "No summary provided."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="ingredient-analysis-section">
          <h2 id="ingredient-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-3 text-primary">
            <ClipboardList className="h-5 w-5" />
            Ingredient Analysis
          </h2>
          {report.ingredientAnalysis && report.ingredientAnalysis.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {report.ingredientAnalysis.map((ingredient, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-medium text-left">{ingredient.name || "Unnamed Ingredient"}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2">
                    <p><strong className="font-semibold">Purpose:</strong> <span className="text-foreground/80">{ingredient.description || "N/A"}</span></p>
                    <p><strong className="font-semibold">Health Effects:</strong> <span className="text-foreground/80">{ingredient.healthEffects || "N/A"}</span></p>
                    <p><strong className="font-semibold">Safety/Concern Level:</strong> <Badge variant="secondary" className="text-xs">{ingredient.safetyLevel || "N/A"}</Badge></p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground">No detailed ingredient analysis available.</p>
          )}
        </section>

        <Separator />
        
        <section aria-labelledby="overall-breakdown-section">
          <h2 id="overall-breakdown-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <Microscope className="h-5 w-5" />
            Overall Product Breakdown
          </h2>
          <ScrollArea className="h-40 md:h-48 p-4 border rounded-md bg-background shadow-inner">
            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.breakdown || "No overall breakdown available."}</p>
          </ScrollArea>
        </section>

        <Separator />

        <section aria-labelledby="packaging-analysis-section">
          <h2 id="packaging-analysis-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <PackageSearch className="h-5 w-5" />
            Packaging Analysis
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.packagingAnalysis || "No packaging analysis provided."}</p>
        </section>

        <Separator />

        <section aria-labelledby="preservatives-additives-section">
          <h2 id="preservatives-additives-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-primary">
            <FlaskConical className="h-5 w-5" />
            Preservatives & Additives
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.preservativesAndAdditivesAnalysis || "No specific analysis on preservatives and additives provided."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="regulatory-status-section">
          <h2 id="regulatory-status-section" className="text-xl font-semibold flex items-center gap-2 mb-2 text-accent">
            <AlertCircle className="h-5 w-5" />
            Regulatory Status
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

