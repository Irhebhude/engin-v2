export default function NexusScanLine() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 h-[2px] z-20"
      style={{
        background: "linear-gradient(to right, transparent, rgba(0,255,231,0.6), transparent)",
        boxShadow: "0 0 12px rgba(0,255,231,0.5)",
        animation: "nexus-scan 8s linear infinite",
      }}
    />
  );
}
