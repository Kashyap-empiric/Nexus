/**
 * Scroll to a message element by its ID and briefly highlight it.
 * The element must have an id in the format `msg-${messageId}`.
 *
 * Uses scrollIntoView with smooth behavior and applies a CSS highlight
 * class that fades out over 1.5s (defined in globals.css).
 */
export function scrollToMessage(targetId: string) {
  const el = document.getElementById(`msg-${targetId}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  document.querySelectorAll(".highlight-message").forEach((e) => e.classList.remove("highlight-message"));

  el.classList.add("highlight-message");
}
