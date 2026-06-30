import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";

interface ImageAttachmentProps {
  fileName: string;
  downloadUrl?: string;
  file?: File;
  onClick?: () => void;
  className?: string;
  isSingle?: boolean;
}

export function ImageAttachment({
  fileName,
  downloadUrl,
  file,
  onClick,
  className = "",
  isSingle = false
}: ImageAttachmentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && !downloadUrl) {
      const url = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, downloadUrl]);

  const imageUrl = downloadUrl || objectUrl;

  return (
    <div 
      className={`relative group overflow-hidden rounded-lg border border-border bg-muted cursor-zoom-in ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt={fileName} 
            className={`transition-transform duration-300 group-hover:scale-105 ${isSingle ? "w-auto max-w-full h-auto max-h-[350px] object-contain rounded-lg" : "w-full h-full object-cover absolute inset-0"}`} 
            loading="lazy"
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 opacity-50 mb-2" />
          <span className="text-xs max-w-[80%] truncate">{fileName}</span>
        </div>
      )}
    </div>
  );
}
