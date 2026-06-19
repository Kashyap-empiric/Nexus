export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh bg-background overflow-hidden">
      {}
      <div className="hidden lg:flex w-[480px] bg-sidebar flex-col justify-between p-12 border-r border-border">
        <div className="space-y-6">
          <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-4 w-36 bg-muted animate-pulse rounded" />
      </div>

      {}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[400px] space-y-6 animate-in fade-in">
          <div className="space-y-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
