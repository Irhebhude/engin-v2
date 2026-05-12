import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, ExternalLink, X, Loader2 } from "lucide-react";

export interface ImageResult {
  url: string;
  alt: string;
  sourceUrl: string;
  sourceTitle: string;
  domain: string;
  isThumbnail?: boolean;
}

interface ImageSearchResultsProps {
  results: ImageResult[];
  isLoading: boolean;
}

const ImageSearchResults = ({ results, isLoading }: ImageSearchResultsProps) => {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Images</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse aspect-square bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className="mt-6 text-center py-8">
        <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No images found. Try a different search term.</p>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Image Results ({results.length})
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {results.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group relative cursor-pointer rounded-xl overflow-hidden glass border border-border/30 hover:border-primary/40 transition-all hover:glow-box"
              onClick={() => setSelectedImage(img)}
            >
              <div className="aspect-square">
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-foreground truncate font-medium">{img.alt || img.sourceTitle}</p>
                <p className="text-[9px] text-muted-foreground truncate">{img.domain}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-4xl max-h-[85vh] w-full glass rounded-2xl overflow-hidden glow-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedImage.alt || selectedImage.sourceTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedImage.domain}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-accent/20 transition-colors text-muted-foreground hover:text-foreground"
                    title="Open full image"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 rounded-lg hover:bg-accent/20 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 max-h-[70vh] overflow-auto">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.alt}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="p-3 border-t border-border/30 flex items-center justify-between">
                <a
                  href={selectedImage.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate"
                >
                  Visit source: {selectedImage.domain}
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageSearchResults;
