import React, { useMemo, useRef, useEffect, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { COLORS } from "../../theme";
import { Button } from "../ui/Button";
import { Pill } from "../ui/Pill";
import { effectivePrice, getProductImages } from "../../utils/productUtils";

export function ProductGalleryModal({ product, addToCart, toast, onClose }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(null);
  const touchX = useRef(null);
  const frameRef = useRef(null);

  const images = useMemo(() => getProductImages(product), [product]);

  useEffect(() => { setIndex(0); setZoom(null); }, [product?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (!product) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, images.length, onClose]);

  if (!product) return null;

  const hasMultiple = images.length > 1;
  const outOfStock = (product.stock ?? 0) <= 0;
  const hasDiscount = Number(product.discountPercent) > 0;
  const finalPrice = effectivePrice(product);

  const go = (delta) => setIndex((i) => (i + delta + images.length) % images.length);

  const handleMouseMove = (e) => {
    if (!frameRef.current || images.length === 0) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoom({ x, y });
  };

  const handleTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchX.current == null || !hasMultiple) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 45) go(-1);
    else if (dx < -45) go(1);
    touchX.current = null;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(42,20,15,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,.4)" }}>
        <div ref={frameRef} onMouseMove={handleMouseMove} onMouseLeave={() => setZoom(null)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ position: "relative", height: 320, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", background: COLORS.blush, cursor: images.length ? "zoom-in" : "default", touchAction: "pan-y" }}>
          {images.length > 0 ? (
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${images[index]})`, backgroundRepeat: "no-repeat", backgroundSize: zoom ? "220%" : "cover", backgroundPosition: zoom ? `${zoom.x}% ${zoom.y}%` : "center", transition: zoom ? "none" : "background-size .15s ease" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 90 }}>{product.emoji}</span>
            </div>
          )}

          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cocoa }}><X size={18} /></button>

          {images.length > 0 && !zoom && (
            <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(74,42,34,.55)", color: "#fff", borderRadius: 999, padding: "3px 9px", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, fontFamily: "Nunito, sans-serif" }}><ZoomIn size={12} /> Hover to zoom</div>
          )}

          {hasMultiple && (
            <>
              <button onClick={() => go(-1)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cocoa }}><ChevronLeft size={18} /></button>
              <button onClick={() => go(1)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cocoa }}><ChevronRight size={18} /></button>
            </>
          )}

          {hasDiscount && !outOfStock && (
            <div style={{ position: "absolute", top: 12, left: 12, background: COLORS.mint, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>{product.discountPercent}% OFF</div>
          )}
        </div>

        {hasMultiple && (
          <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", overflowX: "auto" }}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setIndex(i)} style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, padding: 0, cursor: "pointer", overflow: "hidden", background: COLORS.blush, border: i === index ? `2.5px solid ${COLORS.magenta}` : `2.5px solid transparent`, opacity: i === index ? 1 : 0.7 }}>
                <img src={img} alt={`${product.name} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}

        {hasMultiple && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "10px 0 0" }}>
            {images.map((_, i) => (
              <span key={i} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 999, background: i === index ? COLORS.magenta : COLORS.line, transition: "width .15s ease" }} />
            ))}
          </div>
        )}

        <div style={{ padding: 20 }}>
          {product.tag && <div style={{ marginBottom: 6 }}><Pill bg="#FFF1D9" color="#B4720F">{product.tag}</Pill></div>}
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 22, color: COLORS.cocoa }}>{product.name}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F", margin: "6px 0 10px" }}>{product.desc}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#B08A7A", marginBottom: 14 }}>{product.weight || product.unit}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 24, color: COLORS.magenta }}>₹{finalPrice}</span>
              {hasDiscount && <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, color: "#B08A7A", textDecoration: "line-through" }}>₹{product.price}</span>}
            </span>
            <Button variant="primary" disabled={outOfStock} onClick={() => { addToCart(product.id); toast(`${product.name} added to cart`); }}>
              {outOfStock ? "Unavailable" : (<><Plus size={15} /> Add to cart</>)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
