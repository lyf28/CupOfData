/**
 * 🧠 CupOfData AI filterBrandContext - v0.1
 * 判斷留言是否與指定品牌有關
 *
 * 若 .env 有 OPENAI_API_KEY 則使用 GPT 進行語意分類；
 * 否則 fallback 為簡單的關鍵字比對。
 */

import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
let client = null;
if (OPENAI_API_KEY) client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * 判斷留言是否屬於指定品牌
 * @param {string} brand - 例如「五桐號」
 * @param {string} text - 留言文字
 * @returns {Promise<boolean>}
 */
export async function filterBrandContext(brand, text) {
  // Fallback 模式：簡單關鍵字判斷
  if (!client) {
    const line = text.replace(/\s+/g, "");
    const regex = new RegExp(brand);
    return regex.test(line);
  }

  // AI 模式
  const prompt = `
你是一個文字分類器。判斷以下留言是否在討論「${brand}」這家飲料店的產品：
---
留言內容：${text}
---
請只回答「YES」或「NO」。
若留言提到其他品牌、或只是提到飲料但無明確品牌關聯，請回答 NO。
  `;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3,
      temperature: 0,
    });
    const answer = res.choices[0].message.content?.trim().toUpperCase();
    return answer.startsWith("Y");
  } catch (err) {
    console.warn("⚠️ AI filter failed:", err.message);
    return false;
  }
}