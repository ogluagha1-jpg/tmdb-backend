const { GeminiPoolService } = require('./dist/services/gemini_pool.service');

async function testCategoryDiscovery() {
  console.log('Testing Gemini Dynamic Category Discovery...');
  const pool = GeminiPoolService.getInstance();
  const result = await pool.discoverAndPublishDynamicCategories();
  console.log('Discovery Result:', JSON.stringify(result, null, 2));
}

testCategoryDiscovery().catch(console.error);
