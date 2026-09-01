import React from "react";
import { ProductCard } from "../components/products/ProductCard";
import { COLORS } from "../theme";

export function ProductsPage({ products, addToCart, toast, onView }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: COLORS.cocoa }}>Our Little Treats</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", color: "#8A6C5F", fontSize: 13.5, marginBottom: 18 }}>Small batches, freshly baked and carefully packed.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} addToCart={addToCart} toast={toast} onView={onView} />
        ))}
      </div>
    </div>
  );
}
