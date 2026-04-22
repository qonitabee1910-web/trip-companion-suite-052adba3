import { describe, it, expect, beforeAll, vi, afterAll } from "vitest";
import { runFareComparison, formatComparisonAsMarkdown } from "../fareComparison";
import { clearRouteCache } from "../osrmRouting";

describe("Fare Comparison Analysis", () => {
  beforeAll(() => {
    clearRouteCache();
    // Mock fetch for OSRM calls to ensure deterministic results in test
    vi.stubGlobal("fetch", vi.fn(async (urlStr: string) => {
      const url = new URL(urlStr);
      if (url.pathname.includes("/route/v1/driving")) {
        // Return 10% more distance than legacy to simulate real-world routing
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            routes: [{ distance: 5000, duration: 300 }], // 5km
          }),
        };
      }
      if (url.pathname.includes("/table/v1/driving")) {
        const coords = url.searchParams.get("coordinates")?.split(";") || [];
        const n = coords.length;
        // Mock matrix with consistent 1km between points
        const distances = Array(n).fill(0).map((_, i) => 
          Array(n).fill(0).map((_, j) => Math.abs(i - j) * 1000)
        );
        return {
          ok: true,
          json: async () => ({
            code: "Ok",
            distances,
          }),
        };
      }
      return { ok: false, statusText: "Not Found" };
    }));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("should complete fare comparison across multiple rayons", async () => {
    const summary = await runFareComparison();

    expect(summary.totalPoints).toBeGreaterThan(0);
    expect(summary.results.length).toBe(summary.totalPoints);
    
    // Check first result structure
    const first = summary.results[0];
    expect(first.legacyFare).toBeGreaterThan(0);
    expect(first.osrmFare).toBeGreaterThan(0);
    expect(first.routingSource).toBeDefined();
  });

  it("should generate valid markdown documentation", async () => {
    const summary = await runFareComparison();
    const markdown = formatComparisonAsMarkdown(summary);

    expect(markdown).toContain("Analysis: Legacy vs OSRM Fare Calculation");
    expect(markdown).toContain("| Rayon | Pickup |");
    expect(markdown).toContain("Summary Statistics");
    
    // Log for report generation
    console.log("MARKDOWN_START");
    console.log(markdown);
    console.log("MARKDOWN_END");
  });

  it("should handle routing failures by falling back to legacy", async () => {
    // Force fetch failure
    vi.stubGlobal("fetch", vi.fn(async () => {
        throw new Error("Network Error");
    }));
    
    const summary = await runFareComparison();
    
    // All results should have 'fallback' as source
    const fallbackResults = summary.results.filter(r => r.routingSource === "fallback");
    expect(fallbackResults.length).toBeGreaterThan(0);
    
    // In fallback mode, OSRM distance should equal legacy distance
    for (const r of fallbackResults) {
        const diff = Math.abs(r.osrmDistanceKm - r.legacyDistanceKm);
        if (diff >= 0.1) {
            console.log(`Fallback mismatch for ${r.rayonName} - ${r.pickupName}: OSRM=${r.osrmDistanceKm}, Legacy=${r.legacyDistanceKm}, Diff=${diff}`);
        }
        expect(diff).toBeLessThan(0.1);
    }
  });
});
