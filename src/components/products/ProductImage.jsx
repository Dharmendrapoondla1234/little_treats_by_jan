import React from "react";
import { getProductImages, normalizeImageUrl } from "../../utils/productUtils";

export function ProductImage({ product, fallbackSize = 54, boxHeight = "100%" }) {
  const src = normalizeImageUrl(product?.image || getProductImages(product)[0]);

  if (src) {
    return (
      <img
        src={src}
        alt={product?.name || "Product"}
        style={{ width: "100%", height: boxHeight, objectFit: "cover" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement.innerHTML = `<span style="font-size:${fallbackSize}px">${product?.emoji || "🍪"}</span>`;
        }}
      />
    );
  }

  return <span style={{ fontSize: fallbackSize }}>{product?.emoji || "🍪"}</span>;
}
