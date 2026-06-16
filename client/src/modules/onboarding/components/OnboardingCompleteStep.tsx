import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface OnboardingCompleteStepProps {
  workspaceSlug: string;
  generalChannelId: string;
}

export function OnboardingCompleteStep({ workspaceSlug, generalChannelId }: OnboardingCompleteStepProps) {
  const router = useRouter();

  const handleFinish = () => {
    router.push(`/workspaces/${workspaceSlug}/channels/${generalChannelId}`);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in zoom-in-95">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-brand" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">You're All Set!</h2>
        <p className="text-muted-foreground">Your profile is created and your workspace is ready.</p>
      </div>

      <div className="bg-card border shadow-sm rounded-xl p-6 max-w-sm mx-auto">
        <ul className="space-y-4">
          <li className="flex items-center gap-3 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-brand" />
            Profile setup complete
          </li>
          <li className="flex items-center gap-3 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-brand" />
            Workspace created
          </li>
          <li className="flex items-center gap-3 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-brand" />
            #general channel ready
          </li>
        </ul>
      </div>

      <div className="pt-4 max-w-sm mx-auto">
        <Button
          onClick={handleFinish}
          className="w-full h-12 text-base font-medium shadow-sm"
        >
          Start chatting
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
