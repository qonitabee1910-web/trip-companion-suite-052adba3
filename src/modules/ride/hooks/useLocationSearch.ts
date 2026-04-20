import { useState, useCallback, useEffect, useRef } from "react";
import {
  geocodeAutocomplete,
  forwardGeocode,
  reverseGeocode,
  type GeocodeResult,
} from "../services/geocodingService";
import { calculateDistance } from "../services/geocodingUtils";
import type { POI } from "../data/ride";

export interface SearchHistoryEntry {
  id: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
  count: number; // How many times searched
  category?: string; // "mall", "airport", "station", etc.
}

export interface SearchResultWithMetrics extends GeocodeResult {
  distance?: number; // Distance from reference point (if provided)
  category?: string;
  formattedAddress: string;
  popular?: boolean;
}

interface UseLocationSearchReturn {
  // Search state
  query: string;
  results: SearchResultWithMetrics[];
  loading: boolean;
  error: string | null;

  // Search functions
  search: (query: string) => void;
  selectResult: (result: SearchResultWithMetrics) => POI | null;
  clearSearch: () => void;

  // History
  searchHistory: SearchHistoryEntry[];
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;

  // Suggestions
  suggestions: SearchResultWithMetrics[];
  nearbyLocations: SearchResultWithMetrics[];

  // Cleanup
  cleanup: () => void;
}

/**
 * Hook for advanced location search with history and suggestions
 */
export function useLocationSearch(
  userLat?: number,
  userLng?: number
): UseLocationSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultWithMetrics[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResultWithMetrics[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<SearchResultWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  const debounceTimer = useRef<NodeJS.Timeout>();
  const searchHistoryKey = "locationSearchHistory";

  // Load search history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(searchHistoryKey);
    if (stored) {
      try {
        const history = JSON.parse(stored) as SearchHistoryEntry[];
        setSearchHistory(history);
        loadSuggestionsFromHistory(history);
      } catch (e) {
        console.error("Error loading search history:", e);
      }
    }

    // Load nearby locations if user location is provided
    if (userLat && userLng) {
      loadNearbyLocations(userLat, userLng);
    }
  }, []);

  /**
   * Load suggestions from frequently searched locations
   */
  const loadSuggestionsFromHistory = (history: SearchHistoryEntry[]) => {
    const sorted = [...history].sort((a, b) => b.count - a.count).slice(0, 5);
    const suggestionResults: SearchResultWithMetrics[] = sorted.map((entry) => ({
      name: entry.address.split(",")[0],
      address: entry.address,
      lat: entry.lat,
      lng: entry.lng,
      formattedAddress: entry.address,
      category: entry.category,
      popular: entry.count > 2,
    }));
    setSuggestions(suggestionResults);
  };

  /**
   * Load nearby popular locations based on user location
   */
  const loadNearbyLocations = async (lat: number, lng: number) => {
    try {
      // Popular searches in the area
      const popular = searchHistory
        .filter((entry) => calculateDistance(lat, lng, entry.lat, entry.lng) < 5) // Within 5km
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const nearby: SearchResultWithMetrics[] = popular.map((entry) => ({
        name: entry.address.split(",")[0],
        address: entry.address,
        lat: entry.lat,
        lng: entry.lng,
        formattedAddress: entry.address,
        distance: calculateDistance(lat, lng, entry.lat, entry.lng),
        category: entry.category,
      }));

      setNearbyLocations(nearby);
    } catch (error) {
      console.error("Error loading nearby locations:", error);
    }
  };

  /**
   * Detect location category from address
   */
  const detectCategory = (address: string): string => {
    const lowercased = address.toLowerCase();
    if (lowercased.includes("mall") || lowercased.includes("plaza")) return "mall";
    if (lowercased.includes("airport") || lowercased.includes("bandara")) return "airport";
    if (lowercased.includes("station") || lowercased.includes("stasiun")) return "station";
    if (lowercased.includes("hotel") || lowercased.includes("hostel")) return "hotel";
    if (lowercased.includes("university") || lowercased.includes("universitas")) return "university";
    if (lowercased.includes("hospital") || lowercased.includes("rumah sakit")) return "hospital";
    return "location";
  };

  /**
   * Add result to search history
   */
  const addToHistory = (result: SearchResultWithMetrics) => {
    const key = `${result.lat}-${result.lng}`;
    const existing = searchHistory.find((entry) => entry.id === key);

    let updated: SearchHistoryEntry[];
    if (existing) {
      // Increment count for existing entry
      updated = searchHistory.map((entry) =>
        entry.id === key
          ? { ...entry, timestamp: Date.now(), count: entry.count + 1 }
          : entry
      );
    } else {
      // Add new entry
      const category = result.category || detectCategory(result.address);
      updated = [
        {
          id: key,
          address: result.formattedAddress,
          lat: result.lat,
          lng: result.lng,
          timestamp: Date.now(),
          count: 1,
          category,
        },
        ...searchHistory,
      ].slice(0, 50); // Keep max 50 entries
    }

    setSearchHistory(updated);
    localStorage.setItem(searchHistoryKey, JSON.stringify(updated));
    loadSuggestionsFromHistory(updated);
  };

  /**
   * Perform location search
   */
  const search = useCallback(
    (query: string) => {
      setQuery(query);

      // Clear results if query is empty
      if (!query.trim()) {
        setResults([]);
        setError(null);
        return;
      }

      // Cancel previous search
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      setLoading(true);
      setError(null);

      // Debounce the actual search
      debounceTimer.current = setTimeout(async () => {
        try {
          // Use autocomplete for fast suggestions
          const geocodeResults = await geocodeAutocomplete(query);

          if (geocodeResults && geocodeResults.length > 0) {
            const enriched: SearchResultWithMetrics[] = geocodeResults.map((result) => ({
              ...result,
              formattedAddress: `${result.name}, ${result.address}`,
              category: detectCategory(result.address),
              distance: userLat && userLng ? calculateDistance(userLat, userLng, result.lat, result.lng) : undefined,
            }));

            setResults(enriched);
            setLoading(false);
          } else {
            setResults([]);
            setError("Lokasi tidak ditemukan. Coba cari dengan nama yang lebih spesifik.");
            setLoading(false);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Gagal mencari lokasi. Coba lagi."
          );
          setLoading(false);
        }
      }, 300); // 300ms debounce
    },
    [userLat, userLng]
  );

  /**
   * Convert search result to POI
   */
  const selectResult = useCallback(
    (result: SearchResultWithMetrics): POI | null => {
      try {
        const poi: POI = {
          name: result.name,
          lat: result.lat,
          lng: result.lng,
          area: result.address.split(",").slice(-2).join(",").trim(),
        };

        // Add to history
        addToHistory(result);

        // Clear search
        setQuery("");
        setResults([]);

        return poi;
      } catch (error) {
        console.error("Error selecting result:", error);
        return null;
      }
    },
    []
  );

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  /**
   * Clear search history
   */
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    setSuggestions([]);
    setNearbyLocations([]);
    localStorage.removeItem(searchHistoryKey);
  }, []);

  /**
   * Remove specific entry from history
   */
  const removeFromHistory = useCallback((id: string) => {
    const updated = searchHistory.filter((entry) => entry.id !== id);
    setSearchHistory(updated);
    localStorage.setItem(searchHistoryKey, JSON.stringify(updated));
    loadSuggestionsFromHistory(updated);
  }, [searchHistory]);

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  return {
    query,
    results,
    loading,
    error,
    search,
    selectResult,
    clearSearch,
    searchHistory,
    clearHistory,
    removeFromHistory,
    suggestions,
    nearbyLocations,
    cleanup,
  };
}
