"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { friendlyError } from "@/shared/lib/friendly-error";
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

  const [profileData, setProfileData] = useState<{ fullName: string; bio: string; avatarFile: File | null }>({
    fullName: "",
    bio: "",
    avatarFile: null,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<OnboardingCompleteResponse | null>(null);

  
  useEffect(() => {
    if (user?.user_metadata?.full_name && !profileData.fullName) {
      setProfileData(prev => ({ ...prev, fullName: user.user_metadata.full_name }));
    }
  }, [user, profileData.fullName]);
  

  const handleProfileContinue = (data: { fullName: string; bio: string; avatarFile: File | null }) => {
    setProfileData(data);
    router.push("/onboarding?step=2");
  };

  const handleWorkspaceCreate = async (data: { workspaceName?: string; workspaceSlug?: string; workspaceDescription?: string; workspaceIconFile?: File | null; skipWorkspace?: boolean }) => {
    setIsSubmitting(true);
    try {
      let avatarUrl: string | undefined = undefined;
      let workspaceIconPath: string | undefined = undefined;
      
      if (profileData.avatarFile && user?.id) {
        try {
          const { uploadAvatarAndGetUrl } = await import("@/shared/lib/upload");
          avatarUrl = await uploadAvatarAndGetUrl(user.id, profileData.avatarFile);
        } catch (err) {
          console.warn("Avatar upload failed, continuing without it:", err);
          toast.error("Avatar upload failed. You can set one later.");
        }
      }

      if (data.workspaceIconFile && data.workspaceSlug) {
        try {
          const { uploadWorkspaceIcon } = await import("@/shared/lib/upload");
          workspaceIconPath = await uploadWorkspaceIcon(data.workspaceSlug, data.workspaceIconFile);
        } catch (err) {
          console.warn("Workspace icon upload failed, continuing without it:", err);
          toast.error("Icon upload failed. You can set one later.");
        }
      }

      const response = await completeOnboarding({
        fullName: profileData.fullName,
        bio: profileData.bio,
        avatarUrl,
        workspaceName: data.workspaceName,
        workspaceSlug: data.workspaceSlug,
        workspaceDescription: data.workspaceDescription,
        workspaceIconPath,
        skipWorkspace: data.skipWorkspace,
      });
      
      setCompletionData(response);
      
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      
      if (response.skippedWorkspace || data.skipWorkspace) {
        router.push("/conversations");
      } else {
        router.push("/onboarding?step=3");
      }
    } catch (err: unknown) {
      console.error("Onboarding failed:", err);
      setError(friendlyError(err, "Failed to create workspace. Please try again."));
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
          <>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            )}
            <CreateWorkspaceStep 
              onCreate={handleWorkspaceCreate} 
              isLoading={isSubmitting}
              defaultFullName={profileData.fullName}
            />
          </>
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
