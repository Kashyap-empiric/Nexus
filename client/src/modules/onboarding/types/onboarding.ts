export type StepConfig = {
  label: string;
};

export const STEPS: StepConfig[] = [
  { label: "Profile" },
  { label: "Workspace" },
  { label: "Done" },
];

export interface OnboardingData {
  fullName: string;
  bio: string;
  avatarFile: File | null;
  workspaceName: string;
  workspaceSlug: string;
}

export interface OnboardingCompleteResponse {
  workspaceId?: string;
  generalChannelId?: string;
  workspaceSlug?: string;
  skippedWorkspace?: boolean;
}
