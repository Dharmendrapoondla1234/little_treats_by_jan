import React from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";
import { effectivePrice } from "../utils/productUtils";

function BiteProgress({ step }) {
  const steps = ["Cart", "Address", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "6px 0 24px" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: i <= step ? COLORS.magenta : "#fff", border: `2px solid ${i <= step ? COLORS.magenta : COLORS.line}`, color: i <= step ? "#fff" : "#B08A7A", fontSize: 15 }}>
              {i < step ? "✓" : "🍪"}
            </div>
            <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10.5, color: i <= step ? COLORS.magenta : "#B08A7A" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 30, height: 2, background: i < step ? COLORS.magenta : COLORS.line, marginBottom: 16 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function CartPage({ cart, products, updateQty, removeFromCart, setPage, user }) {
  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.id) })).filter((i) => i.product);
  const total = items.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 18px 60px" }}>
      <BiteProgress step={0} />
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 16 }}>Your Cart</h2>
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#8A6C5F", fontFamily: "Nunito, sans-serif" }}>
          <div style={{ fontSize: 40 }}>🧺</div>
          Your cart is empty. Add some little treats!
          <div style={{ marginTop: 16 }}><Button variant="primary" onClick={() => setPage("products")}>Browse Products</Button></div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((i) => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 12 }}>
                <div style={{ fontSize: 30, background: COLORS.blush, borderRadius: 12, width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>{i.product.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.cocoa }}>{i.product.name}</div>
                  <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: COLORS.magenta, fontWeight: 700 }}>₹{effectivePrice(i.product)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.cream, borderRadius: 10, padding: "4px 8px" }}>
                  <button onClick={() => updateQty(i.id, i.qty - 1)} style={{ border: "none", background: "none", cursor: "pointer", color: COLORS.magenta }}><Minus size={15} /></button>
                  <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, minWidth: 16, textAlign: "center" }}>{i.qty}</span>
                  <button onClick={() => updateQty(i.id, i.qty + 1)} style={{ border: "none", background: "none", cursor: "pointer", color: COLORS.magenta }}><Plus size={15} /></button>
                </div>
                <button onClick={() => removeFromCart(i.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#C6296B" }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 4px", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.cocoa }}>
            <span>Total</span><span>₹{total}</span>
          </div>
          <Button full variant="primary" onClick={() => setPage(user ? "checkout" : "login")}>
            {user ? "Proceed to Address" : "Login to Checkout"}
          </Button>
        </>
      )}
    </div>
  );
}
