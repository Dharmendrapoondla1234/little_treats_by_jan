export function effectivePrice(product) {
  const pct = Number(product?.discountPercent) || 0;
  if (pct <= 0) return product.price;
  return Math.round(product.price * (1 - pct / 100));
}

export function normalizeImageUrl(image) {
  const raw = String(image || "").trim();
  if (!raw) return "";

  const fileIdMatch = raw.match(/(?:id=|\/d\/|file\/d\/)([A-Za-z0-9_-]{10,})/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}`;
  }

  return raw;
}

export function getProductImages(p) {
  if (!p) return [];
  let list = [];
  if (Array.isArray(p.images)) list = p.images;
  else if (typeof p.images === "string" && p.images.trim()) list = p.images.split("|");
  else if (p.image) list = [p.image];
  return list.map(normalizeImageUrl).filter((u) => u && u.trim().length > 0);
}
