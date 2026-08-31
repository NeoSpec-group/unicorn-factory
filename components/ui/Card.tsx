'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={['bg-surface rounded-lg shadow-sm border border-border p-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
