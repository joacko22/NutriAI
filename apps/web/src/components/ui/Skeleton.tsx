import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg animate-shimmer',
        'bg-[length:200%_100%]',
        'bg-[linear-gradient(90deg,hsl(var(--bg-raised))_0%,hsl(var(--border))_50%,hsl(var(--bg-raised))_100%)]',
        className,
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-44 mb-3" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecordsListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="py-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatHistorySkeleton() {
  const bubbles: Array<{ user: boolean; w: string; h: string }> = [
    { user: false, w: 'w-64', h: 'h-16' },
    { user: true,  w: 'w-48', h: 'h-10' },
    { user: false, w: 'w-72', h: 'h-20' },
    { user: true,  w: 'w-36', h: 'h-10' },
    { user: false, w: 'w-60', h: 'h-14' },
  ];
  return (
    <div className="space-y-5 px-6 py-6">
      {bubbles.map(({ user, w, h }, i) => (
        <div key={i} className={`flex gap-3 ${user ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <Skeleton className={`${h} ${w} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

export function PlansSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      ))}
    </div>
  );
}
