
"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Cpu, Server, Bot, Brain, Info } from "lucide-react"; 

export type AIServiceProvider = "ollama" | "gemini" | "openai" | "anthropic";

interface AIServiceSelectorProps {
  selectedProvider: AIServiceProvider;
  setSelectedProvider: Dispatch<SetStateAction<AIServiceProvider>>;
  ollamaModelName: string;
  setOllamaModelName: Dispatch<SetStateAction<string>>;
}

const providerDetails: Record<AIServiceProvider, { label: string; defaultModel: string; icon: JSX.Element, apiKeyEnvVar: string | null }> = {
  ollama: { label: "Ollama (Local)", defaultModel: "qwen3:8b", icon: <Cpu className="h-4 w-4 mr-2" />, apiKeyEnvVar: null },
  gemini: { label: "Google AI", defaultModel: "gemini-2.0-flash", icon: <Server className="h-4 w-4 mr-2" />, apiKeyEnvVar: "GOOGLE_API_KEY (or ADC)" },
  openai: { label: "OpenAI", defaultModel: "gpt-3.5-turbo", icon: <Brain className="h-4 w-4 mr-2" />, apiKeyEnvVar: "OPENAI_API_KEY" },
  anthropic: { label: "Anthropic", defaultModel: "claude-3-haiku-20240307", icon: <Bot className="h-4 w-4 mr-2" />, apiKeyEnvVar: "ANTHROPIC_API_KEY" },
};

export function AIServiceSelector({
  selectedProvider,
  setSelectedProvider,
  ollamaModelName,
  setOllamaModelName,
}: AIServiceSelectorProps) {
  const [tempOllamaModel, setTempOllamaModel] = useState(ollamaModelName);

  const currentServiceDisplay = providerDetails[selectedProvider];
  const displayModel = selectedProvider === "ollama" ? ollamaModelName : currentServiceDisplay.defaultModel;

  const handleOllamaModelChange = () => {
    setOllamaModelName(tempOllamaModel);
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center text-xs min-w-[200px] justify-between">
            <div className="flex items-center">
              {currentServiceDisplay.icon}
              <span className="mr-1">{currentServiceDisplay.label}:</span>
            </div>
            <span className="font-semibold truncate max-w-[100px] sm:max-w-[150px]">{displayModel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuLabel>Choose AI Service Provider</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={selectedProvider}
            onValueChange={(value) => setSelectedProvider(value as AIServiceProvider)}
          >
            {(Object.keys(providerDetails) as AIServiceProvider[]).map((providerKey) => {
              const details = providerDetails[providerKey];
              return (
                <DropdownMenuRadioItem key={providerKey} value={providerKey} className="flex items-center cursor-pointer justify-between">
                  <div className="flex items-center">
                    {details.icon}
                    <div>
                      <div>{details.label}</div>
                      <div className="text-xs text-muted-foreground">{details.defaultModel}</div>
                    </div>
                  </div>
                  {details.apiKeyEnvVar && (
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help ml-2"/>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs p-2 max-w-xs">
                            Requires {details.apiKeyEnvVar} to be set in server environment variables (.env file for local).
                        </TooltipContent>
                    </Tooltip>
                  )}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>

          {selectedProvider === "ollama" && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2">
                <Label htmlFor="ollamaModelName" className="text-sm font-medium">
                  Ollama Model Name
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="ollamaModelName"
                    type="text"
                    value={tempOllamaModel}
                    onChange={(e) => setTempOllamaModel(e.target.value)}
                    placeholder="e.g., qwen3:8b"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={handleOllamaModelChange} className="text-xs h-8" variant="outline">Set</Button>
                </div>
                 <p className="text-xs text-muted-foreground">Enter the exact Ollama model name (e.g., llama3:latest).</p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
