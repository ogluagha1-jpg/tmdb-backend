const axios = require('axios');

const defaultKeyPool = [
  'AIzaSyB4dZhhGMDCbA-v71flTpIq0ooqCdothHE',
  'AIzaSyCkSOGdsmezbwTU46b4kUP3kj3hvjlj1k0',
  'AIzaSyCNDEoKgXhYXROBEjYZpo064XVAE_tC8Vs',
  'AIzaSyCFuD9GP70Z_tja18fbvi_O4QxMTnMDhB4',
  'AIzaSyAG3u7BQ1CiuKMXFv9LU7sKFjqTbeTGSzQ',
  'AIzaSyCVqJ4nihAFSdS-vo2LwjNZW8w16CPuYoQ',
  'AIzaSyC97H3IY4UnaNWqlUvgJ6w9ShMwAH72IjY',
  'AIzaSyCcjC5n-DCroHyTH9P6YDHzt-JXjiE-22Y',
  'AIzaSyBjc5BuffnZeXaRgKTLpGaw2PLdd11IzJQ',
  'AIzaSyDcOpg8BIcvua3VUQxpjETCSuhRk8X5_YE',
  'AIzaSyDHbIYWkPpQU7YOXs_CqCtpkRu9jlka9AI',
  'AIzaSyCHztHJNN11mmEJNPXedo6K-es7k5CbHdE',
];

async function checkExactErrors() {
  console.log('Inspecting exact Google API responses...');
  for (let i = 0; i < defaultKeyPool.length; i++) {
    const k = defaultKeyPool[i];
    try {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${k}`, {
        contents: [{ parts: [{ text: 'Hello' }] }]
      }, { timeout: 10000 });
      console.log(`✅ Key #${i + 1} (${k.slice(0, 8)}...): SUCCESS!`);
    } catch (e) {
      console.log(`❌ Key #${i + 1} (${k.slice(0, 8)}...): Status: ${e.response?.status} | Error:`, JSON.stringify(e.response?.data?.error || e.message));
    }
  }
}

checkExactErrors();
