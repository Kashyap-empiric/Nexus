export default function SettingsLoading() {
  return (
    <div className="flex-1 flex h-full">
      <aside className="w-64 border-r p-4 space-y-2 hidden md:block">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />
        ))}
      </aside>

      <div className="flex-1 p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
          <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
          <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}
