import { useState, useEffect } from 'react';
import { getSeedInfo } from '@/lib/offline-db';

export interface OfflineStatus {
  isOnline: boolean;
  isOfflineReady: boolean;
  poiCount: number;
  lastSeedTime: string | null;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [poiCount, setPoiCount] = useState(0);
  const [lastSeedTime, setLastSeedTime] = useState<string | null>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    getSeedInfo().then((info) => {
      setIsOfflineReady(info.seeded);
      setPoiCount(info.count);
      setLastSeedTime(info.lastSeedTime);
    });
  }, []);

  return { isOnline, isOfflineReady, poiCount, lastSeedTime };
}
