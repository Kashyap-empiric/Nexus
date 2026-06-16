export default function RootLoading() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-brand animate-spin" />
        <p className="text-sm text-muted-foreground">Loading Nexus</p>
      </div>
    </div>
  );
}
