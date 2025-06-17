#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const cors    = require('cors');               // ← new
const { generate }    = require('./services/cfllm');
const { executePlan } = require('./worker/executePlan');

const app  = express();
const PORT = process.env.LOCAL_AGENT_PORT || 5005;

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// allow your frontend origins to call us
app.use(cors({
  origin: [
    'http://localhost:3000',       // React dev
    'https://tenseai.in',          // your live site
    'https://www.tenseai.in'
  ]
}));

// ─── HEALTHCHECK ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true });
});

// ─── MAIN EXECUTE ENDPOINT ───────────────────────────────────────────────────
app.post('/execute', async (req, res) => {
  try {
    const { instruction } = req.body;
    if (!instruction || typeof instruction !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid or missing instruction.' });
    }

    // 1) Build the LLM prompt
     const prompt = `
You are an RPA agent running on Linux Live Server. Respond ONLY with a pure JSON array of strings.
Each string must be one of these commands (Note: Commands can be repeated, strategically used as you have to satisfy user query):
- runAppByName("App Name")
- launchApp("C:\\\\full\\\\path\\\\to\\\\app.exe")
- typeText("...")
- pressKey("Enter"|"Ctrl+V"|"/"|...)
- moveTo(x,y)
- clickAt(x,y)
- wait(ms)

If the user instruction contains multiple tasks separated by "and",
your array must include the commands for each task in order and don't stop until goal is achieved.

Example:
Instruction: "Open Microsoft Edge and go to youtube.com and search for cat videos"
Response:
[
  "runAppByName(\\"Microsoft Edge\\")",
  "wait(3000)",
  "typeText(\\"youtube.com\\")",
  "pressKey(\\"Enter\\")",
  "wait(5000)",
  "pressKey(\\"/\\")",
  "wait(300)",
  "typeText(\\"cat videos\\")",
  "pressKey(\\"Enter\\")"
]

DO NOT include any markdown, comments, or extra text—only the JSON array.

User instruction: "${instruction}"
→
`;

    // 2) Ask the LLM
    const { text: raw } = await generate({
      prompt,
      temperature: 0,
      max_tokens: 712
    });

    // 3) Strip any ``` fences and isolate the JSON
    const cleaned = raw
      .replace(/```json[\s\S]*?```/gi, match => match.replace(/```/g, ''))
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('[');
    const end   = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) {
      throw new Error('Could not locate JSON array in LLM response.');
    }

    let jsonStr = cleaned.slice(start, end + 1)
      .replace(/\/\/.*$/gm, '') // strip JS‑style comments
      .trim();

    // 4) Parse into an array, retry once if JSON had trailing commas
    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch {
      // remove trailing commas and retry
      const repaired = jsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      plan = JSON.parse(repaired);
    }
    if (!Array.isArray(plan) || plan.length === 0) {
      throw new Error('LLM returned no commands. Please rephrase your instruction.');
    }

    // 5) Execute the DSL plan
    const logs = await executePlan(plan);

    // 6) Return both the plan and execution logs
    return res.json({ success: true, plan, logs });
  } catch (err) {
    console.error('RPA controller error:', err);
    return res
      .status(500)
      .json({ success: false, error: err.message });
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Local Agent listening on http://127.0.0.1:${PORT}`);
});
