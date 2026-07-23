const axios = require('axios');
require('dotenv').config();
const MODEL = 'gemini-2.0-flash';

const geminiKey = process.env.GEMINI_API_KEY;
console.log('Gemini Key present:', !!geminiKey);
console.log('Key starts with:', geminiKey ? geminiKey.slice(0, 10) + '...' : 'NONE');

async function testGemini() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiKey}`;
    const res = await axios.post(url, {
      contents: [{ parts: [{ text: 'Say hello in one sentence.' }] }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('\n✅ Gemini API SUCCESS:');
    console.log(text);
  } catch (err) {
    console.error('\n❌ Gemini API FAILED:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Body:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

testGemini();
