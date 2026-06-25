'use client';

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}

export default function Textarea({
  value,
  onChange,
  placeholder,
  minLength,
  maxLength,
  rows = 5,
  disabled = false,
}: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      minLength={minLength}
      maxLength={maxLength}
      rows={rows}
      disabled={disabled}
      className={[
        'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
        'placeholder-gray-400 shadow-sm resize-vertical',
        'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
      ].join(' ')}
    />
  );
}
