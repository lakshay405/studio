"use client";

import { Leaf } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity duration-200">
      <Leaf className="h-8 w-8 sm:h-10 sm:w-10" />
      <span className="text-2xl sm:text-3xl font-bold tracking-tight">NutriSleuth</span>
    </div>
  );
}
