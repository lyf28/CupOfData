/**
 * 🎯 isRecommendationSentence(text)
 * 判斷一句話是否是在「評價 / 描述口味 / 推薦」飲品
 *
 * 回傳：
 *   true  = 與飲品評價相關（可保留給 extractMentions）
 *   false = 純敘述、純資訊、與飲品風味無關（要丟掉）
 */

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function isRecommendationSentence(text) {
  const prompt = `
你是一個分類器，負責判斷一句話是否「在描述飲品的味道或評價」。

只要符合以下任意條件，就回傳 true：
- 在講味道（甜、淡、濃、好喝、難喝、苦、香、清爽…）
- 在比較飲品（比⋯⋯更好喝）
- 在推薦（值得試、會回購、推、必喝）
- 在說心得（整體來說、喝起來⋯⋯）

以下情況要回傳 false：
- 純粹品牌介紹（起源、位置、店面、裝潢）
- 純粹產品列表（五桐茶系列、紅茶系列）
- 純粹敘述事實（價格、地址、排隊人潮、聯名、大小杯）
- 不含任何飲品風味與評價

請只回傳 "true" 或 "false"，不要加入解釋。

句子：
"${text}"
  `;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const raw = res.choices[0].message.content.trim();
    return raw.toLowerCase() === "true";
  } catch (err) {
    console.warn("isRecommendationSentence error:", err.message);
    // fallback：如果 AI 爆掉，寧願保留（避免錯失）
    return true;
  }
}
