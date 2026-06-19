"use client";

import { memo, lazy, Suspense } from "react";
import { cn } from "@/shared/lib/utils";

const LazyMarkdown = lazy(() => import("./LazyMarkdown").then(m => ({ default: m.LazyMarkdown })));

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MARKDOWN_CHARS = /[*_`>~\-\[\]#]/;

export const MarkdownRenderer = memo(({ content, className }: MarkdownRendererProps) => {
  if (!MARKDOWN_CHARS.test(content)) {
    return <span className={cn("whitespace-pre-wrap break-words", className)}>{content}</span>;
  }

  return (
    <span className={cn("markdown-prose text-sm break-words inline", className)}>
      <Suspense fallback={<span className="whitespace-pre-wrap break-words">{content}</span>}>
        <LazyMarkdown content={content} />
      </Suspense>
    </span>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
