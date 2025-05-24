"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";

interface SearchResultsDisplayProps {
  results: string[];
  onProductSelect: (productName: string) => void;
  isAnalyzing: boolean; // To show loading state on the selected button
  selectedProductForAnalysis: string | null;
}

export function SearchResultsDisplay({ results, onProductSelect, isAnalyzing, selectedProductForAnalysis }: SearchResultsDisplayProps) {
  if (!results || results.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>No Products Found</CardTitle>
          <CardDescription>Your search did not match any products. Try a different name.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>Select a product to get a detailed health analysis.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {results.map((productName, index) => (
            <li key={index}>
              <Button
                variant="outline"
                className="w-full justify-between items-center text-left h-auto py-3 px-4 group"
                onClick={() => onProductSelect(productName)}
                disabled={isAnalyzing}
                aria-label={`Analyze ${productName}`}
              >
                <span className="truncate">{productName}</span>
                {isAnalyzing && selectedProductForAnalysis === productName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
