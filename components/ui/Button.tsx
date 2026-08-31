'use client';

import React from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantClasses: Record<ButtonProps['variant'], string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:opacity-50',
  secondary:
    'bg-surface text-foreground border border-border-strong hover:bg-surface-muted disabled:opacity-50',
  destructive: 'bg-[var(--color-danger-solid)] text-white hover:opacity-90 disabled:opacity-50',
};

export default function Button({
  variant,
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
