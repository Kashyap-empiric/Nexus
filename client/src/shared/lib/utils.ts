import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Navigate to a URL, falling back to window.location if router.push throws.
 * This handles edge cases where router.push fails during page transitions.
 */
export function safeRedirect(router: { push: (url: string) => void }, url: string) {
  try {
    router.push(url);
  } catch {
    window.location.href = url;
  }
}

/**
 * Strip common markdown formatting from text for use in previews/sidebars.
 * Converts *italic*, **bold**, `code`, ~~strikethrough~~, and links to plain text.
 * Strips heading markers, blockquotes, list markers, and thematic breaks.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{3}([^*]+)\*{3}/g, "$1")
    .replace(/\*{2}([^*]+)\*{2}/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{2}([^_]+)_{2}/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
