
export function scrollToMessage(targetId: string) {
  const el = document.getElementById(`msg-${targetId}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  document.querySelectorAll(".highlight-message").forEach((e) => e.classList.remove("highlight-message"));

  el.classList.add("highlight-message");
}
