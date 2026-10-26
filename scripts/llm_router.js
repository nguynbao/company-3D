#!/usr/bin/env node
/**
 * MULTI-MODEL ROUTER (OpenAI, Claude/Anthropic, DeepSeek, OpenRouter, Gemini)
 * Cho phép từng Phòng ban (Subagent) trong .agent/departments_config.json chạy bằng bất kỳ Model nào:
 * - OpenAI: gpt-4o, gpt-4o-mini, o3-mini...
 * - Anthropic: claude-3-7-sonnet-latest, claude-3-5-sonnet-latest, claude-3-5-haiku-latest...
 * - DeepSeek: deepseek-chat (V3), deepseek-reasoner (R1)...
 * - OpenRouter (1 key dùng cho mọi hãng): openai/gpt-4o, anthropic/claude-3.7-sonnet, deepseek/deepseek-r1...
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const DEPT_CONFIG_PATH = path.join(ROOT_DIR, ".agent", "departments_config.json");

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const PROVIDER_ENDPOINTS = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY"
  },
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    keyEnv: "DEEPSEEK_API_KEY"
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY"
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    keyEnv: "ANTHROPIC_API_KEY"
  }
};

function getDepartmentPromptAndSkills(deptName, deptConfig) {
  const parts = [];
  if (deptConfig.agent_file) {
    const agentPath = path.join(ROOT_DIR, deptConfig.agent_file);
    if (fs.existsSync(agentPath)) {
      parts.push(fs.readFileSync(agentPath, "utf8"));
    }
  }
  if (Array.isArray(deptConfig.skills)) {
    for (const s of deptConfig.skills) {
      const skillPath = path.join(ROOT_DIR, s);
      if (fs.existsSync(skillPath)) {
        parts.push(`\n--- SKILL: ${s} ---\n` + fs.readFileSync(skillPath, "utf8"));
      }
    }
  }
  return parts.join("\n\n");
}

async function callExternalModel(provider, model, systemPrompt, userPrompt) {
  const p = provider.toLowerCase();
  if (!PROVIDER_ENDPOINTS[p]) {
    throw new Error(`Provider '${provider}' không hợp lệ. Hỗ trợ: openai, anthropic, deepseek, openrouter.`);
  }

  const { url, keyEnv } = PROVIDER_ENDPOINTS[p];
  const apiKey = process.env[keyEnv];
  if (!apiKey) {
    throw new Error(`Thiếu API Key '${keyEnv}' trong file .env cho provider '${provider}'!`);
  }

  if (p === "anthropic") {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Anthropic Error: ${JSON.stringify(data)}`);
    return data.content.map(c => c.text).join("\n");
  } else {
    // Chuẩn OpenAI-compatible (OpenAI, DeepSeek, OpenRouter)
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`${provider} Error: ${JSON.stringify(data)}`);
    return data.choices[0].message.content;
  }
}

async function runDepartmentTask(deptName, taskPrompt) {
  const cfg = JSON.parse(fs.readFileSync(DEPT_CONFIG_PATH, "utf8"));
  const dept = cfg.departments[deptName];
  if (!dept) throw new Error(`Không tìm thấy phòng ban: ${deptName}`);

  const provider = dept.provider || "antigravity";
  const model = dept.model || "flash";
  const systemPrompt = getDepartmentPromptAndSkills(deptName, dept);

  console.log(`[${deptName}] Đang chạy trên Provider: ${provider} | Model: ${model}...`);
  const output = await callExternalModel(provider, model, systemPrompt, taskPrompt);
  console.log(output);
  return output;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const deptIdx = args.indexOf("--dept");
  const promptIdx = args.indexOf("--prompt");
  if (deptIdx !== -1 && promptIdx !== -1) {
    runDepartmentTask(args[deptIdx + 1], args[promptIdx + 1]).catch(err => {
      console.error("Lỗi:", err.message);
      process.exit(1);
    });
  } else {
    console.log('Cách dùng: node scripts/llm_router.js --dept CONTENT --prompt "Viết bài..."');
  }
}

module.exports = { runDepartmentTask, callExternalModel };
