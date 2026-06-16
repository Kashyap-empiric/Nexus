import { cn } from "@/shared/lib/utils";
import type { StepConfig } from "../types/onboarding";

interface StepProgressProps {
  currentStep: number;
  steps: StepConfig[];
}

export function StepProgress({ currentStep, steps }: StepProgressProps) {
  return (
    <div className="w-full flex items-center justify-center space-x-2 sm:space-x-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isCurrent = currentStep === stepNumber;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors border-2",
                  isCompleted
                    ? "bg-brand border-brand text-brand-foreground"
                    : isCurrent
                    ? "border-brand text-brand shadow-sm bg-background"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? "✓" : stepNumber}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium hidden sm:block",
                  isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] w-8 sm:w-16 mx-2 sm:mx-4 -mt-6 sm:-mt-5 transition-colors",
                  isCompleted ? "bg-brand" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
