import { Clock, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSearchHistory, clearSearchHistory, type SearchHistoryItem } from "@/lib/search-context";

interface SearchHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (query: string) => void;
}

const SearchHistory = ({ isOpen, onClose, onSelect }: SearchHistoryProps) => {
  const history = getSearchHistory();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute top-full mt-2 w-full glass rounded-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</span>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSearchHistory();
                  onClose();
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No search history yet</div>
        ) : (
          history.map((item, i) => (
            <button
              key={i}
              onMouseDown={() => onSelect(item.query)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-accent/20 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{item.query}</span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </button>
          ))
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchHistory;
