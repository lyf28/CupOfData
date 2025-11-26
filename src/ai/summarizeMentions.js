/**
 * 🧠 CupOfData AI Summarizer - v0.1
 * 用 LLM 將抽取結果生成自然語言推薦摘要
 */

import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
let client = null;
if (OPENAI_API_KEY) client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * summarizeMentions(brand, topMentions)
 * @param {string} brand - 品牌名稱
 * @param {Array<[string, object]>} topMentions - buildRecommendation 的結果 top3
 * @returns {Promise<string>}
 */
export async function summarizeMentions(brand, topMentions) {
  if (!client) {
    return `（AI 摘要未啟用，請設定 OPENAI_API_KEY）`;
  }

  const formatted = topMentions
    .map(([drink, data]) => {
      const sugar = top1(data.sugar);
      const ice = top1(data.ice);
      return `${drink}${sugar ? `（${sugar}` : ""}${ice ? `·${ice}` : ""}${sugar || ice ? "）" : ""}`;
    })
    .join("、");

  const prompt = `
你是一個飲料推薦文案生成助手。
根據以下資訊，用自然口吻總結大家對「${brand}」的推薦飲料，控制在 2～3 句：
---
熱門飲品：
${formatted}
---
生成範例：
🍹 五桐號推薦結果：
最多人提到珍珠奶茶（半糖少冰），紅茶拿鐵則偏無糖去冰；
整體口味評價為「清爽不膩」。
  `;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });
    return res.choices[0].message.content.trim();
  } catch (err) {
    console.warn("⚠️ summarizeMentions failed:", err.message);
    return "(AI 摘要生成失敗)";
  }
}

function top1(map) {
  if (!map || map.size === 0) return null;
  let best = null;
  for (const [k, v] of map.entries()) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best ? best[0] : null;
}