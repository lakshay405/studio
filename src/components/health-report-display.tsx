import type { HealthAnalysisOutput } from "@/ai/flows/generate-health-analysis";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, Info, BookOpen, AlertCircle, CheckCircle, BarChart3 } from "lucide-react";

interface HealthReportDisplayProps {
  report: HealthAnalysisOutput;
  productIdentifier?: string; // Optional: name of the product analyzed
}

export function HealthReportDisplay({ report, productIdentifier }: HealthReportDisplayProps) {
  const confidenceColor = report.confidenceScore > 70 ? "bg-green-500" : report.confidenceScore > 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card className="mt-8 shadow-xl w-full overflow-hidden">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl md:text-3xl text-primary">Health Analysis Report</CardTitle>
            {productIdentifier && <CardDescription className="text-md text-muted-foreground">For: {productIdentifier}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        
        <section aria-labelledby="summary-section">
          <h2 id="summary-section" className="text-xl font-semibold flex items-center gap-2 mb-2">
            <ThumbsUp className="h-5 w-5 text-primary" />
            Summary
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.summary || "No summary provided."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="breakdown-section">
          <h2 id="breakdown-section" className="text-xl font-semibold flex items-center gap-2 mb-2">
            <Info className="h-5 w-5 text-primary" />
            Detailed Breakdown
          </h2>
          <ScrollArea className="h-48 md:h-64 p-4 border rounded-md bg-background shadow-inner">
            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.breakdown || "No detailed breakdown available."}</p>
          </ScrollArea>
        </section>

        <Separator />

        <section aria-labelledby="regulatory-status-section">
          <h2 id="regulatory-status-section" className="text-xl font-semibold flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            Regulatory Status
          </h2>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.regulatoryStatus || "Regulatory status not specified."}</p>
        </section>
        
        <Separator />

        <section aria-labelledby="confidence-score-section">
            <h2 id="confidence-score-section" className="text-xl font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-primary"/>
                Confidence Score
            </h2>
            <div className="flex items-center gap-3">
              <Progress value={report.confidenceScore} aria-label={`Confidence score: ${report.confidenceScore}%`} className="w-full h-3 [&>div]:bg-primary" />
              <span className="font-semibold text-primary text-lg">{report.confidenceScore}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Based on data quality and recency.</p>
        </section>
        
      </CardContent>

      {report.sources && report.sources.length > 0 && (
        <>
          <Separator />
          <CardFooter className="p-6 bg-muted/30">
            <div className="w-full">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Sources
              </h3>
              <ScrollArea className="h-24">
                <ul className="space-y-1">
                  {report.sources.map((source, index) => (
                    <li key={index}>
                      <Badge variant="secondary" className="text-xs font-normal">{source}</Badge>
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
