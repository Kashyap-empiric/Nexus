"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/shared/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MARKDOWN_CHARS = /[*_`>~\-[\]#]/;

export const MarkdownRenderer = memo(({ content, className }: MarkdownRendererProps) => {
  // Fast path: if the content has no markdown control characters, render it as plain text.
  if (!MARKDOWN_CHARS.test(content)) {
    return <span className={cn("whitespace-pre-wrap break-words", className)}>{content}</span>;
  }

  return (
    <span className={cn("markdown-prose text-sm break-words inline", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Links: open in new tab securely and style with primary color
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium break-all"
            />
          ),
          // Paragraphs: ensure proper whitespace and avoid margin collapse in chat bubbles
          p: ({ node, ...props }) => (
            <p {...props} className="whitespace-pre-wrap m-0 inline-block w-full [&:not(:last-child)]:mb-1 last:inline" />
          ),
          // Inline code: distinct background
          code: ({ node, className, children, ...props }) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code
                  {...props}
                  className="bg-muted text-foreground px-1.5 py-0.5 rounded text-[13px] font-mono border border-border/50"
                >
                  {children}
                </code>
              );
            }
            // Code blocks get hljs styling from CSS, just ensure font
            return (
              <code {...props} className={cn("hljs font-mono text-[13px]", className)}>
                {children}
              </code>
            );
          },
          // Preformatted code blocks: distinct container
          pre: ({ node, ...props }) => (
            <pre
              {...props}
              className="bg-zinc-950 dark:bg-zinc-900/50 text-zinc-50 border border-border/50 rounded-md p-3 my-2 overflow-x-auto text-[13px] leading-relaxed block"
            />
          ),
          // Explicitly define strong and em to ensure they bypass any CSS resets
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-bold text-foreground" />
          ),
          em: ({ node, ...props }) => (
            <em {...props} className="italic" />
          ),
          del: ({ node, ...props }) => (
            <del {...props} className="line-through opacity-70" />
          ),
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-primary/50 pl-3 my-2 italic text-muted-foreground block"
            />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc list-outside ml-4 my-1 space-y-1 block" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="list-decimal list-outside ml-4 my-1 space-y-1 block" />
          ),
          li: ({ node, ...props }) => (
            <li {...props} className="pl-1" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </span>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
