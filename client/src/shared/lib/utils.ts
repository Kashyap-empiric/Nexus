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
