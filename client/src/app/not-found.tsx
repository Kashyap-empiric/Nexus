"use client";

import Link from "next/link";
import { Ghost, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse blur-xl" />
          <Ghost className="w-20 h-20 text-primary relative z-10 animate-bounce" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-6xl font-extrabold tracking-tighter text-foreground">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Page not found
          </h2>
          <p className="text-muted-foreground">
            We searched the entire network, but the page you are looking for has vanished into the void.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          
          <Link 
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium shadow transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
