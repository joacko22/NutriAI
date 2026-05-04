import { cn } from '@/lib/utils';

interface SpinnerProps { className?: string; size?: 'sm' | 'md' | 'lg' }

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };
  return (
    <span
      className={cn(
        'inline-block rounded-full border-accent/30 border-t-accent animate-spin',
        sizes[size],
        className,
      )}
    />
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-base">
      <Spinner size="lg" />
    </div>
  );
}
