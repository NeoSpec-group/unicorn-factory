'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="text-sm text-foreground leading-relaxed space-y-2">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mt-3 mb-1">{children}</h3>
          ),
          p: ({ children }) => <p className="text-foreground leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 text-foreground pl-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 text-foreground pl-2">{children}</ol>
          ),
          li: ({ children }) => <li className="text-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-soft pl-4 italic text-foreground-muted">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-surface-muted rounded px-1 py-0.5 text-xs font-mono text-foreground">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-hover"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
