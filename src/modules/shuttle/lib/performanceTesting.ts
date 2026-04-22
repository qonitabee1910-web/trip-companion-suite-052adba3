/**
 * Performance Testing Guide for OSRM Integration
 *
 * This module provides utilities for load testing and performance verification
 * of the OSRM fare calculation system.
 */

import { performance } from "perf_hooks";
import { calcFareBreakdownCompat } from "./migrationHelper";
import { getCalculationStats, getCalculationLogs } from "./migrationHelper";
import { SEED_RAYONS_PYUGO } from "../data/rayons";
import { VEHICLE_TYPES, SERVICES } from "../data/services";

export interface PerformanceTestResult {
  totalRequests: number;
  duration: number; // milliseconds
  avgLatency: number; // milliseconds
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorsCount: number;
  cacheHitRate: number;
  throughput: number; // requests per second
}

export interface LoadTestConfig {
  concurrency: number; // number of parallel calculations
  duration: number; // test duration in milliseconds
  rayonIds?: string[]; // specific rayons to test
  pickupCodes?: string[]; // specific pickups to test
}

export interface LoadTestResult extends PerformanceTestResult {
  concurrency: number;
  warnings: string[];
  recommendations: string[];
}

/**
 * Run a basic performance test
 * Measures latency of fare calculations
 */
export async function runPerformanceTest(): Promise<PerformanceTestResult> {
  const vehicle = VEHICLE_TYPES[0];
  const service = SERVICES[0];
  const rayon = SEED_RAYONS_PYUGO[0];

  const latencies: number[] = [];
  let errors = 0;

  const startTime = performance.now();

  // Run 100 fare calculations
  for (let i = 0; i < 100; i++) {
    const reqStart = performance.now();
    try {
      await calcFareBreakdownCompat(vehicle, service, rayon, "J1");
    } catch (err) {
      errors++;
    }
    const reqEnd = performance.now();
    latencies.push(reqEnd - reqStart);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = latencies[0];
  const maxLatency = latencies[latencies.length - 1];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

  const stats = getCalculationStats();
  const cacheHitRate =
    stats.total > 0
      ? ((stats.cachedCount + stats.osrmCount) / stats.total) * 100
      : 0;

  return {
    totalRequests: 100,
    duration,
    avgLatency,
    minLatency,
    maxLatency,
    p95Latency,
    p99Latency,
    errorsCount: errors,
    cacheHitRate,
    throughput: (100 / duration) * 1000, // requests per second
  };
}

/**
 * Run a load test with simulated concurrent requests
 */
export async function runLoadTest(
  config: LoadTestConfig,
): Promise<LoadTestResult> {
  const rayonIds = config.rayonIds || SEED_RAYONS_PYUGO.map((r) => r.id);
  const pickupCodes = config.pickupCodes || ["J1", "J5", "J10"];
  const vehicle = VEHICLE_TYPES[0];
  const service = SERVICES[0];

  const latencies: number[] = [];
  let errors = 0;
  let requestCount = 0;

  const startTime = performance.now();

  // Simulate concurrent requests
  while (performance.now() - startTime < config.duration) {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      const rayonId = rayonIds[Math.floor(Math.random() * rayonIds.length)];
      const pickupCode =
        pickupCodes[Math.floor(Math.random() * pickupCodes.length)];
      const rayon = SEED_RAYONS_PYUGO.find((r) => r.id === rayonId);

      if (!rayon) continue;

      const promise = (async () => {
        const reqStart = performance.now();
        try {
          await calcFareBreakdownCompat(vehicle, service, rayon, pickupCode);
          requestCount++;
        } catch (err) {
          errors++;
        }
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
      })();

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = latencies[0];
  const maxLatency = latencies[latencies.length - 1];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

  const stats = getCalculationStats();
  const cacheHitRate =
    stats.total > 0
      ? ((stats.cachedCount + stats.osrmCount) / stats.total) * 100
      : 0;

  // Generate warnings and recommendations
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (cacheHitRate < 95) {
    warnings.push(
      `Low cache hit rate: ${cacheHitRate.toFixed(1)}% (target: >95%)`,
    );
    recommendations.push(
      "Consider extending cache TTL or warming cache before peak hours",
    );
  }

  if (avgLatency > 500) {
    warnings.push(
      `High average latency: ${avgLatency.toFixed(0)}ms (target: <500ms)`,
    );
    recommendations.push(
      "Check OSRM API response time or consider local self-hosted instance",
    );
  }

  if (p99Latency > 2000) {
    warnings.push(
      `High p99 latency: ${p99Latency.toFixed(0)}ms (target: <2000ms)`,
    );
    recommendations.push("Add timeout handling for slow requests");
  }

  if (errors > 0) {
    const errorRate = (errors / requestCount) * 100;
    warnings.push(
      `Error rate: ${errorRate.toFixed(2)}% (${errors}/${requestCount} failed)`,
    );
    recommendations.push(
      "Verify OSRM endpoint availability and network connectivity",
    );
  }

  if (maxLatency > 5000) {
    warnings.push(`Maximum latency spike: ${maxLatency.toFixed(0)}ms`);
    recommendations.push(
      "Implement circuit breaker pattern for timeout protection",
    );
  }

  return {
    totalRequests: requestCount,
    duration,
    avgLatency,
    minLatency,
    maxLatency,
    p95Latency,
    p99Latency,
    errorsCount: errors,
    cacheHitRate,
    throughput: (requestCount / duration) * 1000,
    concurrency: config.concurrency,
    warnings,
    recommendations,
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(result: LoadTestResult): string {
  const lines = [
    "╔════════════════════════════════════════════════════════╗",
    "║           PERFORMANCE TEST REPORT                       ║",
    "╚════════════════════════════════════════════════════════╝",
    "",
    "📊 THROUGHPUT",
    `  Total Requests:  ${result.totalRequests}`,
    `  Duration:        ${result.duration.toFixed(0)}ms`,
    `  Throughput:      ${result.throughput.toFixed(2)} req/sec`,
    `  Concurrency:     ${result.concurrency}`,
    "",
    "⏱️  LATENCY (milliseconds)",
    `  Average:         ${result.avgLatency.toFixed(2)}ms`,
    `  Min:             ${result.minLatency.toFixed(2)}ms`,
    `  Max:             ${result.maxLatency.toFixed(2)}ms`,
    `  p95:             ${result.p95Latency.toFixed(2)}ms`,
    `  p99:             ${result.p99Latency.toFixed(2)}ms`,
    "",
    "💾 CACHE EFFICIENCY",
    `  Cache Hit Rate:  ${result.cacheHitRate.toFixed(1)}%`,
    `  Errors:          ${result.errorsCount}`,
    "",
    "✅ STATUS",
  ];

  // Add status indicators
  const checks = {
    "Latency OK": result.avgLatency < 500,
    "Cache Hit Rate OK": result.cacheHitRate > 95,
    "Error Rate OK": result.errorsCount === 0,
    "P99 Latency OK": result.p99Latency < 2000,
  };

  for (const [check, passed] of Object.entries(checks)) {
    lines.push(`  ${passed ? "✓" : "✗"} ${check}`);
  }

  if (result.warnings.length > 0) {
    lines.push("", "⚠️  WARNINGS");
    result.warnings.forEach((w) => lines.push(`  • ${w}`));
  }

  if (result.recommendations.length > 0) {
    lines.push("", "💡 RECOMMENDATIONS");
    result.recommendations.forEach((r) => lines.push(`  • ${r}`));
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Run quick smoke test to verify OSRM connectivity
 */
export async function runSmokeTest(): Promise<boolean> {
  try {
    const vehicle = VEHICLE_TYPES[0];
    const service = SERVICES[0];
    const rayon = SEED_RAYONS_PYUGO[0];

    const start = performance.now();
    const breakdown = await calcFareBreakdownCompat(
      vehicle,
      service,
      rayon,
      "J1",
    );
    const duration = performance.now() - start;

    const success = breakdown && breakdown.total > 0 && duration < 5000;

    console.log(
      `✓ Smoke test ${success ? "PASSED" : "FAILED"} (${duration.toFixed(0)}ms)`,
    );

    return success;
  } catch (err) {
    console.error("✗ Smoke test FAILED:", err);
    return false;
  }
}
