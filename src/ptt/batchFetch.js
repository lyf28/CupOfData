import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { fetchArticle } from './fetchArticle.js';

const UA = process.env.USER_AGENT || 'CupOfData/0.1 (+project:unknown)';
const BASE = 'https://www.ptt.cc';
const BOARD = 'Drink';
const RATE_LIMIT_MS = Number(process.env.RATE_LIMIT_MS || 1200);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHTMLOnce(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: 'over18=1' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchHTML(url, { retries = 3 } = {}) {
  let err;
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchHTMLOnce(url);
    } catch (e) {
      err = e;
      const backoff = RATE_LIMIT_MS + Math.floor(Math.random() * 400) + i * 600;
      console.warn(`  ↳ 重試 ${i + 1}/${retries}：${url}｜${e.message}（${backoff}ms 後）`);
      await wait(backoff);
    }
  }
  throw err;
}

async function getLatestIndex() {
  const html = await fetchHTML(`${BASE}/bbs/${BOARD}/index.html`);
  const $ = cheerio.load(html);
  const prevHref = $('.btn.wide:contains("上頁")').attr('href');
  const m = prevHref?.match(/index(\d+)\.html/);
  if (!m) throw new Error('找不到最新 index');
  return Number(m[1]) + 1;
}

function parseList(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('.r-ent').each((_, el) => {
    const title = $(el).find('.title').text().trim();
    const href  = $(el).find('.title a').attr('href');
    const date  = $(el).find('.meta .date').text().trim();
    if (title && href) rows.push({ date, title, url: BASE + href });
  });
  return rows;
}

/**
 * CLI:
 *   node src/ptt/batchFetch.js <keywordOrEmpty> <pages> <limit>
 * e.g.
 *   node src/ptt/batchFetch.js 五十嵐 15 30
 *   node src/ptt/batchFetch.js "" 5 20
 */
async function main() {
  const [keyword = '', pagesArg = '5', limitArg = '30'] = process.argv.slice(2);
  const pages = Number(pagesArg);
  const limit = Number(limitArg);

  console.log(`🔎 列表抓取：PTT/${BOARD} 關鍵字「${keyword || '（不過濾）'}」 往回 ${pages} 頁，最多 ${limit} 篇`);

  const latest = await getLatestIndex();
  const list = [];

  for (let i = 0; i < pages; i++) {
    const idx = latest - i;
    const url = `${BASE}/bbs/${BOARD}/index${idx}.html`;
    try {
      const html = await fetchHTML(url);
      list.push(...parseList(html));
    } catch (e) {
      console.warn(`  ↳ 索引讀取失敗：${url}｜${e.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

  // 去重並關鍵字過濾
  const seen = new Set();
  const unique = list.filter(r => !seen.has(r.url) && seen.add(r.url));
  const filtered = keyword ? unique.filter(r => r.title.includes(keyword)) : unique;
  const targets = filtered.slice(0, limit);

  if (targets.length === 0) {
    console.log('😿 沒有符合的文章（試著加大 pages 或換關鍵字）');
    return;
  }

  console.log(`🧋 準備抓內文：共 ${targets.length} 篇（依序節流 ${RATE_LIMIT_MS}ms）`);

  // 逐篇抓取文章內容＋留言
  const results = [];
  for (const [i, post] of targets.entries()) {
    try {
      const art = await fetchArticle(post.url);
      results.push({ ...post, ...art });
      console.log(`  [${i + 1}/${targets.length}] ✅ ${post.title}`);
    } catch (e) {
      console.warn(`  [${i + 1}/${targets.length}] ⚠️ 失敗：${post.url}｜${e.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

  // 輸出摘要（避免一次印超大）
  let withComments = 0;
  for (const r of results) if (r.comments?.length) withComments++;
  console.log('\n📊 統計：');
  console.log(`- 文章總數：${results.length}`);
  console.log(`- 含留言的文章：${withComments}`);
  console.log(`- 範例：`);
  for (const r of results.slice(0, 3)) {
    console.log(`  • ${r.title} ｜ 留言數：${r.comments?.length || 0}`);
  }

  // 若需要 JSON 給後續分析，可取消下面註解：
  // console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});