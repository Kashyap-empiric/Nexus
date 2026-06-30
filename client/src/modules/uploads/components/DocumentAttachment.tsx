import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { formatBytes } from "../utils/formatters";

interface DocumentAttachmentProps {
  fileName: string;
  fileSize: number;
  downloadUrl?: string;
  file?: File;
  onDownload?: () => void;
}

export function DocumentAttachment({
  fileName,
  fileSize,
  downloadUrl,
  file,
  onDownload
}: DocumentAttachmentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && !downloadUrl) {
      const url = URL.createObjectURL(file);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, downloadUrl]);

  const finalUrl = downloadUrl || objectUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    } else if (finalUrl) {
      window.open(finalUrl, "_blank");
    }
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={handleDownload}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10 text-primary shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">{formatBytes(fileSize)}</span>
      </div>
      <div className="w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border text-muted-foreground hover:text-foreground">
        <Download className="w-4 h-4" />
      </div>
    </div>
  );
}
