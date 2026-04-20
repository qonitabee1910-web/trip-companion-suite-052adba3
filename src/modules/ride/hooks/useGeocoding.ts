import { useState, useCallback, useRef } from "react";
import {
  reverseGeocode,
  forwardGeocode,
  geocodeAutocomplete,
  getDetailedLocation,
  type GeocodeResult,
  type ReverseGeocodeResult,
} from "../services/geocodingService";

export interface UseGeocodeState {
  loading: boolean;
  error: string | null;
  results: GeocodeResult[] | null;
}

/**
 * Hook for reverse geocoding (coordinates to address)
 */
export function useReverseGeocode() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    result: ReverseGeocodeResult | null;
  }>({
    loading: false,
    error: null,
    result: null,
  });

  const geocode = useCallback(async (lat: number, lng: number) => {
    setState({ loading: true, error: null, result: null });

    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setState({ loading: false, error: null, result });
      } else {
        setState({
          loading: false,
          error: "Tidak dapat menemukan alamat untuk koordinat ini",
          result: null,
        });
      }
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Geocoding error",
        result: null,
      });
    }
  }, []);

  return { ...state, geocode };
}

/**
 * Hook for forward geocoding (address to coordinates)
 */
export function useForwardGeocode() {
  const [state, setState] = useState<UseGeocodeState>({
    loading: false,
    error: null,
    results: null,
  });

  const geocode = useCallback(async (address: string) => {
    if (!address.trim()) {
      setState({ loading: false, error: null, results: null });
      return;
    }

    setState({ loading: true, error: null, results: null });

    try {
      const results = await forwardGeocode(address);
      if (results && results.length > 0) {
        setState({ loading: false, error: null, results });
      } else {
        setState({
          loading: false,
          error: "Alamat tidak ditemukan",
          results: null,
        });
      }
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Geocoding error",
        results: null,
      });
    }
  }, []);

  return { ...state, geocode };
}

/**
 * Hook for geocoding autocomplete
 * Debounced to avoid excessive API calls
 */
export function useGeocodeAutocomplete(debounceMs = 300) {
  const [state, setState] = useState<UseGeocodeState>({
    loading: false,
    error: null,
    results: null,
  });

  const debounceTimer = useRef<NodeJS.Timeout>();

  const search = useCallback(
    (query: string) => {
      // Clear previous timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Clear results if query is empty
      if (!query.trim()) {
        setState({ loading: false, error: null, results: null });
        return;
      }

      setState({ loading: true, error: null, results: null });

      // Set new debounce timer
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await geocodeAutocomplete(query);
          if (results) {
            setState({ loading: false, error: null, results });
          } else {
            setState({ loading: false, error: null, results: null });
          }
        } catch (error) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Autocomplete error",
            results: null,
          });
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  // Cleanup timer on unmount
  const cleanup = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  return { ...state, search, cleanup };
}

/**
 * Hook for getting detailed location information
 */
export function useDetailedLocation() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    location: {
      address: string;
      landmark?: string;
      neighborhood?: string;
      city?: string;
    } | null;
  }>({
    loading: false,
    error: null,
    location: null,
  });

  const fetchLocation = useCallback(async (lat: number, lng: number) => {
    setState({ loading: true, error: null, location: null });

    try {
      const location = await getDetailedLocation(lat, lng);
      if (location) {
        setState({ loading: false, error: null, location });
      } else {
        setState({
          loading: false,
          error: "Tidak dapat mendapatkan informasi lokasi",
          location: null,
        });
      }
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Location error",
        location: null,
      });
    }
  }, []);

  return { ...state, fetchLocation };
}
