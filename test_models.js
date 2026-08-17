const axios = require('axios');

const key = 'AIzaSyB4dZhhGMDCbA-v71flTpIq0ooqCdothHE';
const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];

async function testModels() {
  for (const m of models) {
    try {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        contents: [{ parts: [{ text: 'Hello, respond with {"status": "ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }, { timeout: 10000 });
      console.log(`✅ Model ${m} is ACTIVE and working! Response:`, res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (e) {
      console.log(`❌ Model ${m} failed:`, e.response?.data?.error?.message || e.message);
    }
  }
}

testModels();
