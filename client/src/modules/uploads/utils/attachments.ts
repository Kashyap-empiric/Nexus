export type AttachmentType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'unknown';

export function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  if (mimeType === 'application/pdf') return 'pdf';
  
  if (
    mimeType === 'application/msword' || 
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType.startsWith('text/')
  ) return 'document';
  
  if (
    mimeType === 'application/vnd.ms-excel' || 
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) return 'spreadsheet';
  
  if (
    mimeType === 'application/vnd.ms-powerpoint' || 
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) return 'presentation';
  
  if (
    mimeType === 'application/zip' || 
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-zip-compressed' ||
    mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  ) return 'archive';
  
  return 'unknown';
}

export function buildAttachmentLayout<T extends { mimeType: string }>(attachments: T[]) {
  const images = attachments.filter(a => getAttachmentType(a.mimeType) === 'image');
  const nonImages = attachments.filter(a => getAttachmentType(a.mimeType) !== 'image');
  
  return {
    images,
    nonImages,
    hasImages: images.length > 0,
    hasNonImages: nonImages.length > 0
  };
}
