import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: string;
  image?: string;
  jsonLd?: Record<string, any>;
}

const BASE_URL = "https://search-poi.lovable.app";

const SEOHead = ({ title, description, path = "", keywords, type = "website", image, jsonLd }: SEOHeadProps) => {
  useEffect(() => {
    // Truncate for SEO limits
    const seoTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    const seoDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;
    const url = `${BASE_URL}${path}`;

    document.title = seoTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Basic meta
    setMeta("name", "description", seoDesc);
    if (keywords?.length) setMeta("name", "keywords", keywords.join(", "));
    setMeta("name", "robots", "index, follow, max-snippet:-1, max-image-preview:large");
    setMeta("name", "author", "POI Foundation");

    // Open Graph
    setMeta("property", "og:title", seoTitle);
    setMeta("property", "og:description", seoDesc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", type);
    setMeta("property", "og:site_name", "SEARCH-POI");
    if (image) setMeta("property", "og:image", image);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seoTitle);
    setMeta("name", "twitter:description", seoDesc);
    setMeta("name", "twitter:site", "@searchpoi");
    if (image) setMeta("name", "twitter:image", image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // JSON-LD structured data
    const defaultJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "SEARCH-POI",
      url: BASE_URL,
      description: "AI-Powered Search Engine — Get instant AI answers, deep research, and real-time web results.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      creator: {
        "@type": "Organization",
        name: "POI Foundation",
        founder: {
          "@type": "Person",
          name: "Prosper Ozoya Irhebhude",
        },
      },
    };

    const ldData = jsonLd || defaultJsonLd;
    let ldScript = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement;
    if (!ldScript) {
      ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(ldData);

    return () => {
      // Cleanup JSON-LD on unmount
    };
  }, [title, description, path, keywords, type, image, jsonLd]);

  return null;
};

export default SEOHead;
