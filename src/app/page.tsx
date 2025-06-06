
"use client";

import { useState, useEffect } from 'react';
import { Logo } from '@/components/logo';
import { QueryForm } from '@/components/query-form';
import { SearchResultsDisplay } from '@/components/search-results-display';
import { HealthReportDisplay } from '@/components/health-report-display';
import { semanticProductSearch, SemanticProductSearchOutput, SemanticProductSearchInput } from '@/ai/flows/semantic-product-search';
import { generateHealthAnalysis, HealthAnalysisOutput, HealthAnalysisInput } from '@/ai/flows/generate-health-analysis';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { AIServiceSelector, type AIServiceProvider } from '@/components/ai-service-selector';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [searchResults, setSearchResults] = useState<SemanticProductSearchOutput['searchResults'] | null>(null);
  const [selectedProductForAnalysis, setSelectedProductForAnalysis] = useState<string | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysisOutput | null>(null);
  const [userRegionHint, setUserRegionHint] = useState<string>("India"); 
  
  const [selectedProvider, setSelectedProvider] = useState<AIServiceProvider>(
    process.env.NEXT_PUBLIC_USE_OLLAMA_LOCALLY === 'true' ? 'ollama' : 'gemini'
  );
  const [ollamaModelName, setOllamaModelName] = useState<string>("qwen3:8b");


  const { toast } = useToast();

  useEffect(() => {
    try {
      // Basic region detection, could be improved with a library or more robust logic
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone?.toLowerCase().includes("kolkata") || timezone?.toLowerCase().includes("calcutta") || timezone?.toLowerCase().includes("india")) {
        setUserRegionHint("India");
      } else if (timezone?.toLowerCase().includes("america")) {
        setUserRegionHint("US");
      } else if (timezone?.toLowerCase().includes("europe")) {
        setUserRegionHint("EU");
      }
    } catch (e) {
      // console.warn("Could not determine user region hint from timezone.");
    }
  }, []);


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
      const searchInput: SemanticProductSearchInput = {
        productName: data as string,
        aiServiceProvider: selectedProvider,
        ollamaModelName: selectedProvider === "ollama" ? ollamaModelName : undefined,
      };
      try {
        const result = await semanticProductSearch(searchInput);
        setSearchResults(result.searchResults);
        if (!result.searchResults || result.searchResults.length === 0) {
          setErrorMessage("No products found for your search term. Please try a different name.");
        } else if (result.searchResults.some(sr => sr.startsWith("Search failed:") || sr.startsWith("AI service error:"))) {
          setErrorMessage(result.searchResults.find(sr => sr.startsWith("Search failed:") || sr.startsWith("AI service error:")) || "Product search failed.");
          setSearchResults(null);
        }
      } catch (error: any) {
        console.error("Semantic search error:", error);
        const displayError = error.message || "Failed to search for products. Please try again.";
        setErrorMessage(displayError);
        toast({ variant: "destructive", title: "Search Error", description: displayError });
      } finally {
        setIsLoading(false);
      }
    } else { 
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
      
      setSelectedProductForAnalysis(type === 'barcode' ? `Barcode: ${data}` : type === 'ingredients' ? 'Custom Ingredients' : 'Uploaded Image');
      const analysisInput: HealthAnalysisInput = { 
        productInfo: productInfoValue,
        userRegionHint: userRegionHint,
        aiServiceProvider: selectedProvider,
        ollamaModelName: selectedProvider === "ollama" ? ollamaModelName : undefined,
      };
      try {
        const analysis = await generateHealthAnalysis(analysisInput);
        if (analysis.summary?.startsWith("Health analysis encountered an error:") || analysis.summary?.startsWith("AI service error:")) {
            setErrorMessage(analysis.summary);
            setHealthAnalysis(null);
        } else {
            setHealthAnalysis(analysis);
        }
      } catch (error: any) {
        console.error("Health analysis error:", error);
        const displayError = error.message || "Failed to generate health analysis. The AI model might be unavailable or the input is invalid.";
        setErrorMessage(displayError);
        toast({ variant: "destructive", title: "Analysis Error", description: displayError });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleProductSelectForAnalysis = async (productName: string) => {
    resetState(); 
    setIsAnalyzing(true);
    setSelectedProductForAnalysis(productName);
    
    const analysisInput: HealthAnalysisInput = { 
      productInfo: productName,
      userRegionHint: userRegionHint,
      aiServiceProvider: selectedProvider,
      ollamaModelName: selectedProvider === "ollama" ? ollamaModelName : undefined,
    };
    try {
      const analysis = await generateHealthAnalysis(analysisInput);
      if (analysis.summary?.startsWith("Health analysis encountered an error:") || analysis.summary?.startsWith("AI service error:")) {
        setErrorMessage(analysis.summary);
        setHealthAnalysis(null);
      } else {
        setHealthAnalysis(analysis);
      }
    } catch (error: any) {
      console.error("Health analysis error (from selection):", error);
      const displayError = error.message || `Failed to analyze "${productName}". Please try again or select another product.`;
      setErrorMessage(displayError);
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

        {(isLoading && !isAnalyzing) && ( 
          <div className="flex justify-center items-center mt-6 p-8 bg-card rounded-lg shadow">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Searching or Analyzing...</p>
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

        {isAnalyzing && !healthAnalysis && ( 
           <div className="flex justify-center items-center mt-6 p-8 bg-card rounded-lg shadow">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="ml-3 text-lg text-muted-foreground">Analyzing {selectedProductForAnalysis || "product"}...</p>
           </div>
        )}

        {healthAnalysis && (
          <HealthReportDisplay report={healthAnalysis} productIdentifier={selectedProductForAnalysis || healthAnalysis.detectedRegion || undefined} />
        )}
      </main>

      <footer className="w-full max-w-3xl mt-12 pt-8 border-t border-border text-center">
        <div className="mb-4 flex justify-center">
          <AIServiceSelector 
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            ollamaModelName={ollamaModelName}
            setOllamaModelName={setOllamaModelName}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          NutriSleuth &copy; {new Date().getFullYear()}. For informational purposes only. Not medical advice.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          User region hint: {userRegionHint || "Not set (defaulting to India focus)"}.
        </p>
         <p className="text-xs text-muted-foreground/70 mt-1">
          Product analyses are AI-generated and may require verification.
        </p>
      </footer>
    </div>
  );
}
