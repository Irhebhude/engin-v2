import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const KEY = "zk_search_enabled";

export const isZKSearchEnabled = () =>
  typeof window !== "undefined" && localStorage.getItem(KEY) === "1";

const ZKSearchToggle = () => {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(isZKSearchEnabled()); }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    toast({
      title: next ? "ZK-Search enabled" : "ZK-Search disabled",
      description: next
        ? "Queries will not be logged to your history or activity feed."
        : "Normal mode — queries contribute to trending and history.",
    });
  };

  return (
    <button
      onClick={toggle}
      title={on ? "Privacy mode on — query not logged" : "Enable private search"}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
        on ? "bg-primary/20 text-primary" : "hover:bg-accent/20 text-muted-foreground"
      }`}
    >
      {on ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{on ? "ZK On" : "ZK"}</span>
    </button>
  );
};

export default ZKSearchToggle;
