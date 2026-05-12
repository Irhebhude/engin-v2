import { motion } from "framer-motion";
import { Video, ExternalLink, Play, Loader2 } from "lucide-react";

export interface VideoResult {
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  platform: string;
  domain: string;
  videoId?: string;
}

interface VideoSearchResultsProps {
  results: VideoResult[];
  isLoading: boolean;
}

const VideoSearchResults = ({ results, isLoading }: VideoSearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Videos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-muted/20 rounded-xl mb-2" />
              <div className="h-4 bg-muted/20 rounded w-3/4 mb-1" />
              <div className="h-3 bg-muted/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className="mt-6 text-center py-8">
        <Video className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No videos found. Try a different search term.</p>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Video Results ({results.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((video, i) => (
          <motion.a
            key={i}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group glass rounded-xl overflow-hidden border border-border/30 hover:border-primary/40 transition-all hover:glow-box"
          >
            <div className="relative aspect-video">
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-3 rounded-full bg-primary/90 text-primary-foreground">
                  <Play className="w-6 h-6" />
                </div>
              </div>
              {/* Platform badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] font-medium text-foreground">
                {video.platform}
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                <span>{video.domain}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};

export default VideoSearchResults;
