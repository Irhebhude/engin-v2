import { Star } from "lucide-react";

interface POIPointsBadgeProps {
  points: number;
}

const POIPointsBadge = ({ points }: POIPointsBadgeProps) => {
  if (points <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(45,90%,50%)]/10 text-[hsl(45,90%,55%)] text-xs font-semibold">
      <Star className="w-3.5 h-3.5 fill-current" />
      {points.toLocaleString()} POI Points
    </span>
  );
};

export default POIPointsBadge;
