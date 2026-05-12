const STORAGE_KEY = "searchpoi_context";
const MAX_HISTORY = 20;

export interface SearchHistoryItem {
  query: string;
  mode: string;
  timestamp: number;
}

export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSearchToHistory(query: string, mode: string) {
  const history = getSearchHistory();
  // Deduplicate
  const filtered = history.filter(
    (h) => h.query.toLowerCase() !== query.toLowerCase()
  );
  filtered.unshift({ query, mode, timestamp: Date.now() });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(filtered.slice(0, MAX_HISTORY))
  );
}

export function getRecentQueries(limit = 5): string[] {
  return getSearchHistory()
    .slice(0, limit)
    .map((h) => h.query);
}

export function clearSearchHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
