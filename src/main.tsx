import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Self-hosted fonts (Phase 2: removes Google Fonts CDN dependency)
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";

// Guard: never register SW inside iframes or preview hosts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// Seed offline database on first load
import("@/lib/offline-seed").then(({ initOfflineData }) => {
  initOfflineData().then((info) => {
    console.log(`[Offline] DB ready: ${info.count} POIs cached`);
  });
});

createRoot(document.getElementById("root")!).render(<App />);
