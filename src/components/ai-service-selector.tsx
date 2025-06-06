
"use client";

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
import { Cpu, Server } from "lucide-react"; // Using Server for Gemini/Cloud
import type { Dispatch, SetStateAction } from "react";

export type AIService = "gemini" | "ollama";

interface AIServiceSelectorProps {
  selectedService: AIService;
  setSelectedService: Dispatch<SetStateAction<AIService>>;
  ollamaModelName?: string;
  geminiModelName?: string;
}

export function AIServiceSelector({
  selectedService,
  setSelectedService,
  ollamaModelName = "qwen3:8b",
  geminiModelName = "gemini-2.0-flash",
}: AIServiceSelectorProps) {
  const displayProps = {
    gemini: {
      label: "Google AI",
      model: geminiModelName,
      icon: <Server className="h-4 w-4 mr-2" />,
    },
    ollama: {
      label: "Local LLM (Ollama)",
      model: ollamaModelName,
      icon: <Cpu className="h-4 w-4 mr-2" />,
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center text-xs">
          {selectedService === "ollama" ? displayProps.ollama.icon : displayProps.gemini.icon}
          <span className="mr-1">{selectedService === "ollama" ? displayProps.ollama.label : displayProps.gemini.label}:</span>
          <span className="font-semibold truncate">{selectedService === "ollama" ? displayProps.ollama.model : displayProps.gemini.model}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Choose AI Service</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedService}
          onValueChange={(value) => setSelectedService(value as AIService)}
        >
          <DropdownMenuRadioItem value="gemini" className="flex items-center cursor-pointer">
            {displayProps.gemini.icon}
            <div>
              <div>{displayProps.gemini.label}</div>
              <div className="text-xs text-muted-foreground">{displayProps.gemini.model}</div>
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ollama" className="flex items-center cursor-pointer">
           {displayProps.ollama.icon}
            <div>
              <div>{displayProps.ollama.label}</div>
              <div className="text-xs text-muted-foreground">{displayProps.ollama.model}</div>
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
