/**
 * 🧋 CupOfData Recommend CLI - v0.1
 * 整合 PTT 爬取結果與推薦系統
 */

import 'dotenv/config';
import { fetchArticle } from './fetchArticle.js';
import { buildRecommendation } from '../recommender.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

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
  const [brand = '', pagesArg = '8', limitArg = '20'] = process.argv.slice(2);
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
      texts.push([post.title, art.content, (art.comments || []).map(c => c.text).join(' ')].join('\n'));
      console.log(`  [${i + 1}/${targets.length}] ✅ ${post.title}`);
    } catch (e) {
      console.warn(`  [${i + 1}/${targets.length}] ⚠️ ${post.url}｜${e.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

  const result = buildRecommendation(brand, texts);
  console.log('\n✅ 推薦結果：');
  console.log(result.primary);
  for (const s of result.secondary) console.log('・', s);

  console.log('\n📊 Top 3：');
  for (const [drink, data] of result.top3) {
    console.log(`- ${drink} (${data.count} 次)`);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});