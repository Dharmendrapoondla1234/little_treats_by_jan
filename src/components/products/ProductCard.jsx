import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { COLORS } from "../../theme";
import { effectivePrice, getProductImages } from "../../utils/productUtils";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, addToCart, toast, onView }) {
  const outOfStock = (product.stock ?? 0) <= 0;
  const hasDiscount = Number(product.discountPercent) > 0;
  const finalPrice = effectivePrice(product);
  const gallery = getProductImages(product);

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: `2px solid ${COLORS.line}`, overflow: "hidden", display: "flex", flexDirection: "column", opacity: outOfStock ? 0.75 : 1 }}>
      <div onClick={() => onView(product)} style={{ background: COLORS.blush, textAlign: "center", padding: 0, position: "relative", height: 150, overflow: "hidden", cursor: "pointer" }}>
        {gallery.length > 0 ? (
          <ProductImage product={product} fallbackSize={54} boxHeight="100%" />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 54 }}>{product.emoji}</span>
          </div>
        )}
        {outOfStock && (
          <div style={{ position: "absolute", top: 8, right: 8, background: COLORS.cocoa, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3 }}>OUT OF STOCK</div>
        )}
        {hasDiscount && !outOfStock && (
          <div style={{ position: "absolute", top: 8, left: 8, background: COLORS.mint, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3 }}>{product.discountPercent}% OFF</div>
        )}
        {gallery.length > 1 && (
          <div style={{
            position: "absolute", bottom: 8, right: 8, background: "rgba(74,42,34,.6)", color: "#fff",
            borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: "Nunito, sans-serif",
          }}>1/{gallery.length}</div>
        )}
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
        {product.tag && !outOfStock && <div style={{ marginBottom: 6 }}><Pill bg="#FFF1D9" color="#B4720F">{product.tag}</Pill></div>}
        <div onClick={() => onView(product)} style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: COLORS.cocoa, cursor: "pointer" }}>{product.name}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F", margin: "4px 0 8px" }}>{product.desc}</div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#B08A7A", marginBottom: 10 }}>{product.weight || product.unit}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 19, color: COLORS.magenta }}>₹{finalPrice}</span>
            {hasDiscount && <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: "#B08A7A", textDecoration: "line-through" }}>₹{product.price}</span>}
          </span>
          <Button variant="primary" disabled={outOfStock} onClick={() => { addToCart(product.id); toast(`${product.name} added to cart`); }} style={{ padding: "9px 14px", fontSize: 13 }}>
            {outOfStock ? "Unavailable" : (<><Plus size={14} /> Add</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}
