# Week 2: Testing & Verification - Complete Guide

**Phase Duration**: Days 8-13\
**Status**: Ready for Implementation

---

## 📋 Overview

Week 2 focuses on comprehensive testing of the OSRM integration before gradual
rollout. This includes:

- Data migration to populate OSRM distances
- A/B testing to compare legacy vs OSRM fares
- Performance verification and load testing
- QA validation on staging environment

---

## 🚀 Quick Start

### Day 8-9: Data Migration & Setup

#### 1. Enable OSRM for Testing

```bash
# Copy testing environment
cp .env.testing .env.local

# Verify settings
VITE_OSRM_ENABLED=true
VITE_OSRM_A_B_TEST=true
```

#### 2. Run Migration Script

```bash
# Populate all rayons with OSRM distances
npx ts-node scripts/migrate-osrm-distances.ts

# Expected output:
# [1/3] Processing A - Rayon A...
# ✓ Updated 15 points
# 📏 Original: 18.50 km
# 📏 Routing:  18.75 km
# 📊 Diff:     1.35%
```

**Output Review**:

- ✓ Successful: All rayons should show <3% difference
- ⚠ Warning: >5% difference - verify coordinates accuracy
- ✗ Failed: Check OSRM endpoint connectivity

#### 3. Verify Build

```bash
npm run build
# Should complete without errors
```

### Day 9-10: A/B Testing & Audit

#### 1. Access Admin Audit Page

```
http://localhost:5173/admin/shuttle/fare-audit
```

#### 2. Run Audit Tests

1. Select Vehicle Type: **Van (Hiace)**
2. Select Service: **Regular**
3. Click **Run Audit**

#### 3. Review Results

- **Summary Tab**: Overall metrics and pass/fail status
- **Details Tab**: Per-pickup-point comparison
- **Debug Tab**: Routing data quality assessment

#### 4. Export Results

Click **Download CSV** to save audit results for documentation

**Success Criteria**:

- ✓ Average difference <3%
- ✓ All pickup points within ±5%
- ✓ Cache hit rate >95%
- ✓ No OSRM errors

### Day 10-11: Performance Testing

#### 1. Basic Performance Test

```typescript
import { runPerformanceTest } from "@/modules/shuttle/lib/performanceTesting";

const result = await runPerformanceTest();
console.log(`Avg Latency: ${result.avgLatency.toFixed(2)}ms`);
console.log(`Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%`);
```

**Expected Results**:

- Average Latency: <500ms
- Cache Hit Rate: >95%
- P99 Latency: <2000ms

#### 2. Load Test (Concurrent Users)

```typescript
import {
    generatePerformanceReport,
    runLoadTest,
} from "@/modules/shuttle/lib/performanceTesting";

const result = await runLoadTest({
    concurrency: 10, // 10 concurrent requests
    duration: 60000, // 60 second test
    rayonIds: ["A", "B"], // Test rayons A & B
});

console.log(generatePerformanceReport(result));
```

**Success Criteria**:

- Throughput: >20 req/sec
- Avg Latency: <500ms (✓ pass) / >1000ms (✗ fail)
- Error Rate: <1%
- Cache Hit: >95%

#### 3. Smoke Test

```typescript
import { runSmokeTest } from "@/modules/shuttle/lib/performanceTesting";

const passed = await runSmokeTest();
console.log(passed ? "✓ System ready" : "✗ Check connectivity");
```

### Day 12-13: QA & Staging Validation

#### Test Checklist

- [ ] **Functionality Tests**
  - [ ] Booking page loads without errors
  - [ ] Fare displays correctly for all vehicle types
  - [ ] Arrival time estimates shown (when OSRM enabled)
  - [ ] Fallback works when OSRM disabled
  - [ ] No console errors

- [ ] **Data Accuracy Tests**
  - [ ] Fares match audit results (<3% variance)
  - [ ] Distances match OSRM data
  - [ ] Time estimates are reasonable (±5-10 min)

- [ ] **Performance Tests**
  - [ ] Page load time <3 seconds
  - [ ] Fare calculation <500ms
  - [ ] No memory leaks after 100+ calculations
  - [ ] Cache working (first call ~1000ms, subsequent <50ms)

- [ ] **Error Handling Tests**
  - [ ] OSRM API unavailable → fallback works
  - [ ] Network timeout → graceful degradation
  - [ ] Invalid coordinates → uses Haversine
  - [ ] Empty rayon → displays error properly

- [ ] **Browser Compatibility**
  - [ ] Chrome latest
  - [ ] Safari latest
  - [ ] Firefox latest
  - [ ] Mobile (iOS Safari, Chrome)

#### Manual Testing Script

```
Scenario 1: Normal Booking Flow
1. Go to /shuttle
2. Select Rayon A, Date Today, Time 06:00, 1 Pax
3. Select Pickup J3
4. Verify fare displays and time estimate shown
5. Go to seat selection - should show calculated fare

Scenario 2: Legacy Fallback
1. Set VITE_OSRM_ENABLED=false
2. Reload page
3. Verify fare still displays (using hardcoded distances)
4. No "Failed to calculate" errors

Scenario 3: Different Vehicles
1. For each vehicle type (Van, Bus, Premium):
   - Select vehicle
   - Verify fare adjusts correctly
   - Estimate time still shown

Scenario 4: Multiple Pickups
1. Select Rayon A
2. Try pickups: J1, J5, J10, DEST (destination)
3. Verify fares are different for each
4. Later pickups have lower total fare
```

---

## 📊 Testing Tools Created

### 1. Migration Script

**File**: `scripts/migrate-osrm-distances.ts`

```bash
npx ts-node scripts/migrate-osrm-distances.ts
```

Features:

- Updates all rayons with OSRM distances
- Calculates and displays differences
- Provides summary and error handling
- ~1 second delay between rayons (API rate limiting)

### 2. Admin Audit Page

**File**: `src/modules/admin/pages/AdminFareAudit.tsx`

Access: `/admin/shuttle/fare-audit`

Features:

- Compare legacy vs OSRM fares
- Filter by vehicle type and service
- See OSRM integration metrics (%)
- Export results to CSV
- Debug routing data quality

### 3. Unit Tests

**Files**:

- `src/modules/shuttle/lib/__tests__/osrmRouting.test.ts`
- `src/modules/shuttle/lib/__tests__/refinedFareCalculator.test.ts`

```bash
npm run test -- osrmRouting.test.ts
npm run test -- refinedFareCalculator.test.ts
```

### 4. Performance Testing

**File**: `src/modules/shuttle/lib/performanceTesting.ts`

```typescript
import {
    generatePerformanceReport,
    runLoadTest,
    runPerformanceTest,
    runSmokeTest,
} from "@/modules/shuttle/lib/performanceTesting";
```

---

## 📈 Expected Results

### Migration

```
Rayon A: 18.50 km (original) → 18.75 km (OSRM) = +1.35%
Rayon B: 22.10 km (original) → 22.35 km (OSRM) = +1.13%
Rayon C: 19.80 km (original) → 20.05 km (OSRM) = +1.26%
```

### Audit

```
✓ Successful: 3 rayons
✗ Failed: 0
⊘ Skipped: 0

Average difference across all pickups: 1.24%
Cache hit rate: 99.8% (after initial load)
```

### Performance

```
Average Latency: 245ms (OSRM) vs 5ms (Cached)
P95 Latency: 450ms
Cache Hit Rate: 98.5%
Throughput: 42 req/sec
```

---

## ⚠️ Common Issues & Solutions

### Issue: OSRM API Rate Limit

**Symptom**: "429 Too Many Requests" errors

**Solution**:

- Increase `BATCH_DELAY` in migration script
- Use self-hosted OSRM for higher limits
- Implement request queuing

### Issue: High Variance in Fares

**Symptom**: Some pickups show >5% difference

**Solution**:

- Verify pickup point coordinates accuracy
- Check if coordinates match actual physical locations
- Update coordinates if they're off by >500m

### Issue: OSRM Endpoint Unreachable

**Symptom**: All calculations fall back to Haversine

**Solution**:

- Verify internet connectivity
- Check OSRM API status: https://status.project-osrm.org
- Consider self-hosting for production

### Issue: Slow Fare Calculations

**Symptom**: First call takes >2000ms

**Solution**:

- Check network latency to OSRM
- Implement request timeout (max 2000ms)
- Warm cache before peak hours
- Consider local OSRM deployment

---

## 📋 Sign-Off Checklist

Before proceeding to Week 3 (Launch), verify:

### Data Quality

- [ ] All rayons migrated successfully
- [ ] Fare differences <3% for most pickups
- [ ] No missing coordinates detected
- [ ] Backup of original distances created

### Testing Complete

- [ ] Unit tests passing (all 30+ tests)
- [ ] Integration tests passing
- [ ] Admin audit page working
- [ ] No console errors in browser

### Performance Verified

- [ ] Average latency <500ms
- [ ] Cache hit rate >95%
- [ ] Load test: >20 req/sec, <1% errors
- [ ] Smoke test passing

### QA Approved

- [ ] Manual testing scenarios all passed
- [ ] Browser compatibility verified
- [ ] Error handling tested
- [ ] Mobile devices tested

### Documentation Complete

- [ ] Test results documented
- [ ] Performance benchmarks recorded
- [ ] Migration audit saved
- [ ] Issues/solutions logged

---

## 🎯 Next Steps (Week 3)

Once Week 2 sign-off complete:

1. **Gradual Rollout (10%)**
   - Enable for 10% of users
   - Monitor error rate
   - Check customer feedback

2. **Setup Daily Sync**
   - Deploy routing sync service
   - Configure cron job (3 AM daily)
   - Setup monitoring and alerting

3. **Full Rollout (100%)**
   - Increase to 50%, then 100%
   - Final performance monitoring
   - Archive legacy code

---

## 📞 Support & Escalation

| Issue               | Owner   | Action                                |
| ------------------- | ------- | ------------------------------------- |
| OSRM connectivity   | DevOps  | Check endpoint, rate limits           |
| High latency        | Backend | Profile OSRM API, optimize            |
| Fare accuracy >5%   | Product | Verify coordinates, review logic      |
| Customer complaints | Support | Document issue, escalate to team      |
| Load test failures  | QA      | Run performance analysis, file ticket |

---

**Week 2 Status**: ✅ Ready for Testing\
**Estimated Timeline**: 5 days\
**Sign-Off Required**: ✓ All tests pass & approved by QA Lead
