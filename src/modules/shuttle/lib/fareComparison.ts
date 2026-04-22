/**
 * Fare Comparison Analysis: Legacy vs OSRM
 * 
 * This module compares the legacy (hardcoded distance) and 
 * OSRM-based (actual routing) fare calculation methods.
 */

import { calcFareBreakdown, type FareBreakdown } from "../data/services";
import { calcEnhancedFareBreakdown, type EnhancedFareBreakdown } from "./refinedFareCalculator";
import { SEED_RAYONS_PYUGO, type Rayon } from "../data/rayons";
import { VEHICLE_TYPES, SERVICES } from "../data/services";

export interface FareComparisonResult {
  rayonId: string;
  rayonName: string;
  pickupCode: string;
  pickupName: string;
  legacyDistanceKm: number;
  osrmDistanceKm: number;
  distanceDiffKm: number;
  distanceDiffPct: number;
  legacyFare: number;
  osrmFare: number;
  fareDiff: number;
  fareDiffPct: number;
  routingSource: string;
}

export interface ComparisonSummary {
  totalPoints: number;
  avgDistanceDiffPct: number;
  avgFareDiffPct: number;
  maxDistanceDiffPct: number;
  maxFareDiffPct: number;
  pointsWithSignificantDiff: number; // > 10% diff
  results: FareComparisonResult[];
}

/**
 * Compare legacy vs OSRM fares for all points in all seed rayons
 */
export async function runFareComparison(): Promise<ComparisonSummary> {
  const vehicle = VEHICLE_TYPES[0]; // HiAce
  const service = SERVICES[0]; // Reguler
  const results: FareComparisonResult[] = [];

  for (const rayon of SEED_RAYONS_PYUGO) {
    // Skip if no coordinates for OSRM
    const hasCoords = rayon.pickupPoints.some(p => p.lat && p.lng);
    if (!hasCoords) continue;

    for (const pickup of rayon.pickupPoints) {
      if (pickup.code === "DEST") continue;

      // Legacy
      const legacy = calcFareBreakdown(vehicle, service, rayon, pickup.code);
      
      // OSRM
      const osrm = await calcEnhancedFareBreakdown(vehicle, service, rayon, pickup.code, true);

      const distanceDiffKm = osrm.distanceKm - legacy.distanceKm;
      const distanceDiffPct = legacy.distanceKm > 0 ? (distanceDiffKm / legacy.distanceKm) * 100 : 0;
      const fareDiff = osrm.total - legacy.total;
      const fareDiffPct = legacy.total > 0 ? (fareDiff / legacy.total) * 100 : 0;

      results.push({
        rayonId: rayon.id,
        rayonName: rayon.name,
        pickupCode: pickup.code,
        pickupName: pickup.name,
        legacyDistanceKm: legacy.distanceKm,
        osrmDistanceKm: osrm.distanceKm,
        distanceDiffKm,
        distanceDiffPct,
        legacyFare: legacy.total,
        osrmFare: osrm.total,
        fareDiff,
        fareDiffPct,
        routingSource: osrm.routingSource
      });
    }
  }

  // Calculate summary stats
  const totalPoints = results.length;
  const avgDistanceDiffPct = results.reduce((sum, r) => sum + Math.abs(r.distanceDiffPct), 0) / totalPoints;
  const avgFareDiffPct = results.reduce((sum, r) => sum + Math.abs(r.fareDiffPct), 0) / totalPoints;
  
  const maxDistanceDiffPct = Math.max(...results.map(r => Math.abs(r.distanceDiffPct)));
  const maxFareDiffPct = Math.max(...results.map(r => Math.abs(r.fareDiffPct)));
  
  const pointsWithSignificantDiff = results.filter(r => Math.abs(r.fareDiffPct) > 10).length;

  return {
    totalPoints,
    avgDistanceDiffPct,
    avgFareDiffPct,
    maxDistanceDiffPct,
    maxFareDiffPct,
    pointsWithSignificantDiff,
    results
  };
}

/**
 * Format comparison results into a markdown table for documentation
 */
export function formatComparisonAsMarkdown(summary: ComparisonSummary): string {
  let md = "## Analysis: Legacy vs OSRM Fare Calculation\n\n";
  
  md += "### Summary Statistics\n";
  md += `- Total Points Tested: ${summary.totalPoints}\n`;
  md += `- Avg Distance Difference: ${summary.avgDistanceDiffPct.toFixed(2)}%\n`;
  md += `- Avg Fare Difference: ${summary.avgFareDiffPct.toFixed(2)}%\n`;
  md += `- Max Distance Difference: ${summary.maxDistanceDiffPct.toFixed(2)}%\n`;
  md += `- Max Fare Difference: ${summary.maxFareDiffPct.toFixed(2)}%\n`;
  md += `- Points with >10% Price Change: ${summary.pointsWithSignificantDiff}\n\n`;

  md += "### Detailed Comparison\n\n";
  md += "| Rayon | Pickup | Legacy Dist (km) | OSRM Dist (km) | Dist Diff % | Legacy Fare | OSRM Fare | Fare Diff % | Source |\n";
  md += "|-------|--------|------------------|----------------|-------------|-------------|-----------|-------------|--------|\n";

  for (const r of summary.results) {
    md += `| ${r.rayonName} | ${r.pickupName} | ${r.legacyDistanceKm.toFixed(2)} | ${r.osrmDistanceKm.toFixed(2)} | ${r.distanceDiffPct.toFixed(1)}% | Rp${r.legacyFare.toLocaleString()} | Rp${r.osrmFare.toLocaleString()} | ${r.fareDiffPct.toFixed(1)}% | ${r.routingSource} |\n`;
  }

  return md;
}
