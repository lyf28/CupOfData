export function splitByPttSections(text) {
  const re = /(?:^|\n)【([^】\n]+)】([\s\S]*?)(?=\n【[^】\n]+】|$)/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const brand = m[1].trim();
    const content = m[2].trim();
    if (brand && content) out.push({ brand, content });
  }
  return out.length ? out : [{ brand: "unknown", content: text }];
}