/**
 * 🧋 CupOfData Recommend CLI - v0.1
 * 整合 PTT 爬取結果與推薦系統
 */

import 'dotenv/config';
import { fetchArticle } from './fetchArticle.js';
import { buildRecommendation } from '../recommender.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { filterBrandContext } from '../ai/filterBrandContext.js';
import { summarizeMentions } from '../ai/summarizeMentions.js';
import { segmentByBrandAI } from '../ai/segmentByBrandAI.js';
import { splitByBrand } from '../utils/splitByBrand.js';
import { splitByPttSections } from '../utils/splitByPttSections.js';
import { isRecommendationSentence } from '../ai/isRecommendationSentence.js';

const UA = process.env.USER_AGENT || 'CupOfData/0.1 (+contact:you@example.com)';
const BASE = 'https://www.ptt.cc';
const BOARD = 'Drink';
const RATE_LIMIT_MS = Number(process.env.RATE_LIMIT_MS || 1200);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHTML(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: 'over18=1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function getLatestIndex() {
  const html = await fetchHTML(`${BASE}/bbs/${BOARD}/index.html`);
  const $ = cheerio.load(html);
  const prevHref = $('.btn.wide:contains("上頁")').attr('href');
  const m = prevHref?.match(/index(\d+)\.html/);
  return m ? Number(m[1]) + 1 : null;
}

function parseList(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('.r-ent').each((_, el) => {
    const title = $(el).find('.title').text().trim();
    const href = $(el).find('.title a').attr('href');
    if (title && href) rows.push({ title, url: BASE + href });
  });
  return rows;
}

/**
 * CLI entry:
 *   node src/ptt/recommend.js <brand> [pages=8] [limit=20]
 */
async function main() {
  const args = process.argv.slice(2);
  const [brand = '', pagesArg = '8', limitArg = '20'] = args;
  const LOG_MODE = args.includes('--log');
  const pages = Number(pagesArg);
  const limit = Number(limitArg);

  if (!brand) {
    console.error('Usage: node src/ptt/recommend.js <品牌> [pages] [limit]');
    process.exit(1);
  }

  console.log(`🔎 開始分析 ${brand}｜抓取 ${pages} 頁內文（最多 ${limit} 篇）`);

  const latest = await getLatestIndex();
  const list = [];

  for (let i = 0; i < pages; i++) {
    const idx = latest - i;
    const url = `${BASE}/bbs/${BOARD}/index${idx}.html`;
    try {
      list.push(...parseList(await fetchHTML(url)));
    } catch (e) {
      console.warn(`  ↳ 讀取失敗：${url}｜${e.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

  const seen = new Set();
  const unique = list.filter((r) => !seen.has(r.url) && seen.add(r.url));
  const targets = unique.filter((r) => r.title.includes(brand)).slice(0, limit);

  if (targets.length === 0) {
    console.log('😿 沒有符合的文章，換品牌或加大 pages/limit 試試。');
    return;
  }

  console.log(`🧋 共有 ${targets.length} 篇文章命中，開始抓取內文與留言...`);

  const texts = [];
  for (const [i, post] of targets.entries()) {
    try {
      const art = await fetchArticle(post.url);

      // 先試 AI 分段；AI 不可用或失敗時退回規則分段；再不行就整篇
      // 🥇 1️⃣ 先用 PTT 斷頭格式切段（最準）
      let sections = splitByPttSections(art.content);

      // 🥈 2️⃣ 對 "unknown" 的段落再用 AI 補強
      let segments = [];
      for (const sec of sections) {
        if (sec.brand === "unknown") {
          const aiSeg = await segmentByBrandAI(sec.content);
          segments.push(...aiSeg);
        } else {
          segments.push(sec);
        }
      }

      // 🥉 3️⃣ 只保留與目標品牌完全相等的段落
      const relevantSegments = segments
        .filter((s) => s.brand === brand)
        .map((s) => s.content);

      // 🧱 4️⃣ 組合候選句（標題 + 內容 + 留言）
            // 🧱 4️⃣ 組合候選句：標題單獨處理，其餘才丟 AI 篩
      const titleLines = art.title.includes(brand) ? [art.title] : [];
      let otherLines = [
        ...relevantSegments,
        ...(art.comments || []).map((c) => c.text),
      ];

      // 🚫 移除 generic 飲品（紅茶、綠茶、奶茶）但沒出現品牌的句子（避免誤判）
      const genericWords = ["紅茶", "綠茶", "奶茶", "烏龍茶"];
      otherLines = otherLines.filter((line) => {
        if (genericWords.some((g) => line.includes(g)) && !line.includes(brand)) {
          return false;
        }
        return true;
      });

      // 🎛️ 6️⃣ AI 雙重過濾只套在「內文＋留言」
      const filtered = [];

      // 6-1. 標題只要有品牌就直接保留（不需要 AI 判斷）
      for (const line of titleLines) {
        filtered.push(line);
      }

      // 6-2. 內文＋留言才丟給 AI 做品牌＋評價句判斷
      // 6-2. 內文＋留言：只要段落判定屬於該品牌 → 全部保留
      for (const line of otherLines) {
        filtered.push(line);
      }

      if (filtered.length > 0) {
        texts.push(filtered.join('\n'));
        console.log(`  [${i + 1}/${targets.length}] ✅ ${post.title}（${filtered.length} 條相關句）`);

        if (LOG_MODE) {
          console.log("    ── Log mode │ 留下句子：");
          for (const line of filtered) {
            console.log("       •", line);
          }
        }

      } else {
        console.log(`  [${i + 1}/${targets.length}] 🚫 ${post.title}（無相關內容）`);

        if (LOG_MODE) {
          console.log("    ── Log mode │ 沒有留下任何句子");
        }
      }
    } catch (e) {
      console.warn(`  [${i + 1}/${targets.length}] ⚠️ ${post.url}｜${e.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

    const result = await buildRecommendation(brand, texts);

  // 如果完全沒有飲料被提到，就不要硬叫 AI 編故事
  if (!result.top3 || result.top3.length === 0) {
    console.log('\n✅ 推薦結果（統計版）：');
    console.log('目前還沒有可靠的飲料推薦（相關心得太少或都被過濾掉）～');

    console.log('\n🪄 AI 摘要：');
    console.log(`目前在 PTT 上關於 ${brand} 的實際飲料評價太少，暫時無法形成推薦。`);

    console.log('\n📊 Top 3：');
    return;
  }

  console.log('\n✅ 推薦結果（統計版）：');
  console.log(result.primary);
  for (const s of result.secondary) console.log('・', s);

  const summary = await summarizeMentions(brand, result.top3);
  console.log('\n🪄 AI 摘要：');
  console.log(summary);

  console.log('\n📊 Top 3：');
  for (const [drink, data] of result.top3) {
    console.log(`- ${drink} (${data.count} 次)`);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});