/**
 * 🧋 extractors.js（第 8 關：Hybrid Extractor）
 */

import { extractDrinksAI } from "./ai/extractDrinksAI.js";

// ===== 原本的規則抽取（保留） =====

const DRINK_WORDS = [
  "奶茶", "紅茶", "綠茶", "烏龍", "鮮奶茶",
  "四季春", "冬瓜茶", "蜜桃", "凍飲", "冰茶",
  "水果茶", "鐵觀音", "珍珠奶茶", "黑糖", "奶蓋",
];

export function extractMentions(text) {
  const ruleHits = [];

  for (const w of DRINK_WORDS) {
    if (text.includes(w)) {
      ruleHits.push({
        drink: w,
        sugar: extractSugar(text),
        ice: extractIce(text),
      });
    }
  }

  const aiHits = []; // AI 抽取的飲料名
  let aiDrinks = [];
  return (async () => {
    try {
      aiDrinks = await extractDrinksAI(text); // AI 補強
    } catch {
      aiDrinks = [];
    }

    for (const d of aiDrinks) {
      ruleHits.push({
        drink: d,
        sugar: extractSugar(text),
        ice: extractIce(text),
      });
    }

    // 移除重複飲料
    const seen = new Set();
    const unique = [];
    for (const m of ruleHits) {
      if (!seen.has(m.drink)) {
        unique.push(m);
        seen.add(m.drink);
      }
    }

    return unique;
  })();
}

// ===== 甜度冰量抽取（保留） =====

function extractSugar(s) {
  const re = /(無糖|微糖|半糖|正常糖)/;
  const m = s.match(re);
  return m ? m[1] : null;
}

function extractIce(s) {
  const re = /(去冰|微冰|少冰|正常冰|熱)/;
  const m = s.match(re);
  return m ? m[1] : null;
}