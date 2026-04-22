# OSRM Integration - Practical Code Changes

**Quick Reference**: Code snippets showing exact changes needed in existing
files

---

## 1. Update Environment Configuration

### File: `.env.example` or `.env.local`

```env
# OSRM Configuration
VITE_OSRM_ENABLED=false                          # Start with disabled
VITE_OSRM_ENDPOINT=https://router.project-osrm.org  # Public instance
# VITE_OSRM_ENDPOINT=http://localhost:5000        # Self-hosted (uncomment to use)
VITE_OSRM_FALLBACK=true                          # Fallback to Haversine on error
VITE_OSRM_CACHE_TTL_DAYS=7                       # Cache time-to-live

# Gradual rollout
VITE_OSRM_A_B_TEST=false                         # Enable A/B testing
VITE_OSRM_SAMPLE_RATE=0.1                        # 10% of users get OSRM
```

---

## 2. Update Rayon Data Structure

### File: `src/modules/shuttle/data/rayons.ts`

```typescript
// BEFORE:
export interface PickupPoint {
    code: string;
    name: string;
    time: string;
    distanceToNext: number; // hardcoded distance
    lat?: number;
    lng?: number;
}

export type Rayon = {
    id: string;
    name: string;
    fareBase: number;
    farePerKm: number;
    pickupPoints: PickupPoint[];
};

// AFTER:
export interface PickupPoint {
    code: string;
    name: string;
    time: string;

    // Original distance (hardcoded, kept for fallback)
    distanceToNext: number;

    // NEW: OSRM routing data
    routingDistance?: number; // actual distance in meters from OSRM
    routingDuration?: number; // duration in seconds from OSRM
    routingUpdatedAt?: number; // timestamp when last updated

    // Coordinates for routing
    lat?: number;
    lng?: number;
}

export type Rayon = {
    id: string;
    name: string;
    fareBase: number;
    farePerKm: number;
    pickupPoints: PickupPoint[];

    // NEW: Rayon-level routing metadata
    routingLastUpdate?: number; // when entire rayon was last synced
    routingDataQuality?: "exact" | "estimated" | "fallback";
};

// Example with OSRM data populated:
export const SEED_RAYONS_PYUGO = [
    {
        id: "A",
        name: "Rayon A - Pusat ke Bandara",
        fareBase: 80000,
        farePerKm: 12000,
        pickupPoints: [
            {
                code: "J1",
                name: "Hermes Palace",
                time: "06:00",
                distanceToNext: 700, // Original
                routingDistance: 895, // Updated from OSRM
                routingDuration: 45, // 45 seconds
                routingUpdatedAt: Date.now(),
                lat: 3.5752,
                lng: 98.6722,
            },
            {
                code: "J2",
                name: "Santika Hotel",
                time: "06:15",
                distanceToNext: 240, // Original
                routingDistance: 680, // Updated from OSRM
                routingDuration: 38,
                routingUpdatedAt: Date.now(),
                lat: 3.5840,
                lng: 98.6750,
            },
            // ... more points
        ],
        routingLastUpdate: Date.now(),
        routingDataQuality: "exact",
    },
    // ... more rayons
];
```

---

## 3. Update Fare Calculator Usage

### File: `src/modules/shuttle/components/FareBreakdownCard.tsx`

```typescript
// BEFORE:
import { calcFareBreakdown } from "../data/services";

export function FareBreakdownCard({ rayon, pickupCode, vehicle, service }) {
    const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);

    return (
        <Card>
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Jarak</span>
                    <span>{breakdown.distanceKm?.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{fmt(breakdown.total)}</span>
                </div>
            </CardContent>
        </Card>
    );
}

// AFTER:
import { calcFareBreakdownCompat } from "../lib/migrationHelper";
import { Skeleton } from "@/components/ui/skeleton";

export function FareBreakdownCard({ rayon, pickupCode, vehicle, service }) {
    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
            .then(setBreakdown)
            .catch((err) => {
                console.error("Fare calc error:", err);
                setError(err.message);
                // Fallback to legacy
                try {
                    const legacy = calcFareBreakdown(
                        vehicle,
                        service,
                        rayon,
                        pickupCode,
                    );
                    setBreakdown(legacy);
                } catch (e) {
                    setError("Failed to calculate fare");
                }
            })
            .finally(() => setLoading(false));
    }, [vehicle, service, rayon, pickupCode]);

    if (loading) {
        return (
            <Card>
                <CardContent className="space-y-2 pt-6">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !breakdown) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-red-600">
                        {error || "Tidak bisa menghitung tarif"}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Jarak</span>
                    <span>{breakdown.distanceKm?.toFixed(1)} km</span>
                </div>

                {/* NEW: Show time estimate if available */}
                {breakdown.estimatedDurationMin && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Estimasi Durasi
                        </span>
                        <span>±{breakdown.estimatedDurationMin} menit</span>
                    </div>
                )}

                <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{fmt(breakdown.total)}</span>
                </div>

                {/* NEW: Debug info for admin */}
                {process.env.NODE_ENV === "development" &&
                    breakdown.routingSource && (
                    <div className="text-[10px] text-muted-foreground/50 border-t pt-1">
                        Sumber: {breakdown.routingSource}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
```

---

## 4. Update Booking Page

### File: `src/modules/shuttle/pages/ShuttleBooking.tsx`

```typescript
// BEFORE:
import { calcFareBreakdown } from "../data/services";

export default function ShuttleBooking() {
    // ...
    const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);

    return (
        <div>
            <div>Harga: {fmt(breakdown.total)}</div>
            <div>Jarak: {breakdown.distanceKm?.toFixed(1)} km</div>
        </div>
    );
}

// AFTER:
import { calcFareBreakdownCompat } from "../lib/migrationHelper";
import { addMinutes, format, parse } from "date-fns";
import { id } from "date-fns/locale";

export default function ShuttleBooking() {
    const [breakdown, setBreakdown] = useState(null);
    const [estimatedArrival, setEstimatedArrival] = useState(null);

    useEffect(() => {
        calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
            .then((bd) => {
                setBreakdown(bd);

                // NEW: Calculate arrival time
                if (bd.estimatedDurationMin && departureTime) {
                    try {
                        const departure = parse(
                            departureTime,
                            "HH:mm",
                            new Date(),
                        );
                        const arrival = addMinutes(
                            departure,
                            bd.estimatedDurationMin,
                        );
                        setEstimatedArrival(
                            format(arrival, "HH:mm", { locale: id }),
                        );
                    } catch (e) {
                        console.warn("Could not calculate arrival time:", e);
                    }
                }
            })
            .catch(console.error);
    }, [vehicle, service, rayon, pickupCode, departureTime]);

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                    <span>Harga</span>
                    <span className="font-semibold">
                        {fmt(breakdown?.total)}
                    </span>
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Jarak</span>
                    <span>{breakdown?.distanceKm?.toFixed(1)} km</span>
                </div>

                {/* NEW: Departure and estimated arrival */}
                {departureTime && estimatedArrival && (
                    <>
                        <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between text-sm">
                                <span>Berangkat</span>
                                <span>{departureTime}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Tiba (Estimasi)</span>
                                <span className="font-medium">
                                    {estimatedArrival}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Booking button, etc */}
        </div>
    );
}
```

---

## 5. Create Migration Script

### File: `scripts/migrate-osrm-distances.ts`

```typescript
/**
 * Migration script: Populate OSRM distances for all rayons
 * Run once: npx ts-node scripts/migrate-osrm-distances.ts
 */

import { updateRayonDistances } from "../src/modules/shuttle/lib/osrmRouting";
import { SEED_RAYONS_PYUGO } from "../src/modules/shuttle/data/rayons";

const BATCH_DELAY = 1000; // Delay between rayons (be nice to OSRM API)

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrateRayons() {
    console.log("🚀 Starting OSRM distance migration...\n");

    const results = [];

    for (const rayon of SEED_RAYONS_PYUGO) {
        console.log(`📍 Processing ${rayon.id} - ${rayon.name}...`);

        try {
            const updatedPoints = await updateRayonDistances(
                rayon.pickupPoints || [],
            );

            if (!updatedPoints || updatedPoints.length === 0) {
                console.log(`  ⚠️  No points to update`);
                results.push({ rayonId: rayon.id, status: "skipped" });
                continue;
            }

            // Calculate totals
            const totalOriginal = updatedPoints.reduce(
                (sum, p) => sum + (p.distanceToNext || 0),
                0,
            );
            const totalRouting = updatedPoints.reduce(
                (sum, p) => sum + (p.routingDistance || p.distanceToNext || 0),
                0,
            );
            const difference = totalRouting - totalOriginal;
            const pct = ((difference / totalOriginal) * 100).toFixed(1);

            console.log(`  ✓ Updated ${updatedPoints.length} points`);
            console.log(
                `  📏 Original: ${(totalOriginal / 1000).toFixed(1)} km`,
            );
            console.log(
                `  📏 Routing:  ${(totalRouting / 1000).toFixed(1)} km`,
            );
            console.log(`  📊 Diff:     ${pct}%\n`);

            results.push({
                rayonId: rayon.id,
                status: "ok",
                pointsUpdated: updatedPoints.length,
                totalDistance: totalRouting,
                difference: pct,
            });

            // TODO: Save to database
            // await db.rayons.update(rayon.id, { pickupPoints: updatedPoints });

            // Be nice to API
            await sleep(BATCH_DELAY);
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}\n`);
            results.push({
                rayonId: rayon.id,
                status: "error",
                error: error.message,
            });
        }
    }

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log("====================");
    const successful = results.filter((r) => r.status === "ok").length;
    const failed = results.filter((r) => r.status === "error").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    console.log(`✓ Successful: ${successful}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`⊘ Skipped: ${skipped}`);
    console.log(`Total: ${results.length}\n`);

    // Show any errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
        console.log("Errors:");
        errors.forEach((err) => {
            console.log(`  - ${err.rayonId}: ${err.error}`);
        });
    }

    console.log("\n✅ Migration complete! Don't forget to:");
    console.log("  1. Save updated rayons to database");
    console.log("  2. Test fare calculations");
    console.log("  3. Update FareBreakdownCard component");
}

migrateRayons().catch(console.error);
```

---

## 6. Create Admin Audit Page

### File: `src/modules/shuttle/pages/AdminFareAudit.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    auditFareDifferences,
    debugRayonRouting,
    getCalculationStats,
} from "../lib/migrationHelper";
import { SEED_RAYONS_PYUGO } from "../data/rayons";

export function AdminFareAudit() {
    const [audits, setAudits] = useState<Record<string, any[]>>({});
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [debugRayons, setDebugRayons] = useState<Record<string, any>>({});

    async function runAudit() {
        setLoading(true);
        const newAudits = {};

        for (const rayon of SEED_RAYONS_PYUGO) {
            try {
                const results = await auditFareDifferences(
                    rayon.id,
                    "van", // vehicle
                    "reguler", // service
                );
                newAudits[rayon.id] = results;

                // Debug info
                const debug = debugRayonRouting(rayon);
                setDebugRayons((prev) => ({ ...prev, [rayon.id]: debug }));
            } catch (error) {
                console.error(`Audit failed for ${rayon.id}:`, error);
                newAudits[rayon.id] = [];
            }
        }

        setAudits(newAudits);
        setStats(getCalculationStats());
        setLoading(false);
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">
                    Fare Calculation Audit
                </h1>
                <p className="text-muted-foreground">
                    Compare legacy hardcoded fares with OSRM-based fares
                </p>
            </div>

            <Button onClick={runAudit} disabled={loading} size="lg">
                {loading ? "Running audit..." : "Run Fare Audit"}
            </Button>

            {stats && (
                <Card className="bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            OSRM Integration Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.osrmPercentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                                OSRM + Cached
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.total}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Total Calculations
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.osrmCount}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Fresh OSRM
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.cachedCount}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                From Cache
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.fallbackCount}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Fallback (Haversine)
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.errorCount}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Errors
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {Object.entries(audits).map(([rayonId, rows]) => (
                <Card key={rayonId}>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            {rayonId}
                            <Badge variant="outline">{rows.length} stops</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {debugRayons[rayonId] && (
                            <div className="text-xs text-muted-foreground mb-3 p-2 bg-gray-50 rounded">
                                <div>
                                    📍 Points with coords:{" "}
                                    {debugRayons[rayonId]
                                        .pointsWithCoordinates}/{debugRayons[
                                            rayonId
                                        ].totalPoints}
                                </div>
                                <div>
                                    📡 Points with routing:{" "}
                                    {debugRayons[rayonId]
                                        .pointsWithRouting}/{debugRayons[
                                            rayonId
                                        ].totalPoints}
                                </div>
                                <div>
                                    ⏱️ Last sync:{" "}
                                    {debugRayons[rayonId].lastSyncAge}
                                </div>
                            </div>
                        )}

                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Pickup</th>
                                    <th className="text-right">Legacy</th>
                                    <th className="text-right">OSRM</th>
                                    <th className="text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={row.pickupCode}
                                        className="border-b hover:bg-gray-50"
                                    >
                                        <td className="py-2">
                                            {row.pickupCode} - {row.pickupName}
                                        </td>
                                        <td className="text-right">
                                            {fmt(row.legacyPrice)}
                                        </td>
                                        <td className="text-right font-medium">
                                            {fmt(row.osrmPrice)}
                                        </td>
                                        <td
                                            className={`text-right font-semibold ${
                                                row.percentDiff > 0
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }`}
                                        >
                                            {row.percentDiff > 0 ? "+" : ""}
                                            {row.percentDiff.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
```

---

## 7. Update Type Definitions

### File: `src/modules/shuttle/lib/refinedFareCalculator.ts` (Type exports)

```typescript
// Export types for other modules
export interface EnhancedFareBreakdown {
    total: number;
    baseFare: number;
    distanceKm: number;
    distanceFare: number;
    serviceMultiplier: number;
    surcharge: number;

    // NEW fields
    estimatedDurationMin: number;
    routingSource: "osrm" | "cached" | "fallback";
    distanceM: number;
}

export interface RefinedPickupPoint extends PickupPoint {
    routingDistance?: number;
    routingDuration?: number;
    routingUpdatedAt?: number;
}

export interface RefinedRayon extends Rayon {
    routingLastUpdate?: number;
    routingDataQuality?: "exact" | "estimated" | "fallback";
}
```

---

## 8. Verify Import Paths

### File: `src/modules/shuttle/index.ts`

```typescript
// Make sure new modules are exported
export {
    calcEnhancedFareBreakdown,
    type EnhancedFareBreakdown,
    getRemainingDistance,
    type RefinedRayon,
    syncRayonWithOSRM,
} from "./lib/refinedFareCalculator";

export {
    clearRouteCache,
    getCacheStats,
    getRouteDistance,
    getRouteMatrix,
} from "./lib/osrmRouting";

export {
    auditFareDifferences,
    calcFareBreakdownCompat,
    debugRayonRouting,
} from "./lib/migrationHelper";
```

---

## Summary of Changes

| File                        | Type        | Change                                   |
| --------------------------- | ----------- | ---------------------------------------- |
| `.env.local`                | Config      | Add OSRM env vars                        |
| `rayons.ts`                 | Type Update | Add routing fields to PickupPoint        |
| `FareBreakdownCard.tsx`     | Component   | Add async loading, time estimate display |
| `ShuttleBooking.tsx`        | Component   | Use async fare calc, show arrival time   |
| `migrationHelper.ts`        | New File    | ✅ Already created                       |
| `osrmRouting.ts`            | New File    | ✅ Already created                       |
| `refinedFareCalculator.ts`  | New File    | ✅ Already created                       |
| `migrate-osrm-distances.ts` | Script      | Create for data migration                |
| `AdminFareAudit.tsx`        | New Page    | Create for testing/verification          |

**Total new files**: 3 (already created) **Files to modify**: 5 **Scripts to
create**: 1 **Estimated effort**: 8-10 hours for experienced dev
