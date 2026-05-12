import { useState } from 'react';
import { Wifi, WifiOff, Database, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import { motion, AnimatePresence } from 'framer-motion';
import { syncPOIDataFromRemote } from '@/lib/offline-seed';
import { toast } from 'sonner';

const OfflineStatusBar = () => {
  const { isOnline, isOfflineReady, poiCount } = useOfflineStatus();
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const bgClass = !isOnline
    ? 'bg-amber-500/90 text-amber-950'
    : isOfflineReady
      ? 'bg-emerald-500/20 text-emerald-400'
      : 'bg-muted/50 text-muted-foreground';

  const icon = !isOnline ? (
    <WifiOff className="w-3.5 h-3.5" />
  ) : isOfflineReady ? (
    <Database className="w-3.5 h-3.5" />
  ) : (
    <Wifi className="w-3.5 h-3.5" />
  );

  const label = !isOnline
    ? 'Mode: Offline — Using local database'
    : isOfflineReady
      ? `Mode: Offline Ready — ${poiCount} POIs cached`
      : 'Mode: Online — Sync data for offline use';

  const handleSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    setJustSynced(false);
    try {
      const result = await syncPOIDataFromRemote();
      if (result.source === 'remote') {
        toast.success(`Synced ${result.count} POIs from public dataset`);
      } else {
        toast.warning(`Remote sync unavailable. Using local seed (${result.count} POIs)`);
      }
      setJustSynced(true);
      // Reload page so useOfflineStatus reflects fresh count
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error('Sync failed. Try again later.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`fixed top-0 left-0 right-0 z-[60] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1 px-2 text-xs font-medium ${bgClass} backdrop-blur-sm`}
      >
        {icon}
        <span className="truncate">{label}</span>
        {isOfflineReady && (
          <span className="flex items-center gap-1 opacity-70">
            <MapPin className="w-3 h-3" /> GPS Ready
          </span>
        )}
        <button
          onClick={handleSync}
          disabled={syncing || !isOnline}
          aria-label="Sync POI data now"
          className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-background/30 hover:bg-background/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[24px]"
        >
          {justSynced ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          )}
          <span>{syncing ? 'Syncing…' : justSynced ? 'Synced' : 'Sync Now'}</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineStatusBar;
