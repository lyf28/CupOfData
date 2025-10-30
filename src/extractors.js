/**
 * 🧋 CupOfData Extractors - v0.1
 * 定義飲料、甜度、冰量關鍵詞集
 * 後續會用於關鍵字匹配與抽取
 */

export const DRINKS = [
  '珍珠奶茶',
  '波霸奶茶',
  '奶茶',
  '紅茶',
  '綠茶',
  '青茶',
  '四季春',
  '烏龍',
  '冬瓜茶',
  '蜜桃凍飲',
  '阿薩姆',
  '鐵觀音',
  '豆漿紅茶',
  '金蜜檸檬',
  '翡翠檸檬',
  '柳橙綠',
  '熟成紅茶',
  '紅茶拿鐵',
  '黑糖珍珠',
];

export const SUGARS = [
  '無糖',
  '微糖',
  '少糖',
  '半糖',
  '正常糖',
  '多糖',
];

export const ICES = [
  '去冰',
  '微冰',
  '少冰',
  '正常冰',
  '多冰',
  '熱',
];

/**
 * extractMentions(text)
 * @param {string} text - 任意留言或內文
 * @returns {Array<{drink:string,sugar:string|null,ice:string|null,snippet:string}>}
 */
export function extractMentions(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text
    .split(/[。！？!?\n\r]/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results = [];

  for (const line of lines) {
    const drink = [...DRINKS].sort((a, b) => b.length - a.length).find((d) => line.includes(d));
    if (!drink) continue;
    const sugar = SUGARS.find((s) => line.includes(s)) || null;
    const ice = ICES.find((i) => line.includes(i)) || null;
    results.push({ drink, sugar, ice, snippet: line.slice(0, 80) });
    }


  return results;
}