import React from "react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";
import { Pill } from "../components/ui/Pill";

function statusColor(status) {
  return { Pending: "#B4720F", Confirmed: COLORS.mint, Preparing: COLORS.marigold, "Out for Delivery": COLORS.magenta, Delivered: "#2E8F55", Declined: "#A03030" }[status] || COLORS.cocoa;
}

export function OrdersPage({ orders, user, setPage }) {
  const mine = orders.filter((o) => (o.userEmail || "").toLowerCase() === (user?.email || "").toLowerCase());
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 16 }}>My Orders</h2>
      {mine.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#8A6C5F", fontFamily: "Nunito, sans-serif" }}>
          No orders yet.
          <div style={{ marginTop: 14 }}><Button variant="primary" onClick={() => setPage("products")}>Start Shopping</Button></div>
        </div>
      ) : mine.slice().reverse().map((o) => (
        <div key={o.id} style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: COLORS.cocoa }}>Order #{o.id}</span>
            <Pill color={statusColor(o.status)} bg="#F5EDE6">{o.status}</Pill>
          </div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: "#8A6C5F" }}>{new Date(o.date).toLocaleString()}</div>
          <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 13 }}>
            {o.itemsText ? (
              <div style={{ color: "#6B4A3E" }}>{o.itemsText}</div>
            ) : (
              (o.items || []).map((i) => <div key={i.id} style={{ color: "#6B4A3E" }}>{i.name} × {i.qty}</div>)
            )}
          </div>
          <div style={{ marginTop: 8, fontWeight: 800, color: COLORS.magenta, fontFamily: "Nunito, sans-serif" }}>₹{o.total}</div>
        </div>
      ))}
    </div>
  );
}
