/**
 * ✂️ splitByBrand(text, knownBrands)
 * 將文章依照已知品牌名稱切成多段
 * 📦 用於 fallback 或測試對照，不在主流程中使用
 */
export function splitByBrand(text, knownBrands) {
  if (!knownBrands || knownBrands.length === 0)
    return [{ brand: "unknown", content: text }];

  const regex = new RegExp(`(${knownBrands.join("|")})`, "g");
  const parts = text.split(regex);
  const segments = [];

  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i].trim();
    if (!seg) continue;
    if (knownBrands.includes(seg) && i + 1 < parts.length) {
      segments.push({ brand: seg, content: parts[i + 1].trim() });
    }
  }
  return segments.length ? segments : [{ brand: "unknown", content: text }];
}