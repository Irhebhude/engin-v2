import { Twitter, MessageCircle, Copy, Check, Share2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  text: string;
  query: string;
}

const ShareButtons = ({ text, query }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/search?q=${encodeURIComponent(query)}`;
  const shareText = `Check out this AI answer for "${query}" on SEARCH-POI:\n\n${text.slice(0, 200)}${text.length > 200 ? "..." : ""}\n\n`;

  const shareTwitter = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}${shareUrl}`);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = `${shareText}${shareUrl}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      <button
        onClick={shareTwitter}
        className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
        title="Share on X/Twitter"
      >
        <Twitter className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={shareWhatsApp}
        className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
        title="Share on WhatsApp"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={copyLink}
        className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy link"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

export default ShareButtons;
