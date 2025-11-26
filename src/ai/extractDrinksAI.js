/**
 * 🍹 extractDrinksAI(text)
 * 用 AI 從一段文字中抽出飲品名稱
 */

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanJson(raw) {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export async function extractDrinksAI(text) {
  const prompt = `
你是一個飲料名稱抽取器。從下列句子中找出「有提到的飲品名稱」，格式必須為 JSON array。
請不要加入店名，只抓飲品（例：珍珠奶茶、蜜桃凍飲、抹茶奶霜桂花冰、四季春青茶）。

句子：
"${text}"

只回傳純 JSON array，不要說明，不要格式化，例如：
["珍珠奶茶", "蜜桃凍飲"]
`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let raw = res.choices[0].message.content.trim();
    raw = cleanJson(raw);

    const list = JSON.parse(raw);

    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn("extractDrinksAI error:", err.message);
    return [];
  }
}
