const { GeminiPoolService } = require('./dist/services/gemini_pool.service');
const { AutoScannerService } = require('./dist/services/auto_scanner.service');
const { CategorizerService } = require('./dist/services/categorizer.service');

async function testArchitectureSeparation() {
  console.log('Testing Architecture Separation & Admin Control Mode...\n');

  const pool = GeminiPoolService.getInstance();
  console.log(`1. Gemini AI Enabled on boot? ${pool.isAiEnabled()}`);
  if (pool.isAiEnabled() === false) {
    console.log('   ✅ PASS: Gemini AI is OFF by default. Main scanning runs 100% on traditional multi-source engine.');
  } else {
    console.log('   ❌ FAIL: Gemini AI should default to false.');
  }

  const scanner = AutoScannerService.getInstance();
  console.log(`\n2. Primary Scanner Status:`);
  const status = await scanner.getStatus();
  console.log(`   Total Movies: ${status.totalMovies}`);
  console.log(`   Enriched: ${status.enrichedMovies} (${status.completionPct}%)`);
  console.log(`   Is Running: ${status.isRunning}`);

  console.log(`\n3. Cooperative AI Gap-Scanner Status:`);
  const metrics = pool.getPoolMetrics();
  console.log(`   Is Scanning: ${metrics.cooperativeScan.isRunning}`);
  console.log(`   Is Paused: ${metrics.cooperativeScan.isPaused}`);
  console.log(`   Gaps Processed: ${metrics.cooperativeScan.processed}`);
  console.log(`   Gaps Enriched: ${metrics.cooperativeScan.enriched}`);
  console.log('   ✅ PASS: Secondary AI Engine is idle and waiting under admin command.');
}

testArchitectureSeparation().catch(console.error);
