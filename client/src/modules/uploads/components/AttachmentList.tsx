import type { AttachmentResponseDto } from "../api/uploads.api";
import { buildAttachmentLayout } from "../utils/attachments";
import { ImageAttachment } from "./ImageAttachment";
import { DocumentAttachment } from "./DocumentAttachment";

interface AttachmentListProps {
  attachments: (AttachmentResponseDto & { file?: File })[];
  onDownload?: (attachmentId: string) => void;
  className?: string;
}

export function AttachmentList({
  attachments,
  onDownload,
  className = "",
}: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  const { images, nonImages, hasImages, hasNonImages } = buildAttachmentLayout(attachments);

  const getImageGridClass = (count: number) => {
    if (count === 1) return "flex w-fit max-w-[400px]";
    if (count === 2) return "grid grid-cols-2 grid-rows-1 gap-1 w-full max-w-[500px] aspect-[2/1]";
    if (count === 3) return "grid grid-cols-2 grid-rows-2 gap-1 w-full max-w-[500px] aspect-square";
    return "grid grid-cols-2 grid-rows-2 gap-1 w-full max-w-[500px] aspect-square"; 
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {hasImages && (
        <div className={getImageGridClass(images.length)}>
          {images.map((img, index) => {
            let itemClass = "w-full h-full"; // Forces child to fill the grid track
            if (images.length === 1) {
              itemClass = "w-fit";
            } else if (images.length === 3 && index === 0) {
              itemClass = "col-span-2 row-span-1 w-full h-full";
            }
            return (
              <ImageAttachment
                key={img.id}
                fileName={img.originalName}
                downloadUrl={img.downloadUrl}
                file={img.file}
                onClick={onDownload ? () => onDownload(img.id) : undefined}
                className={itemClass}
                isSingle={images.length === 1}
              />
            );
          })}
        </div>
      )}

      {hasNonImages && (
        <div className="flex flex-col gap-2 max-w-[400px]">
          {nonImages.map((doc) => (
            <DocumentAttachment
              key={doc.id}
              fileName={doc.originalName}
              fileSize={doc.size}
              downloadUrl={doc.downloadUrl}
              file={doc.file}
              onDownload={onDownload ? () => onDownload(doc.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
