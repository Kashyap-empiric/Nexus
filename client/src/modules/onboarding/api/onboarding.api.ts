import { api } from "@/shared/lib/api";
import { API_ROUTES } from "@/config/url";
import type { OnboardingData, OnboardingCompleteResponse } from "../types/onboarding";

export interface CompleteOnboardingPayload {
  fullName: string;
  bio?: string;
  avatarPath?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  skipWorkspace?: boolean;
}

export const completeOnboarding = async (data: CompleteOnboardingPayload) => {
  const response = await api.post<{ data: OnboardingCompleteResponse }>(
    API_ROUTES.ONBOARDING.COMPLETE,
    data
  );
  return response.data.data;
};
