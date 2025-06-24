// File: services/cfllm.js
// — Axios‑only Gemini client with hard‑coded API key

const axios = require('axios/dist/node/axios.cjs');

// ← your literal key here
const API_KEY = 'AIzaSyB-wqbFfoubsd2AP9_m_38Itg0bfxKlA1Q';

/**
 * generate()
 * @param {{ prompt: string, max_tokens?: number, temperature?: number }} opts
 * @returns {Promise<{ text: string }>}
 */
async function generate({ prompt, max_tokens, temperature }) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    'gemini-1.5-flash-latest:generateContent' +
    `?key=${API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
    // If needed, you can also add:
    // , temperature, maxOutputTokens: max_tokens
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000
    });

    const candidate = res.data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? '';
    return { text };
  } catch (err) {
    console.error('⚠️ Gemini API error:', err.response?.data || err.message);
    return { text: '' };
  }
}

module.exports = { generate };
