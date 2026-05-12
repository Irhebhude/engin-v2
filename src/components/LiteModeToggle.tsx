import { forwardRef } from "react";
import { Zap } from "lucide-react";

interface LiteModeToggleProps {
  enabled: boolean;
  onToggle: (val: boolean) => void;
}

const LiteModeToggle = forwardRef<HTMLButtonElement, LiteModeToggleProps>(
  ({ enabled, onToggle }, ref) => {
    return (
      <button
        ref={ref}
        onClick={() => onToggle(!enabled)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          enabled
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        }`}
        title="Low-Data Mode: Text-only minimal layout"
      >
        <Zap className="w-3.5 h-3.5" />
        Lite
      </button>
    );
  }
);

LiteModeToggle.displayName = "LiteModeToggle";

export default LiteModeToggle;
