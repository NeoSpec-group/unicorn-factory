'use client';

interface BadgeProps {
  label: string;
  variant: 'success' | 'danger' | 'neutral';
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  success:
    'bg-[var(--color-success-bg)] text-[var(--color-success-fg)] border border-[var(--color-success-fg)]/20',
  danger:
    'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)] border border-[var(--color-danger-fg)]/20',
  neutral: 'bg-surface-muted text-foreground-muted border border-border',
};

export default function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
        variantClasses[variant],
      ].join(' ')}
    >
      {label}
    </span>
  );
}
