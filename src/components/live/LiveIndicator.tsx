import { cn } from "@/lib/utils";

interface Props {
  status?: "live" | "delayed" | "offline";
  label?: string;
  className?: string;
}

export default function LiveIndicator({ status = "live", label = "LIVE", className }: Props) {
  const color =
    status === "live" ? "bg-[#00FF88]" : status === "delayed" ? "bg-[#FFB800]" : "bg-[#FF3B3B]";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider", className)}>
      <span className="relative flex h-2 w-2">
        {status === "live" && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", color)} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
      </span>
      <span className="text-foreground/80">{label}</span>
    </span>
  );
}
