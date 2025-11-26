import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
let client = null;
if (OPENAI_API_KEY) client = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * 用 LLM 將整篇文章依品牌切段：
 * 回傳格式：[{ brand: "品牌名", content: "該品牌相關內容" }, ...]
 * 若無 API key 或出錯，就回傳單段 [{brand:"unknown", content:text}]
 */
export async function segmentByBrandAI(text) {
  if (!client) return [{ brand: "unknown", content: text }];

  const prompt = `
你是品牌段落分割器。請閱讀以下長文，找出其中提到的各個「飲料品牌」，
並把與該品牌相關的內容歸到同一段，輸出 JSON 陣列：
[
  {"brand": "品牌名", "content": "該品牌的相關內容（原文摘錄或整理）"},
  ...
]
注意：
- 只列出確實有內容的品牌
- 不要加入額外解釋
- brand 用原文出現的中文名稱
---
${text}
  `.trim();

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    });

    const raw = res.choices?.[0]?.message?.content?.trim();
    // 嘗試容錯 JSON：若模型回多餘文字，抓第一個方括號區段
    const jsonStr = (() => {
      if (!raw) return null;
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start >= 0 && end > start) return raw.slice(start, end + 1);
      return null;
    })();

    const parsed = jsonStr ? JSON.parse(jsonStr) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return [{ brand: "unknown", content: text }];
  } catch (err) {
    console.warn("⚠️ segmentByBrandAI failed:", err.message);
    return [{ brand: "unknown", content: text }];
  }
}