import { X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface AttachmentPreviewProps {
  fileName: string;
  fileSize: number;
  mimeType: string;
  isUploading?: boolean;
  file?: File;
  downloadUrl?: string | null;
  onRemove?: () => void;
  onRetry?: () => void;
  onClick?: () => void;
  className?: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

import { useState, useEffect } from "react";

export function AttachmentPreview({
  fileName,
  fileSize,
  mimeType,
  isUploading,
  file,
  downloadUrl,
  onRemove,
  onRetry,
  onClick,
  className = "",
}: AttachmentPreviewProps) {
  const isImage = mimeType.startsWith("image/");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && isImage) {
      const url = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  const imageUrl = downloadUrl || objectUrl;

  return (
    <div
      className={`relative group flex items-center gap-3 p-2 border border-border/60 rounded-md bg-muted/30 overflow-hidden ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded bg-background border border-border/40 overflow-hidden">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt={fileName} className="w-full h-full object-cover" />
        ) : isUploading ? (
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        ) : isImage ? (
          <ImageIcon className="w-5 h-5 text-primary/70" />
        ) : (
          <FileText className="w-5 h-5 text-primary/70" />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground truncate">
          {isUploading ? "Uploading..." : formatBytes(fileSize)}
        </span>
        {onRetry && (
          <button 
            type="button" 
            className="text-xs text-destructive hover:underline text-left mt-0.5" 
            onClick={(e) => { e.stopPropagation(); onRetry(); }}
          >
            Retry upload
          </button>
        )}
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}


    </div>
  );
}
