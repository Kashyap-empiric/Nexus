export default function ProtectedLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-border/50 border-t-brand animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading content...</p>
      </div>
    </div>
  );
}
