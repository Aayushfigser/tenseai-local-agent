#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const { generate } = require('./services/cfllm');   // your LLM wrapper
const { executePlan } = require('./worker/executePlan');

const app = express();
const PORT = process.env.LOCAL_AGENT_PORT || 5005;

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req, res) => res.json({ success: true }));

// Main endpoint: accepts { instruction: "..." }
app.post('/execute', async (req, res) => {
  try {
    const { instruction } = req.body;
    if (!instruction || typeof instruction !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid or missing instruction.' });
    }

    // 1) Build the prompt (same as your controller)
    const prompt = `
You are a local RPA agent. Respond ONLY with a pure JSON array of DSL commands.
Allowed commands:
- runAppByName("App Name")
- launchApp("C:\\\\path\\\\to\\\\app.exe")
- typeText("...")
- pressKey("Enter"|"Ctrl+V"|"/"|...)
- moveTo(x,y)
- clickAt(x,y)
- wait(ms)

Do NOT include any markdown or commentary—only the JSON array.
Instruction: "${instruction}"
→`;

    // 2) Ask the LLM
    const { text: raw } = await generate({
      prompt,
      temperature: 0,
      max_tokens: 512
    });

    // 3) Extract JSON array from the raw response
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
      .replace(/\/\/.*$/gm, '')  // strip comments
      .trim();
    let plan;
    try {
      plan = JSON.parse(jsonStr);
    } catch {
      const repaired = jsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      plan = JSON.parse(repaired);
    }
    if (!Array.isArray(plan) || plan.length === 0) {
      throw new Error('LLM returned no commands.');
    }

    // 4) Execute on the local desktop
    const logs = await executePlan(plan);

    // 5) Reply with both plan + logs
    return res.json({ success: true, plan, logs });
  } catch (err) {
    console.error('Local Agent Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Local Agent listening on http://127.0.0.1:${PORT}`);
});
