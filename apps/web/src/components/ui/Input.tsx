import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-muted tracking-wide uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-raised px-3 text-sm text-ink placeholder:text-ink-faint',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50',
            error ? 'border-danger/50 focus:ring-danger/30' : 'border-border',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
