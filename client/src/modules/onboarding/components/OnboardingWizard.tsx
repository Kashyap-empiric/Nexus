"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser } from "@/modules/auth/store/useAuthStore";
import { completeOnboarding } from "../api/onboarding.api";
import { STEPS, type OnboardingCompleteResponse } from "../types/onboarding";
import { StepProgress } from "./StepProgress";
import { SetupProfileStep } from "./SetupProfileStep";
import { CreateWorkspaceStep } from "./CreateWorkspaceStep";
import { OnboardingCompleteStep } from "./OnboardingCompleteStep";

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useUser();
  
  const stepParam = searchParams.get("step");
  const currentStep = stepParam ? parseInt(stepParam, 10) : 1;

  // Local state for all forms
  const [profileData, setProfileData] = useState<{ fullName: string; bio: string; avatarFile: File | null }>({
    fullName: "",
    bio: "",
    avatarFile: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionData, setCompletionData] = useState<OnboardingCompleteResponse | null>(null);

  // Initialize fullName from user metadata once
  useEffect(() => {
    if (user?.user_metadata?.full_name && !profileData.fullName) {
      setProfileData(prev => ({ ...prev, fullName: user.user_metadata.full_name }));
    }
  }, [user]);

  const handleProfileContinue = (data: { fullName: string; bio: string; avatarFile: File | null }) => {
    setProfileData(data);
    router.push("/onboarding?step=2");
  };

  const handleWorkspaceCreate = async (data: { workspaceName?: string; workspaceSlug?: string; skipWorkspace?: boolean }) => {
    setIsSubmitting(true);
    try {
      let avatarPath: string | undefined = undefined;
      
      // Upload avatar first if provided (non-blocking — toast on failure)
      if (profileData.avatarFile && user?.id) {
        try {
          const { uploadAvatar } = await import("@/shared/lib/upload");
          avatarPath = await uploadAvatar(user.id, profileData.avatarFile);
        } catch (err) {
          console.warn("Avatar upload failed, continuing without it:", err);
          toast.error("Avatar upload failed. You can set one later.");
        }
      }

      const response = await completeOnboarding({
        fullName: profileData.fullName,
        bio: profileData.bio,
        avatarPath,
        workspaceName: data.workspaceName,
        workspaceSlug: data.workspaceSlug,
        skipWorkspace: data.skipWorkspace,
      });
      
      setCompletionData(response);
      
      // Invalidate queries to reflect new user state and workspaces
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      
      if (response.skippedWorkspace || data.skipWorkspace) {
        router.push("/conversations");
      } else {
        router.push("/onboarding?step=3");
      }
    } catch (error: any) {
      console.error("Onboarding failed:", error);
      toast.error(error.response?.data?.error || "Failed to create workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full mb-8">
        <StepProgress currentStep={currentStep} steps={STEPS} />
      </div>

      <div className="w-full">
        {currentStep === 1 && (
          <SetupProfileStep 
            onContinue={handleProfileContinue} 
            initialData={profileData}
          />
        )}
        
        {currentStep === 2 && (
          <CreateWorkspaceStep 
            onCreate={handleWorkspaceCreate} 
            isLoading={isSubmitting}
            defaultFullName={profileData.fullName}
          />
        )}
        
        {currentStep === 3 && completionData && (
          <OnboardingCompleteStep 
            workspaceSlug={completionData.workspaceSlug!}
            generalChannelId={completionData.generalChannelId!}
          />
        )}
      </div>
    </div>
  );
}
