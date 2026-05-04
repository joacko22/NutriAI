import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium font-mono',
  {
    variants: {
      variant: {
        default:  'bg-accent/15 text-accent-light border border-accent/20',
        muted:    'bg-raised text-ink-muted border border-border',
        warn:     'bg-warn/15 text-warn border border-warn/20',
        danger:   'bg-danger/15 text-danger border border-danger/20',
        outline:  'border border-border text-ink-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
