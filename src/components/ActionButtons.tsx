import { Phone, MessageCircle, ShoppingCart } from "lucide-react";

interface ActionButtonsProps {
  phone?: string;
  whatsapp?: string;
  businessName?: string;
  query?: string;
}

const ActionButtons = ({ phone, whatsapp, businessName, query }: ActionButtonsProps) => {
  const message = encodeURIComponent(
    `Hi${businessName ? ` ${businessName}` : ""}, I found you on SEARCH-POI${query ? ` while searching for "${query}"` : ""}. I'd like to inquire about your services.`
  );

  return (
    <div className="flex items-center gap-2 mt-2">
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(142,70%,35%)]/15 text-[hsl(142,70%,50%)] hover:bg-[hsl(142,70%,35%)]/25 transition-colors text-xs font-medium"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
        >
          <Phone className="w-3.5 h-3.5" />
          Call
        </a>
      )}
      <a
        href={whatsapp
          ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi${businessName ? ` ${businessName}` : ""}, I'd like to request a quote${query ? ` regarding "${query}"` : ""}. Please share pricing details.`)}`
          : phone
            ? `mailto:?subject=Quote Request&body=${encodeURIComponent(`I'd like to request a quote${businessName ? ` from ${businessName}` : ""}${query ? ` for "${query}"` : ""}.`)}`
            : "#"}
        target={whatsapp || phone ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors text-xs font-medium"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        Request Quote
      </a>
    </div>
  );
};

export default ActionButtons;
