import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const IndependenceBadge = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-medium text-primary cursor-help">
        <Shield className="w-3 h-3" />
        Independent · Owned by POI Foundation
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs">
      <div className="text-xs space-y-1.5">
        <p className="font-semibold text-foreground">What we own</p>
        <p className="text-muted-foreground">
          ✓ Crawler & search index<br />
          ✓ Ranking & reasoning logic<br />
          ✓ Data pipelines<br />
        </p>
        <p className="font-semibold text-foreground mt-2">Third-party (transparent)</p>
        <p className="text-muted-foreground">
          • Sign-In: Google OAuth<br />
          • Ads: Google AdSense<br />
          • LLMs: Gemini / GPT-5 (generation only)
        </p>
      </div>
    </TooltipContent>
  </Tooltip>
);

export default IndependenceBadge;
