import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const UA = process.env.USER_AGENT || 'CupOfData/0.1 (+project:unknown)';
const BASE = 'https://www.ptt.cc';
const BOARD = 'Drink';
const RATE_LIMIT_MS = Number(process.env.RATE_LIMIT_MS || 1200);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: 'over18=1' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function getLatestIndex() {
  const html = await fetchHTML(`${BASE}/bbs/${BOARD}/index.html`);
  const $ = cheerio.load(html);
  const prevHref = $('.btn.wide:contains("上頁")').attr('href');
  const match = prevHref?.match(/index(\d+)\.html/);
  return match ? Number(match[1]) + 1 : null;
}

function parseList(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $('.r-ent').each((_, el) => {
    const title = $(el).find('.title').text().trim();
    const href = $(el).find('.title a').attr('href');
    const date = $(el).find('.meta .date').text().trim();
    if (title && href) rows.push({ date, title, url: BASE + href });
  });
  return rows;
}

async function main() {
  const [keyword = '', pagesArg = '3'] = process.argv.slice(2);
  const pages = Number(pagesArg);
  const latest = await getLatestIndex();
  const out = [];

  console.log(`🔎 抓取 PTT/${BOARD}：關鍵字「${keyword || '（不過濾）'}」 往回 ${pages} 頁`);

  for (let i = 0; i < pages; i++) {
    const idx = latest - i;
    const url = `${BASE}/bbs/${BOARD}/index${idx}.html`;
    try {
      const html = await fetchHTML(url);
      out.push(...parseList(html));
    } catch (err) {
      console.warn(`  ↳ 無法讀取 ${url}: ${err.message}`);
    }
    await wait(RATE_LIMIT_MS);
  }

  // 去重
  const seen = new Set();
  const unique = out.filter((r) => !seen.has(r.url) && seen.add(r.url));

  // 關鍵字過濾
  const filtered = keyword
    ? unique.filter((r) => r.title.includes(keyword))
    : unique;

  if (filtered.length === 0) {
    console.log('😿 沒有符合的文章。');
    return;
  }

  console.log(`🧋 命中 ${filtered.length} 筆（顯示前 30 筆）：`);
  for (const r of filtered.slice(0, 30)) {
    console.log(`- ${r.date}｜${r.title}｜${r.url}`);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});