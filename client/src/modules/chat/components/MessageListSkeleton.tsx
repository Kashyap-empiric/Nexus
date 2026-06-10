export function MessageListSkeleton() {
  return (
    <div className="flex-1 px-[15px] md:px-6 py-4 space-y-6 overflow-hidden flex flex-col justify-end pb-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex">
          <div className="w-[36px] shrink-0 flex justify-center items-start pt-1">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col gap-2 pt-1 ml-2">
            <div className="flex items-baseline gap-2 mb-0.5">
              <div className="w-24 h-4 bg-muted rounded animate-pulse" />
              <div className="w-12 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className={`${i % 2 === 0 ? 'w-3/4' : 'w-[90%]'} h-4 bg-muted rounded animate-pulse`} />
            {i % 3 === 0 && <div className="w-1/2 h-4 bg-muted rounded animate-pulse" />}
          </div>
        </div>
      ))}
    </div>
  );
}
