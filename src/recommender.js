/**
 * 🧋 CupOfData Recommender - v0.1
 * 將抽取出的飲料 mentions 聚合成推薦摘要
 */

import { extractMentions } from './extractors.js';

/**
 * buildRecommendation(brand, texts)
 * @param {string} brand - 品牌名（例如「五桐號」）
 * @param {string[]} texts - 多筆留言或內文
 * @returns {object} summary - 推薦摘要結果
 */
export function buildRecommendation(brand, texts) {
  const mentions = texts.flatMap((t) => extractMentions(t));

  const stats = new Map();

  // 統計每種飲料的出現次數與屬性
  for (const m of mentions) {
    const key = m.drink;
    if (!stats.has(key)) {
      stats.set(key, { count: 0, sugar: new Map(), ice: new Map() });
    }
    const row = stats.get(key);
    row.count++;
    if (m.sugar) row.sugar.set(m.sugar, (row.sugar.get(m.sugar) || 0) + 1);
    if (m.ice) row.ice.set(m.ice, (row.ice.get(m.ice) || 0) + 1);
  }

  // 依提及次數排序
  const sorted = [...stats.entries()].sort((a, b) => b[1].count - a[1].count);
  const top3 = sorted.slice(0, 3);

  // 組合自然語言推薦句
  const primary = makePrimarySentence(brand, top3);
  const secondary = makeSecondarySentences(top3);

  return {
    brand,
    totalMentions: mentions.length,
    top3,
    primary,
    secondary,
  };
}

function makePrimarySentence(brand, top3) {
  if (top3.length === 0) return '目前還沒有相關飲料被提到～';
  const [first, second] = top3;
  const drink1 = first[0];
  const drink2 = second ? second[0] : null;
  return `最多人推薦 ${brand} 的「${drink1}」！${
    drink2 ? `另外「${drink2}」也很常被提到～` : ''
  }`;
}

function makeSecondarySentences(top3) {
  return top3.slice(1).map(([name, data]) => {
    const sugar = top1(data.sugar);
    const ice = top1(data.ice);
    const extras = [sugar, ice].filter(Boolean).join(' · ');
    return `「${name}」${extras ? `（建議：${extras}）` : ''} 也不錯喔！`;
  });
}

function top1(map) {
  if (!map || map.size === 0) return null;
  let best = null;
  for (const [k, v] of map.entries()) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best ? best[0] : null;
}