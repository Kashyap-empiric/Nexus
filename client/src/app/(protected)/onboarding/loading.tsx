export default function OnboardingLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-brand animate-spin" />
        <p className="text-sm text-muted-foreground">Loading onboarding...</p>
      </div>
    </div>
  );
}
