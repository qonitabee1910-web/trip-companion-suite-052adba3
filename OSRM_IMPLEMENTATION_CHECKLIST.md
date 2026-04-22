# OSRM Integration - Implementation Checklist

**Status**: 🟡 Ready for Implementation\
**Timeline**: 2-3 weeks\
**Difficulty**: Medium

---

## 📋 Pre-Implementation Checklist

### Understanding Current System

- [ ] Read [SHUTTLE_FARE_REFINEMENT.md](./SHUTTLE_FARE_REFINEMENT.md)
- [ ] Review `src/modules/shuttle/data/services.ts` - fare formula
- [ ] Review `src/modules/shuttle/data/rayons.ts` - pickup points structure
- [ ] Understand haversine vs actual routing difference (~15-20%)

### Environment Setup

- [ ] Verify OSRM endpoint accessibility (public or plan self-hosted)
- [ ] Test curl request:
  ```bash
  curl "https://router.project-osrm.org/route/v1/driving/98.6722,3.5752;98.6850,3.5840"
  # Expected: 200 OK with route data
  ```
- [ ] Decide: Public OSRM or self-hosted for production
- [ ] Setup environment variables

---

## 🔧 Implementation Steps

### Step 1: Enable Feature Flag (Day 1)

**File**: `.env.local` or `.env.production`

```env
VITE_OSRM_ENABLED=false  # Start disabled
VITE_OSRM_FALLBACK=true  # Safe mode - fallback on error
```

**Verify**: No existing functionality breaks when flag is off

### Step 2: Deploy New Modules (Day 1-2)

**Files to add**:

1. ✅ `src/modules/shuttle/lib/osrmRouting.ts` - Already created
2. ✅ `src/modules/shuttle/lib/refinedFareCalculator.ts` - Already created
3. ✅ `src/modules/shuttle/lib/migrationHelper.ts` - Already created

**Actions**:

```bash
# Verify imports work
npm run type-check

# Build should succeed
npm run build

# No runtime errors
npm run dev
```

### Step 3: Add Routing Data to Rayons (Day 2-3)

**Update interface** - `src/modules/shuttle/data/rayons.ts`

```typescript
export interface PickupPoint {
    code: string;
    name: string;
    time: string;
    distanceToNext: number; // Keep existing

    // NEW: OSRM routing data
    routingDistance?: number; // meters
    routingDuration?: number; // seconds
    routingUpdatedAt?: number; // timestamp

    lat?: number;
    lng?: number;
}
```

**Populate distances** - Run migration script

```typescript
// scripts/migrate-osrm-distances.ts
import { updateRayonDistances } from "../src/modules/shuttle/lib/osrmRouting";
import { SEED_RAYONS_PYUGO } from "../src/modules/shuttle/data/rayons";

async function main() {
    console.log("Migrating rayon distances to OSRM...");

    for (const rayon of SEED_RAYONS_PYUGO) {
        console.log(`Processing ${rayon.id}...`);
        const updated = await updateRayonDistances(rayon.pickupPoints);

        // Log results
        const totalDist = updated.reduce(
            (sum, p) => sum + (p.distanceToNext || 0),
            0,
        );
        console.log(`  ✓ Total distance: ${(totalDist / 1000).toFixed(1)} km`);

        // TODO: Save updated rayon to database or replace in seed
    }

    console.log("Migration complete!");
}

main().catch(console.error);
```

**Run migration**:

```bash
npx ts-node scripts/migrate-osrm-distances.ts
```

**Output example**:

```
Processing A...
  ✓ Total distance: 18.5 km
Processing B...
  ✓ Total distance: 22.1 km
...
Migration complete!
```

### Step 4: Create Test Cases (Day 3)

**File**: `src/modules/shuttle/lib/__tests__/osrmRouting.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    clearRouteCache,
    getRouteCacheStats,
    getRouteDistance,
    getRouteMatrix,
} from "../osrmRouting";

describe("osrmRouting", () => {
    beforeAll(() => {
        clearRouteCache();
    });

    afterAll(() => {
        clearRouteCache();
    });

    it("should fetch route distance", async () => {
        const route = await getRouteDistance(3.5752, 98.6722, 3.5840, 98.6750);
        expect(route.distance).toBeGreaterThan(0);
        expect(route.duration).toBeGreaterThan(0);
    });

    it("should cache results", async () => {
        const route1 = await getRouteDistance(3.5752, 98.6722, 3.5840, 98.6750);
        const stats1 = getRouteCacheStats();

        const route2 = await getRouteDistance(3.5752, 98.6722, 3.5840, 98.6750);

        expect(route1).toEqual(route2);
        expect(stats1.size).toBeGreaterThan(0);
    });

    it("should fallback on coordinate-less points", async () => {
        const route = await getRouteDistance(0, 0, 0, 0);
        expect(route.distance).toBeGreaterThanOrEqual(0);
    });

    it("should calculate matrix distances", async () => {
        const coordinates: [number, number][] = [
            [3.5752, 98.6722],
            [3.5840, 98.6750],
            [3.6000, 98.6900],
        ];

        const matrix = await getRouteMatrix(coordinates);
        expect(matrix).toHaveLength(3);
        expect(matrix[0]).toHaveLength(3);
        expect(matrix[0][0]).toBe(0); // Same point
        expect(matrix[0][1]).toBeGreaterThan(0);
    });
});
```

**File**: `src/modules/shuttle/lib/__tests__/refinedFareCalculator.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import {
    calcEnhancedFareBreakdown,
    calculateRayonDistance,
} from "../refinedFareCalculator";

describe("refinedFareCalculator", () => {
    it("should calculate enhanced fare breakdown", async () => {
        const breakdown = await calcEnhancedFareBreakdown(
            vehicleDefault,
            serviceRegular,
            rayonA,
            "J1",
            false, // Use cached, not real OSRM for test
        );

        expect(breakdown.total).toBeGreaterThan(0);
        expect(breakdown.distanceKm).toBeGreaterThan(0);
        expect(breakdown.estimatedDurationMin).toBeGreaterThan(0);
    });

    it("should calculate rayon distance", async () => {
        const result = await calculateRayonDistance(rayonA);

        expect(result.totalDistanceM).toBeGreaterThan(0);
        expect(result.estimatedMinutes).toBeGreaterThan(0);
        expect(result.pointsWithDistance).toHaveLength(
            rayonA.pickupPoints.length,
        );
    });
});
```

**Run tests**:

```bash
npm run test -- osrmRouting.test.ts
npm run test -- refinedFareCalculator.test.ts
```

### Step 5: Update Components (Day 4-5)

**File**: `src/modules/shuttle/components/FareBreakdownCard.tsx`

```typescript
// BEFORE:
export function FareBreakdownCard(props) {
    const breakdown = calcFareBreakdown(vehicle, service, rayon, pickupCode);
    return <div>{breakdown.total}</div>;
}

// AFTER:
import { calcFareBreakdownCompat } from "../lib/migrationHelper";

export function FareBreakdownCard(props) {
    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
            .then(setBreakdown)
            .catch((err) => {
                console.error("Fare calculation failed:", err);
                setBreakdown(
                    calcFareBreakdown(vehicle, service, rayon, pickupCode),
                );
            })
            .finally(() => setLoading(false));
    }, [vehicle, service, rayon, pickupCode]);

    if (loading) return <Skeleton />;
    if (!breakdown) return null;

    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                <span>{breakdown.distanceKm?.toFixed(1)} km</span>
                <span className="font-semibold">{fmt(breakdown.total)}</span>
            </div>
            {breakdown.estimatedDurationMin && (
                <div className="text-xs text-muted-foreground">
                    Estimasi ±{breakdown.estimatedDurationMin} menit
                </div>
            )}
            {breakdown.routingSource && (
                <div className="text-[10px] text-muted-foreground/50">
                    Sumber: {breakdown.routingSource}
                </div>
            )}
        </div>
    );
}
```

**File**: `src/modules/shuttle/pages/ShuttleBooking.tsx`

```typescript
import { calcFareBreakdownCompat } from "../lib/migrationHelper";

export default function ShuttleBooking() {
    const [breakdown, setBreakdown] = useState(null);

    useEffect(() => {
        calcFareBreakdownCompat(vehicle, service, rayon, pickupCode)
            .then(setBreakdown);
    }, [vehicle, service, rayon, pickupCode]);

    // Use breakdown.estimatedDurationMin if available
    const arrivalTime = breakdown?.estimatedDurationMin
        ? addMinutes(parse(time), breakdown.estimatedDurationMin)
        : "...";
}
```

### Step 6: A/B Testing (Day 5-6)

**Enable on dev environment only**:

```env
# .env.development
VITE_OSRM_ENABLED=true
VITE_OSRM_FALLBACK=true
```

**Create test page**: `src/modules/shuttle/pages/AdminFareAudit.tsx`

```typescript
import {
    auditFareDifferences,
    getCalculationStats,
} from "../lib/migrationHelper";

export function AdminFareAudit() {
    const [audit, setAudit] = useState([]);
    const [stats, setStats] = useState(null);

    async function runAudit() {
        const results = await auditFareDifferences("A", "van", "reguler");
        setAudit(results);
        setStats(getCalculationStats());
    }

    return (
        <div className="p-4 space-y-4">
            <button onClick={runAudit}>Run Fare Audit</button>

            {stats && (
                <div className="bg-blue-50 p-3 rounded">
                    <p>OSRM Usage: {stats.osrmPercentage.toFixed(1)}%</p>
                    <p>
                        OSRM: {stats.osrmCount} | Cached: {stats.cachedCount}
                        {" "}
                        | Fallback: {stats.fallbackCount}
                    </p>
                </div>
            )}

            <table className="w-full text-sm">
                <thead>
                    <tr>
                        <th>Pickup</th>
                        <th>Legacy</th>
                        <th>OSRM</th>
                        <th>Diff %</th>
                    </tr>
                </thead>
                <tbody>
                    {audit.map((row) => (
                        <tr key={row.pickupCode}>
                            <td>{row.pickupCode} - {row.pickupName}</td>
                            <td>{fmt(row.legacyPrice)}</td>
                            <td>{fmt(row.osrmPrice)}</td>
                            <td
                                className={row.percentDiff > 0
                                    ? "text-red-600"
                                    : "text-green-600"}
                            >
                                {row.percentDiff > 0 ? "+" : ""}
                                {row.percentDiff.toFixed(2)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

**Test results**:

```
Pickup       Legacy    OSRM      Diff %
J1-Hermes    145,000   148,000   +2.07%
J2-Santika   168,000   172,000   +2.38%
J3-Arya      195,000   198,000   +1.54%
```

### Step 7: Gradual Rollout (Day 6-8)

**Phase 1**: Internal testing (QA team)

```env
VITE_OSRM_ENABLED=true
VITE_OSRM_FALLBACK=true
```

**Phase 2**: Beta users (10%)

```bash
# Deploy with flag off, enable via feature manager
# Log all A/B test results
```

**Phase 3**: Full rollout (100%)

```env
VITE_OSRM_ENABLED=true
VITE_OSRM_FALLBACK=true
```

### Step 8: Production Sync Job (Day 9-10)

**File**: `src/modules/shuttle/services/routingSync.ts`

```typescript
import { syncRayonWithOSRM } from "../lib/refinedFareCalculator";
import { getRayons } from "../data/repository";

export async function syncAllRayonsDaily() {
    const rayons = getRayons();
    const results = [];

    for (const rayon of rayons) {
        try {
            const updated = await syncRayonWithOSRM(rayon as any);
            results.push({ rayonId: rayon.id, status: "ok" });
            // TODO: Save to database
        } catch (error) {
            results.push({
                rayonId: rayon.id,
                status: "error",
                error: error.message,
            });
        }
    }

    return results;
}
```

**Deploy as Cloud Function**:

```bash
gcloud functions deploy syncShuttleRouting \
  --runtime nodejs18 \
  --trigger-topic shuttle-sync \
  --timeout 540
```

---

## ✅ Verification Checklist

### After Each Step

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Builds successfully (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] No console errors (dev tools)
- [ ] Fare display shows correctly (UI)

### Before Rollout

- [ ] All rayon distances updated with OSRM
- [ ] A/B test shows <3% difference in most cases
- [ ] Cache hit rate >95%
- [ ] No OSRM API errors in logs
- [ ] Fallback works when OSRM unavailable
- [ ] Monitoring dashboards setup

### Post-Launch

- [ ] Customer complaints about fares = 0
- [ ] Booking rate unchanged
- [ ] OSRM API usage within limits
- [ ] Cache effectiveness >95%
- [ ] Daily sync job running successfully

---

## 🐛 Troubleshooting

| Issue                               | Solution                                           |
| ----------------------------------- | -------------------------------------------------- |
| **OSRM returns 429 (rate limited)** | Use self-hosted or upgrade OSRM service            |
| **Cache hit rate low**              | Check TTL setting, might be too short              |
| **Fare variance >5%**               | Verify coordinate accuracy, check for road changes |
| **Slow response**                   | Use matrix query instead of individual requests    |
| **Coordinates missing**             | Add lat/lng to pickup points or geocode manually   |

---

## 📞 Support

- OSRM Issues: https://github.com/Project-OSRM/osrm-backend/issues
- Questions: Check `SHUTTLE_FARE_REFINEMENT.md` for detailed explanation
- Monitoring: Check `AdminFareAudit` page in dev environment

---

## 🎉 Success Indicators

✅ Fares now based on real routing distances\
✅ A/B test shows <3% average difference\
✅ Cache hit rate >95%\
✅ Time estimates accurate ±5 minutes\
✅ Zero customer complaints\
✅ Daily sync job running

**Estimated completion**: 2-3 weeks
