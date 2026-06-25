'use client';

import Card from '@/components/ui/Card';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface DeliverableCardProps {
  title: string;
  type: 'markdown' | 'link';
  content: string;
}

export default function DeliverableCard({ title, type, content }: DeliverableCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
        {title}
      </h3>
      {type === 'markdown' ? (
        <MarkdownRenderer content={content} />
      ) : (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 break-all"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          {content}
        </a>
      )}
    </Card>
  );
}
