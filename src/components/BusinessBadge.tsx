import { BadgeCheck, Crown } from "lucide-react";

interface BusinessBadgeProps {
  isVerified?: boolean;
  memberDiscount?: number;
  isPremiumUser?: boolean;
}

const BusinessBadge = ({ isVerified, memberDiscount, isPremiumUser }: BusinessBadgeProps) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isVerified && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wide">
          <BadgeCheck className="w-3 h-3" />
          POI Verified
        </span>
      )}
      {isPremiumUser && memberDiscount && memberDiscount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(45,90%,50%)]/15 text-[hsl(45,90%,55%)] text-[10px] font-semibold uppercase tracking-wide">
          <Crown className="w-3 h-3" />
          {memberDiscount}% Member Discount
        </span>
      )}
    </div>
  );
};

export default BusinessBadge;
