import { useState, useEffect } from "react";
import { X, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export interface ViewerImage {
  url: string;
  fileName: string;
}

interface ImageViewerProps {
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);

  const currentImage = images[currentIndex];

  const handlePrev = () => {
    if (currentIndex > 0) {
      setLoading(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setLoading(true);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, images.length, onClose]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentImage) return;
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = currentImage.fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(objectUrl);
      a.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  if (!currentImage) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
        {images.length > 1 && (
          <div className="text-sm font-medium text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}
        <button 
          onClick={handleDownload} 
          className="p-2 text-foreground/70 hover:text-foreground bg-muted/40 hover:bg-muted/60 rounded-full transition"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
        <button 
          onClick={onClose} 
          className="p-2 text-foreground/70 hover:text-foreground bg-muted/40 hover:bg-muted/60 rounded-full transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {images.length > 1 && currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-foreground/70 hover:text-foreground bg-muted/40 hover:bg-muted/80 rounded-full transition z-10"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          title="Previous Image"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-foreground/70 hover:text-foreground bg-muted/40 hover:bg-muted/80 rounded-full transition z-10"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          title="Next Image"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 text-foreground animate-spin" />
        </div>
      )}

      <div className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          key={currentImage.url} // Force re-render of img tag on URL change to trigger onLoad
          src={currentImage.url} 
          alt={currentImage.fileName} 
          className={`max-w-[90vw] max-h-[85vh] object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Caption */}
        {!loading && (
          <div className="absolute -bottom-10 left-0 right-0 text-center pointer-events-none">
            <span className="text-sm font-medium text-foreground/80 bg-background/50 px-3 py-1 rounded-full backdrop-blur-md">
              {currentImage.fileName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
