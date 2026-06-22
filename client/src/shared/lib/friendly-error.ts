const COMMON_ERRORS: [string, string][] = [
  ["network error", "A network error occurred. Check your connection and try again."],
  ["timeout", "The request timed out. Please try again."],
  ["econnrefused", "Unable to connect to the server. Please try again later."],
  ["too many requests", "Too many requests. Please wait a moment."],
  ["rate limit", "Too many requests. Please wait a moment."],
  ["internal server error", "Something went wrong on our end. Please try again."],
  ["not found", "The requested resource was not found."],
  ["forbidden", "You don't have permission to do that."],
  ["unauthorized", "You need to sign in to do that."],
  ["validation failed", "Please check your input and try again."],
];

function getErrorString(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "response" in err) {
    const resp = (err as { response: { data?: { error?: string } } }).response;
    return resp?.data?.error || (err as { message?: string }).message || String(err);
  }
  return String(err);
}

export function friendlyError(err: unknown, fallback = "Something went wrong."): string {
  const msg = getErrorString(err);
  if (!msg) return fallback;
  const lower = msg.toLowerCase();
  for (const [key, friendly] of COMMON_ERRORS) {
    if (lower.includes(key)) return friendly;
  }
  return msg || fallback;
}
