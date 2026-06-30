export const UPLOAD_RULES = {
  MAX_ATTACHMENTS_PER_MESSAGE: 4,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  DEFAULT_UPLOAD_CONCURRENCY: 2,
};

export const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", 
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/wav", "audio/ogg",
  "application/zip", "application/x-zip-compressed", "application/x-rar-compressed"
] as const;

export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv",
  "mp4", "webm", "mov",
  "mp3", "wav", "ogg",
  "zip", "rar"
] as const;
