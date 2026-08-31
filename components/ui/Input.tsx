'use client';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  disabled?: boolean;
  className?: string;
}

export default function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={[
        'block w-full rounded-md border border-border-strong px-3 py-2 text-sm text-foreground',
        'placeholder:text-foreground-muted shadow-sm transition-colors duration-150',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:bg-surface-muted disabled:cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
