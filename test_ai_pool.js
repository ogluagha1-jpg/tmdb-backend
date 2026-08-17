const { GeminiPoolService } = require('./dist/services/gemini_pool.service');

async function testPool() {
  console.log('Testing GeminiPoolService...');
  const pool = GeminiPoolService.getInstance();
  const metrics = pool.getPoolMetrics();
  console.log('Pool Metrics:', {
    totalKeys: metrics.totalKeys,
    healthyKeys: metrics.healthyKeys,
    model: metrics.model
  });

  console.log('\nSending test movie enrichment request to Gemini...');
  const result = await pool.enrichMovieWithAi({
    title: 'Inception',
    year: 2010,
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
  });

  console.log('\nResult from Gemini AI Pool:', JSON.stringify(result, null, 2));
}

testPool().catch(console.error);
