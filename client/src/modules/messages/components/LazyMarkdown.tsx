"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/shared/lib/utils";

interface LazyMarkdownProps {
  content: string;
}

export function LazyMarkdown({ content }: LazyMarkdownProps) {
  const components: Partial<Components> = {
    a: ({ children, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium break-all"
      >
        {children}
      </a>
    ),
    p: ({ children, ...props }) => (
      <p {...props} className="whitespace-pre-wrap m-0 inline-block w-full [&:not(:last-child)]:mb-1 last:inline">
        {children}
      </p>
    ),
    code: ({ className, children, ...props }) => {
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
      return (
        <code {...props} className={cn("hljs font-mono text-[13px]", className)}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre
        {...props}
        className="bg-zinc-950 dark:bg-zinc-900/50 text-zinc-50 border border-border/50 rounded-md p-3 my-2 overflow-x-auto text-[13px] leading-relaxed block"
      >
        {children}
      </pre>
    ),
    strong: ({ children, ...props }) => (
      <strong {...props} className="font-bold text-foreground">
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em {...props} className="italic">
        {children}
      </em>
    ),
    del: ({ children, ...props }) => (
      <del {...props} className="line-through opacity-70">
        {children}
      </del>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        className="border-l-4 border-primary/50 pl-3 my-2 italic text-muted-foreground block"
      >
        {children}
      </blockquote>
    ),
    ul: ({ children, ...props }) => (
      <ul {...props} className="list-disc list-outside ml-4 my-1 space-y-1 block">
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol {...props} className="list-decimal list-outside ml-4 my-1 space-y-1 block">
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} className="pl-1">
        {children}
      </li>
    ),
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
