/**
 * Migration script: Populate OSRM distances for all rayons
 * Usage: npx ts-node scripts/migrate-osrm-distances.ts
 *
 * This script:
 * 1. Loads all rayons from SEED_RAYONS_PYUGO
 * 2. For each rayon, calls updateRayonDistances() to fetch OSRM routing data
 * 3. Logs progress and results
 * 4. Saves updated rayons to rayons.ts (manual step after review)
 */

// @ts-ignore - allow importing from src
import { updateRayonDistances } from "../src/modules/shuttle/lib/osrmRouting";
import { SEED_RAYONS_PYUGO } from "../src/modules/shuttle/data/rayons";

const BATCH_DELAY = 1000; // 1 second delay between rayons (be nice to OSRM API)

interface MigrationResult {
  rayonId: string;
  rayonName: string;
  status: "ok" | "error" | "skipped";
  pointsUpdated?: number;
  totalDistance?: number;
  originalDistance?: number;
  difference?: string;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrateRayons(): Promise<void> {
  console.log("🚀 Starting OSRM distance migration...\n");
  console.log(`📊 Processing ${SEED_RAYONS_PYUGO.length} rayons\n`);

  const results: MigrationResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < SEED_RAYONS_PYUGO.length; i++) {
    const rayon = SEED_RAYONS_PYUGO[i];

    console.log(
      `[${i + 1}/${SEED_RAYONS_PYUGO.length}] 📍 Processing ${rayon.id} - ${rayon.name}...`,
    );

    try {
      const pickupPoints = rayon.pickupPoints || [];

      // Filter out DEST point (final destination)
      const pointsToUpdate = pickupPoints.filter((p) => p.code !== "DEST");

      if (pointsToUpdate.length === 0) {
        console.log(`  ⚠️  No pickup points to update (only DEST)\n`);
        results.push({
          rayonId: rayon.id,
          rayonName: rayon.name,
          status: "skipped",
        });
        continue;
      }

      // Check if coordinates are available
      const pointsWithCoords = pointsToUpdate.filter((p) => p.lat && p.lng);
      if (pointsWithCoords.length === 0) {
        console.log(`  ⚠️  No points with coordinates\n`);
        results.push({
          rayonId: rayon.id,
          rayonName: rayon.name,
          status: "skipped",
          error: "No coordinates",
        });
        continue;
      }

      // Update distances from OSRM
      const updatedPoints = await updateRayonDistances(pickupPoints);

      if (!updatedPoints || updatedPoints.length === 0) {
        console.log(`  ⚠️  Failed to get routing data\n`);
        results.push({
          rayonId: rayon.id,
          rayonName: rayon.name,
          status: "error",
          error: "No routing data returned",
        });
        continue;
      }

      // Calculate totals (including DEST with 0 distance)
      const totalOriginal = updatedPoints.reduce(
        (sum, p) => sum + (p.distanceToNext || 0),
        0,
      );
      const totalRouting = updatedPoints.reduce(
        (sum, p) => sum + (p.routingDistance || p.distanceToNext || 0),
        0,
      );
      const difference = totalRouting - totalOriginal;
      const percentDiff =
        totalOriginal > 0
          ? ((difference / totalOriginal) * 100).toFixed(2)
          : "0.00";

      console.log(`  ✓ Updated ${updatedPoints.length} points`);
      console.log(`  📏 Original: ${(totalOriginal / 1000).toFixed(2)} km`);
      console.log(`  📏 Routing:  ${(totalRouting / 1000).toFixed(2)} km`);
      console.log(
        `  📊 Diff:     ${percentDiff}% (${(difference / 1000).toFixed(2)} km)\n`,
      );

      results.push({
        rayonId: rayon.id,
        rayonName: rayon.name,
        status: "ok",
        pointsUpdated: updatedPoints.length,
        totalDistance: totalRouting,
        originalDistance: totalOriginal,
        difference: `${percentDiff}%`,
      });

      // TODO: In production, save to database:
      // await db.rayons.update(rayon.id, { pickupPoints: updatedPoints });

      // Be nice to OSRM API
      if (i < SEED_RAYONS_PYUGO.length - 1) {
        await sleep(BATCH_DELAY);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error: ${errorMsg}\n`);
      results.push({
        rayonId: rayon.id,
        rayonName: rayon.name,
        status: "error",
        error: errorMsg,
      });
    }
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n" + "=".repeat(70));
  console.log(`📊 MIGRATION SUMMARY (${duration}s)`);
  console.log("=".repeat(70));

  const successful = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  console.log(`✓ Successful: ${successful}`);
  console.log(`✗ Failed:     ${failed}`);
  console.log(`⊘ Skipped:    ${skipped}`);
  console.log(`Total:        ${results.length}\n`);

  // Show results by status
  console.log("📋 SUCCESSFUL MIGRATIONS:");
  results
    .filter((r) => r.status === "ok")
    .forEach((r) => {
      console.log(
        `  ${r.rayonId}: ${(r.totalDistance! / 1000).toFixed(2)} km (${r.difference})`,
      );
    });

  if (failed > 0) {
    console.log("\n⚠️  FAILED MIGRATIONS:");
    results
      .filter((r) => r.status === "error")
      .forEach((r) => {
        console.log(`  ${r.rayonId}: ${r.error}`);
      });
  }

  if (skipped > 0) {
    console.log("\n⊘ SKIPPED:");
    results
      .filter((r) => r.status === "skipped")
      .forEach((r) => {
        console.log(`  ${r.rayonId}: ${r.error || "No data"}`);
      });
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ NEXT STEPS:");
  console.log("  1. Review the distances above");
  console.log("  2. If they look correct, save updated rayons to database");
  console.log("  3. Run: npm run test to verify fare calculations");
  console.log("  4. Test on staging: npm run build && npm run preview");
  console.log("=".repeat(70) + "\n");

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the migration
migrateRayons().catch((err) => {
  console.error("\n💥 FATAL ERROR:", err);
  process.exit(1);
});
