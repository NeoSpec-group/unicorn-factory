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
        'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900',
        'placeholder-gray-400 shadow-sm',
        'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
