// File: services/cfllm.js
const { spawn } = require('child_process');

/**
 * Spawn a child process and pipe `inputData` into its stdin.
 * Resolves with the full stdout string, or rejects with stderr.
 */
function spawnWithInput(cmd, args, inputData) {
  return new Promise((resolve, reject) => {
    if (typeof inputData !== 'string' || !inputData.trim()) {
      return reject(new TypeError('Input must be a non-empty string'));
    }

    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });

    proc.stdin.write(inputData);
    proc.stdin.end();
  });
}

/**
 * Call your Python Gemini wrapper, piping the prompt into stdin.
 * @param {string} scriptPath – relative path to the Python script
 * @param {string} input       – piped into stdin
 * @returns {Promise<any>}     – parsed JSON response
 */
async function callPythonJSON(scriptPath, input) {
  const raw = await spawnWithInput(
    'python',
    [scriptPath],
    input
  );
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON from ${scriptPath}: ${e.message}`);
  }
}

/**
 * generate()
 * @param {{ prompt: string, max_tokens?: number, temperature?: number }} opts
 * @returns {Promise<{ text: string }>}
 */
async function generate({ prompt, max_tokens, temperature }) {
  const llmResponse = await callPythonJSON(
    'utils/geminiAPI.py',
    prompt
  );

  const text = llmResponse
    ?.candidates?.[0]?.content?.parts?.[0]?.text
    || '';

  return { text };
}

/**
 * embed()
 * @param {string} input  – the text to embed
 * @returns {Promise<number[]>} – the embedding vector
 */
async function embed(input) {
  const embedResponse = await callPythonJSON(
    'utils/geminiEmbed.py',
    input
  );
  if (!Array.isArray(embedResponse.embedding)) {
    throw new Error('Expected { embedding: number[] }');
  }
  return embedResponse.embedding;
}

module.exports = {
  generate,
  embed
};
