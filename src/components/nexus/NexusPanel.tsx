import { ReactNode } from "react";

export default function NexusPanel({
  title, accent, icon, active, children, className = "",
}: {
  title: string;
  accent: string;
  icon?: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl backdrop-blur-md h-full flex flex-col overflow-hidden transition-all duration-500 ${className}`}
      style={{
        background: "rgba(2,8,16,0.6)",
        border: `1px solid ${accent}${active ? "80" : "40"}`,
        boxShadow: active ? `0 0 30px ${accent}40, inset 0 0 20px ${accent}10` : `0 0 8px ${accent}20`,
      }}
    >
      <div
        className="px-4 py-2.5 border-b flex items-center gap-2 text-xs font-bold tracking-widest"
        style={{
          borderColor: `${accent}30`,
          color: accent,
          fontFamily: "'Orbitron', sans-serif",
          background: `linear-gradient(90deg, ${accent}10, transparent)`,
        }}
      >
        {icon && <span className="text-base">{icon}</span>}
        {title}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />}
      </div>
      <div className="p-4 flex-1 overflow-y-auto custom-scroll" style={{ scrollbarColor: `${accent} transparent` }}>
        {children}
      </div>
    </div>
  );
}
