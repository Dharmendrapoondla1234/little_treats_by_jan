import React from "react";
import { Bell } from "lucide-react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";

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

export function ConfirmationPage({ lastOrder, setPage }) {
  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "48px 18px 60px", textAlign: "center" }}>
      <BiteProgress step={2} />
      <div style={{ fontSize: 56 }}>🧁</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, margin: "10px 0 6px" }}>Order Received!</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", color: "#8A6C5F", fontSize: 14, marginBottom: 4 }}>
        Order <b style={{ color: COLORS.magenta }}>#{lastOrder?.id}</b> is <b style={{ color: "#B4720F" }}>pending confirmation</b> from Little Treats.
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: COLORS.mint, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 13, margin: "10px 0 20px" }}>
        <Bell size={15} /> We've notified you — you'll get another notification once it's confirmed
      </div>
      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 16, textAlign: "left", fontFamily: "Nunito, sans-serif" }}>
        <div style={{ fontWeight: 800, color: COLORS.cocoa, marginBottom: 8 }}>Delivering to</div>
        <div style={{ fontSize: 13, color: "#6B4A3E" }}>{lastOrder?.address.name}, {lastOrder?.address.line1}, {lastOrder?.address.city} - {lastOrder?.address.pincode}</div>
        <div style={{ fontSize: 13, color: "#6B4A3E", marginTop: 4 }}>📞 {lastOrder?.address.phone}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Button variant="ghost" full onClick={() => setPage("products")}>Order More</Button>
        <Button variant="primary" full onClick={() => setPage("orders")}>Track Orders</Button>
      </div>
    </div>
  );
}
