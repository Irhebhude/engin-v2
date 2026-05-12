import { MessageCircle } from "lucide-react";

interface WhatsAppOrderButtonProps {
  businessName: string;
  productName?: string;
  phone?: string;
}

const WhatsAppOrderButton = ({ businessName, productName, phone }: WhatsAppOrderButtonProps) => {
  const message = `Hello, I found your business on SEARCH-POI and I want to inquire about ${productName || "your products/services"}.`;
  const url = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message + ` (${businessName})`)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(142,70%,40%)]/10 text-[hsl(142,70%,45%)] text-xs font-medium hover:bg-[hsl(142,70%,40%)]/20 transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      WhatsApp Order
    </a>
  );
};

export default WhatsAppOrderButton;
