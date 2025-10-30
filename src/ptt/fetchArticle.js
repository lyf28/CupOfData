import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const UA   = process.env.USER_AGENT || 'CupOfData/0.1 (+project:unknown)';
const BASE = 'https://www.ptt.cc';

async function fetchHTML(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: 'over18=1' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function fetchArticle(url) {
  const html = await fetchHTML(url);
  const $    = cheerio.load(html);

  // 抓基本 meta
  const title  = $('#main-content .article-meta-value').eq(2).text().trim();
  const author = $('#main-content .article-meta-value').eq(0).text().trim();
  const date   = $('#main-content .article-meta-value').eq(3).text().trim();

  // ✅ 先抓留言（.push）再清理其他元素
  const comments = [];
  $('.push').each((_, el) => {
    const tag  = $(el).find('.push-tag').text().trim();
    const user = $(el).find('.push-userid').text().trim();
    const text = $(el).find('.push-content').text().replace(/^: /, '').trim();
    const time = $(el).find('.push-ipdatetime').text().trim();
    if (text) comments.push({ tag, user, text, time });
  });

  // 然後清理 meta / push，留下內文文字
  $('#main-content .article-meta-tag, #main-content .article-meta-value, .push, .f2').remove();
  const content = $('#main-content').text().trim().replace(/\s+/g, ' ');

  return { url, title, author, date, content, comments };
}

if (process.argv[1].endsWith('fetchArticle.js')) {
  const testUrl = process.argv[2];
  if (!testUrl) {
    console.error('Usage: node src/ptt/fetchArticle.js <PTT_URL>');
    process.exit(1);
  }
  const data = await fetchArticle(testUrl);
  console.log(JSON.stringify(data, null, 2));
}