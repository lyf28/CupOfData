import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const UA = process.env.USER_AGENT || 'CupOfData/0.1 (+project:unknown)';
const BASE = 'https://www.ptt.cc';
const URL  = `${BASE}/bbs/Drink/index.html`;

async function main() {
  const res = await fetch(URL, {
    headers: { 'User-Agent': UA, Cookie: 'over18=1' },
  });
  if (!res.ok) {
    console.error('HTTP error:', res.status);
    process.exit(1);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const rows = [];
  $('.r-ent').each((_, el) => {
    const title = $(el).find('.title').text().trim();
    const href  = $(el).find('.title a').attr('href');
    const date  = $(el).find('.meta .date').text().trim();
    if (title && href) rows.push({ date, title, url: BASE + href });
  });

  if (rows.length === 0) {
    console.log('😿 沒抓到任何文章。');
    return;
  }

  console.log('🧋 PTT《drink》最新一頁文章：');
  for (const r of rows.slice(0, 30)) {
    console.log(`- ${r.date}｜${r.title}｜${r.url}`);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});