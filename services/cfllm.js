// File: services/cfllm.js
const { spawn } = require('child_process');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');

/**
 * Extracts a file that was baked into the pkg snapshot under /utils/
 * into the OS temp folder, so Python can import and run it.
 *
 * @param {string} relativeSrcPath  e.g. 'utils/geminiAPI.py'
 * @returns {string} full path to the extracted temp file
 */
function extractToTemp(relativeSrcPath) {
  // inside packaged exe, __dirname is the snapshot folder.
  const embeddedPath = path.join(__dirname, '..', relativeSrcPath);
  const contents     = fs.readFileSync(embeddedPath, 'utf-8');

  const tmpFile = path.join(
    os.tmpdir(),
    `tenseai-${path.basename(relativeSrcPath)}`
  );
  fs.writeFileSync(tmpFile, contents, 'utf-8');
  return tmpFile;
}

/**
 * Spawns a child process, pipes `inputData` into its stdin, and
 * resolves with stdout or rejects with stderr.
 */
function spawnWithInput(cmd, args, inputData) {
  return new Promise((resolve, reject) => {
    if (typeof inputData !== 'string' || !inputData.trim()) {
      return reject(new TypeError('Input must be a non-empty string'));
    }

    const proc = spawn(cmd, args, { stdio: ['pipe','pipe','pipe'] });
    let stdout = '', stderr = '';

    proc.stdout.on('data', c => (stdout += c.toString()));
    proc.stderr.on('data', c => (stderr += c.toString()));

    proc.on('close', code => {
      if (code === 0) resolve(stdout);
      else           reject(new Error(stderr || `Exit code ${code}`));
    });

    proc.stdin.write(inputData);
    proc.stdin.end();
  });
}

/**
 * Calls a Python script under utils/ via a temporary copy, parses JSON output.
 * On error, logs and returns a benign empty‐text shape.
 */
async function callPythonJSON(utilsRelativePath, input) {
  try {
    const scriptPath = extractToTemp(utilsRelativePath);
    const raw        = await spawnWithInput('python', [scriptPath], input);
    return JSON.parse(raw);
  } catch (err) {
    console.error('⚠️ Python Error:', err.message);
    // return empty structure so generate() always returns `{ text: '' }`
    return { candidates: [{ content: { parts: [{ text: '' }] } }] };
  }
}

/**
 * generate({ prompt, max_tokens, temperature })
 * — invokes your Gemini wrapper and returns `{ text }`
 */
async function generate({ prompt, max_tokens, temperature }) {
  const llmResponse = await callPythonJSON('utils/geminiAPI.py', prompt);
  const text = llmResponse
    ?.candidates?.[0]?.content?.parts?.[0]?.text
    || '';
  return { text };
}

module.exports = { generate };
