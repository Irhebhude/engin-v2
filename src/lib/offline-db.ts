import Dexie, { type Table } from 'dexie';

export interface POIRecord {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  description?: string;
  tags?: string[];
  trustScore?: number;
  lastUpdated?: string;
}

export interface CachedSearch {
  id?: number;
  query: string;
  results: string; // JSON stringified
  timestamp: number;
}

export interface OfflineMeta {
  key: string;
  value: string;
}

class OfflineDatabase extends Dexie {
  pois!: Table<POIRecord, string>;
  cachedSearches!: Table<CachedSearch, number>;
  meta!: Table<OfflineMeta, string>;

  constructor() {
    super('SearchPOIOffline');
    this.version(1).stores({
      pois: 'id, name, category, city, state, country, *tags',
      cachedSearches: '++id, query, timestamp',
      meta: 'key',
    });
  }
}

export const db = new OfflineDatabase();

/** Seed POI data from a JSON array */
export async function seedPOIData(data: POIRecord[]): Promise<number> {
  await db.pois.bulkPut(data);
  await db.meta.put({ key: 'lastSeedTime', value: new Date().toISOString() });
  await db.meta.put({ key: 'poiCount', value: String(data.length) });
  return data.length;
}

/** Check if DB has been seeded */
export async function isSeeded(): Promise<boolean> {
  const count = await db.pois.count();
  return count > 0;
}

/** Get seed metadata */
export async function getSeedInfo(): Promise<{ seeded: boolean; count: number; lastSeedTime: string | null }> {
  const count = await db.pois.count();
  const meta = await db.meta.get('lastSeedTime');
  return {
    seeded: count > 0,
    count,
    lastSeedTime: meta?.value ?? null,
  };
}

/** Search POIs locally using text matching */
export async function searchPOIsOffline(query: string, limit = 20): Promise<POIRecord[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const allPois = await db.pois.toArray();
  
  const scored = allPois
    .map((poi) => {
      let score = 0;
      const name = poi.name?.toLowerCase() ?? '';
      const cat = poi.category?.toLowerCase() ?? '';
      const city = poi.city?.toLowerCase() ?? '';
      const desc = poi.description?.toLowerCase() ?? '';
      const tags = poi.tags?.join(' ').toLowerCase() ?? '';

      if (name.includes(q)) score += 10;
      if (name.startsWith(q)) score += 5;
      if (cat.includes(q)) score += 6;
      if (city.includes(q)) score += 4;
      if (desc.includes(q)) score += 2;
      if (tags.includes(q)) score += 3;

      return { poi, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.poi);
}

/** Search POIs by proximity to a GPS coordinate */
export async function searchPOIsByLocation(lat: number, lon: number, radiusKm = 10, limit = 20): Promise<POIRecord[]> {
  const allPois = await db.pois.toArray();
  
  const withDist = allPois
    .map((poi) => {
      const dist = haversine(lat, lon, poi.lat, poi.lon);
      return { poi, dist };
    })
    .filter((p) => p.dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);

  return withDist.map((p) => p.poi);
}

/** Cache a search result for offline replay */
export async function cacheSearchResult(query: string, results: any): Promise<void> {
  await db.cachedSearches.put({
    query: query.toLowerCase(),
    results: JSON.stringify(results),
    timestamp: Date.now(),
  });
}

/** Retrieve cached search result */
export async function getCachedSearch(query: string): Promise<any | null> {
  const cached = await db.cachedSearches
    .where('query')
    .equals(query.toLowerCase())
    .last();
  if (!cached) return null;
  try {
    return JSON.parse(cached.results);
  } catch {
    return null;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
