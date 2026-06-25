'use client';

interface BadgeProps {
  label: string;
  variant: 'success' | 'danger' | 'neutral';
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  success: 'bg-green-100 text-green-800 border border-green-200',
  danger: 'bg-red-100 text-red-800 border border-red-200',
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
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
