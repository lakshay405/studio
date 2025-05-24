"use client";

import { useState } from 'react';
import { Logo } from '@/components/logo';
import { QueryForm } from '@/components/query-form';
import { SearchResultsDisplay } from '@/components/search-results-display';
import { HealthReportDisplay } from '@/components/health-report-display';
import { semanticProductSearch, SemanticProductSearchOutput } from '@/ai/flows/semantic-product-search';
import { generateHealthAnalysis, HealthAnalysisOutput, HealthAnalysisInput } from '@/ai/flows/generate-health-analysis';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';

type InputType = "name" | "barcode" | "ingredients" | "image";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function NutriSleuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Specific for analysis after search
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [searchResults, setSearchResults] = useState<SemanticProductSearchOutput['searchResults'] | null>(null);
  const [selectedProductForAnalysis, setSelectedProductForAnalysis] = useState<string | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysisOutput | null>(null);

  const { toast } = useToast();

  const resetState = () => {
    setErrorMessage(null);
    setSearchResults(null);
    setHealthAnalysis(null);
    setSelectedProductForAnalysis(null);
  }

  const handleSearchOrAnalyze = async (data: string | File, type: InputType) => {
    resetState();
    
    if (type === "name") {
      setIsLoading(true);
      try {
        const result = await semanticProductSearch({ productName: data as string });
        setSearchResults(result.searchResults);
        if (!result.searchResults || result.searchResults.length === 0) {
          setErrorMessage("No products found for your search term. Please try a different name.");
        }
      } catch (error) {
        console.error("Semantic search error:", error);
        setErrorMessage("Failed to search for products. Please try again.");
        toast({ variant: "destructive", title: "Search Error", description: "Could not perform product search." });
      } finally {
        setIsLoading(false);
      }
    } else { // Barcode, Ingredients, Image
      setIsLoading(true);
      let productInfoValue: string;
      if (type === "image" && data instanceof File) {
        try {
          productInfoValue = await fileToBase64(data);
        } catch (error) {
          console.error("Image conversion error:", error);
          setErrorMessage("Failed to process image. Please try again.");
          setIsLoading(false);
          return;
        }
      } else {
        productInfoValue = data as string;
      }
      
      const analysisInput: HealthAnalysisInput = { productInfo: productInfoValue };
      try {
        const analysis = await generateHealthAnalysis(analysisInput);
        setHealthAnalysis(analysis);
        setSelectedProductForAnalysis(type === 'barcode' ? `Barcode: ${data}` : type === 'ingredients' ? 'Custom Ingredients' : 'Uploaded Image');
      } catch (error) {
        console.error("Health analysis error:", error);
        setErrorMessage("Failed to generate health analysis. The AI model might be unavailable or the input is invalid.");
        toast({ variant: "destructive", title: "Analysis Error", description: "Could not generate health report." });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleProductSelectForAnalysis = async (productName: string) => {
    resetState(); // Clear previous results, including search list
    setIsAnalyzing(true);
    setSelectedProductForAnalysis(productName);
    
    const analysisInput: HealthAnalysisInput = { productInfo: productName };
    try {
      const analysis = await generateHealthAnalysis(analysisInput);
      setHealthAnalysis(analysis);
    } catch (error) {
      console.error("Health analysis error (from selection):", error);
      setErrorMessage(`Failed to analyze "${productName}". Please try again or select another product.`);
      toast({ variant: "destructive", title: "Analysis Error", description: `Could not analyze ${productName}.` });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 md:p-8 bg-background font-sans">
      <header className="w-full max-w-3xl mb-8 text-center">
        <div className="inline-block">
         <Logo />
        </div>
        <p className="mt-2 text-lg text-muted-foreground">
          Uncover the truth behind food labels. Your AI-powered nutrition detective.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <QueryForm
              isLoading={isLoading || isAnalyzing}
              onSearchOrAnalyze={handleSearchOrAnalyze}
              currentError={errorMessage}
            />
          </CardContent>
        </Card>
        
        {errorMessage && !healthAnalysis && !searchResults && (
           <Alert variant="destructive" className="mt-6">
             <AlertTriangle className="h-4 w-4" />
             <AlertTitle>An Error Occurred</AlertTitle>
             <AlertDescription>{errorMessage}</AlertDescription>
           </Alert>
        )}

        {isLoading && !isAnalyzing && ( // General loading for initial search/analysis
          <div className="flex justify-center items-center mt-6 p-8 bg-card rounded-lg shadow">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Searching for products...</p>
          </div>
        )}
        
        {searchResults && !healthAnalysis && (
          <SearchResultsDisplay
            results={searchResults}
            onProductSelect={handleProductSelectForAnalysis}
            isAnalyzing={isAnalyzing}
            selectedProductForAnalysis={selectedProductForAnalysis}
          />
        )}

        {isAnalyzing && !healthAnalysis && ( // Loading for analysis after product selection
           <div className="flex justify-center items-center mt-6 p-8 bg-card rounded-lg shadow">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-3 text-lg text-muted-foreground">Analyzing {selectedProductForAnalysis || "product"}...</p>
           </div>
        )}

        {healthAnalysis && (
          <HealthReportDisplay report={healthAnalysis} productIdentifier={selectedProductForAnalysis || undefined} />
        )}
      </main>

      <footer className="w-full max-w-3xl mt-12 pt-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          NutriSleuth &copy; {new Date().getFullYear()}. For informational purposes only. Not medical advice.
        </p>
      </footer>
    </div>
  );
}
