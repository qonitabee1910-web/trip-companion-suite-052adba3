import React from "react";
import {
  MapPin,
  Clock,
  Zap,
  Building2,
  Plane,
  Train,
  School,
  Heart,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SearchResultWithMetrics } from "../hooks/useLocationSearch";

interface SearchResultCardProps {
  result: SearchResultWithMetrics;
  onClick?: () => void;
  showDistance?: boolean;
  showCategory?: boolean;
  popular?: boolean;
  isRecent?: boolean;
  className?: string;
}

/**
 * Display search result with distance, category, and metadata
 */
export const SearchResultCard = React.forwardRef<HTMLButtonElement, SearchResultCardProps>(
  (
    {
      result,
      onClick,
      showDistance = true,
      showCategory = true,
      popular = false,
      isRecent = false,
      className = "",
    },
    ref
  ) => {
    const categoryIcon = getCategoryIcon(result.category);
    const distanceText = result.distance
      ? `${result.distance < 1 ? (result.distance * 1000).toFixed(0) + "m" : result.distance.toFixed(1) + "km"}`
      : null;

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left group ${className}`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-0.5">
          {categoryIcon}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium text-sm truncate">{result.name}</p>
            {popular && (
              <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title="Popular" />
            )}
            {isRecent && (
              <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" title="Recent" />
            )}
          </div>

          {/* Address */}
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
            {result.formattedAddress}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge */}
            {showCategory && result.category && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0"
              >
                {formatCategory(result.category)}
              </Badge>
            )}

            {/* Distance Badge */}
            {showDistance && distanceText && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 text-muted-foreground"
              >
                {distanceText}
              </Badge>
            )}
          </div>
        </div>

        {/* Chevron Indicator */}
        <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  }
);

SearchResultCard.displayName = "SearchResultCard";

/**
 * Get appropriate icon for location category
 */
function getCategoryIcon(category?: string): React.ReactNode {
  switch (category?.toLowerCase()) {
    case "mall":
      return <Building2 className="h-5 w-5" />;
    case "airport":
      return <Plane className="h-5 w-5" />;
    case "station":
      return <Train className="h-5 w-5" />;
    case "university":
      return <School className="h-5 w-5" />;
    case "hotel":
      return <Heart className="h-5 w-5" />;
    case "hospital":
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <MapPin className="h-5 w-5" />;
  }
}

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  switch (category?.toLowerCase()) {
    case "mall":
      return "Mall";
    case "airport":
      return "Bandara";
    case "station":
      return "Stasiun";
    case "university":
      return "Universitas";
    case "hotel":
      return "Hotel";
    case "hospital":
      return "Rumah Sakit";
    default:
      return capitalize(category);
  }
}

/**
 * Search Results List Container
 */
export const SearchResultsList = React.forwardRef<
  HTMLDivElement,
  {
    results: SearchResultWithMetrics[];
    loading?: boolean;
    error?: string | null;
    onResultSelect?: (result: SearchResultWithMetrics) => void;
    showDistance?: boolean;
    showCategory?: boolean;
    emptyMessage?: string;
    maxResults?: number;
  }
>(
  (
    {
      results,
      loading = false,
      error = null,
      onResultSelect,
      showDistance = true,
      showCategory = true,
      emptyMessage = "Tidak ada hasil pencarian",
      maxResults,
    },
    ref
  ) => {
    const displayResults = maxResults ? results.slice(0, maxResults) : results;

    if (error) {
      return (
        <div ref={ref} className="p-4 text-center border-b">
          <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div ref={ref} className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Mencari lokasi...</p>
        </div>
      );
    }

    if (!displayResults || displayResults.length === 0) {
      return (
        <div ref={ref} className="p-4 text-center text-muted-foreground">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-2">
        {displayResults.map((result, idx) => (
          <SearchResultCard
            key={`result-${idx}`}
            result={result}
            onClick={() => onResultSelect?.(result)}
            showDistance={showDistance}
            showCategory={showCategory}
            popular={result.popular}
          />
        ))}
      </div>
    );
  }
);

SearchResultsList.displayName = "SearchResultsList";

/**
 * Quick suggestion chips
 */
export const SearchSuggestionChips = React.forwardRef<
  HTMLDivElement,
  {
    suggestions: SearchResultWithMetrics[];
    onSelect?: (suggestion: SearchResultWithMetrics) => void;
    maxSuggestions?: number;
  }
>(({ suggestions, onSelect, maxSuggestions = 6 }, ref) => {
  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  if (!displaySuggestions || displaySuggestions.length === 0) return null;

  return (
    <div ref={ref} className="flex flex-wrap gap-2">
      {displaySuggestions.map((suggestion, idx) => (
        <button
          key={`chip-${idx}`}
          onClick={() => onSelect?.(suggestion)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-colors"
        >
          <MapPin className="h-3 w-3" />
          <span className="truncate">{suggestion.name}</span>
        </button>
      ))}
    </div>
  );
});

SearchSuggestionChips.displayName = "SearchSuggestionChips";
