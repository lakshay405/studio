"use client";

import { ChangeEvent, FormEvent, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, FileImage, Search, ScanBarcode, ListChecks, Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';

type InputType = "name" | "barcode" | "ingredients" | "image";

interface QueryFormProps {
  isLoading: boolean;
  onSearchOrAnalyze: (data: string | File, type: InputType) => void;
  currentError: string | null;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export function QueryForm({ isLoading, onSearchOrAnalyze, currentError }: QueryFormProps) {
  const [activeTab, setActiveTab] = useState<InputType>("name");
  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    setInternalError(currentError);
  }, [currentError]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setInternalError("Image size should not exceed 5MB.");
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setInternalError("Invalid image type. Please upload JPG, PNG, or WEBP.");
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setInternalError(null); // Clear previous errors
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInternalError(null); // Clear previous errors on new submission

    let data: string | File = "";
    switch (activeTab) {
      case "name":
        if (!productName.trim()) {
          setInternalError("Product name cannot be empty.");
          return;
        }
        data = productName;
        break;
      case "barcode":
        if (!barcode.trim()) {
          setInternalError("Barcode cannot be empty.");
          return;
        }
        data = barcode;
        break;
      case "ingredients":
        if (!ingredients.trim()) {
          setInternalError("Ingredient list cannot be empty.");
          return;
        }
        data = ingredients;
        break;
      case "image":
        if (!imageFile) {
          setInternalError("Please upload an image.");
          return;
        }
        data = imageFile; // Pass the File object directly
        break;
      default:
        return;
    }
    onSearchOrAnalyze(data, activeTab);
  };

  const getButtonText = () => {
    return activeTab === "name" ? "Search Products" : "Analyze Product";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InputType)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="name" className="flex items-center gap-2"><Search size={16}/> Product Name</TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center gap-2"><ScanBarcode size={16}/> Barcode</TabsTrigger>
          <TabsTrigger value="ingredients" className="flex items-center gap-2"><ListChecks size={16}/> Ingredients</TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2"><FileImage size={16}/> Image</TabsTrigger>
        </TabsList>

        <TabsContent value="name" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              type="text"
              placeholder="e.g., Organic Almond Milk"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              aria-label="Product Name"
            />
            <p className="text-sm text-muted-foreground">Enter the name of the product you want to search for.</p>
          </div>
        </TabsContent>
        <TabsContent value="barcode" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode Number</Label>
            <Input
              id="barcode"
              type="text"
              placeholder="Enter EAN/UPC code"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              aria-label="Barcode Number"
            />
            <p className="text-sm text-muted-foreground">Enter the product's barcode number.</p>
          </div>
        </TabsContent>
        <TabsContent value="ingredients" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredient List</Label>
            <Textarea
              id="ingredients"
              placeholder="Paste the list of ingredients here..."
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={5}
              aria-label="Ingredient List"
            />
            <p className="text-sm text-muted-foreground">Copy and paste the ingredient list from the product.</p>
          </div>
        </TabsContent>
        <TabsContent value="image" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="imageUpload">Upload Product Label/Barcode Image</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="imageUpload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 5MB)</p>
                    </div>
                    <Input id="imageUpload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} aria-label="Image Upload"/>
                </label>
            </div>
            {imagePreview && (
              <div className="mt-4 relative w-full max-w-xs mx-auto aspect-video rounded-md overflow-hidden border shadow-sm">
                <Image src={imagePreview} alt="Image preview" layout="fill" objectFit="contain" data-ai-hint="product label" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">Upload a clear photo of the product's label or barcode.</p>
          </div>
        </TabsContent>
      </Tabs>

      {internalError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{internalError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full text-lg py-6" disabled={isLoading} size="lg">
        {isLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          activeTab === "name" ? <Search className="mr-2 h-5 w-5" /> : null
        )}
        {isLoading ? 'Processing...' : getButtonText()}
      </Button>
    </form>
  );
}
