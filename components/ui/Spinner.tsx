'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export default function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={[
        'animate-spin rounded-full border-border border-t-primary motion-reduce:animate-[spin_1.5s_linear_infinite]',
        sizeClasses[size],
      ].join(' ')}
    />
  );
}
