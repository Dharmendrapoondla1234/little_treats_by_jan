import React from "react";
import { Bell } from "lucide-react";
import { COLORS } from "../../theme";

export function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: "#fff",
          borderRadius: 14,
          padding: "12px 16px",
          minWidth: 240,
          boxShadow: "0 12px 30px rgba(74,42,34,.2)",
          border: `2px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          animation: "lt-in .25s ease",
        }}>
          <Bell size={18} color={COLORS.magenta} />
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13.5, color: COLORS.cocoa, fontWeight: 700 }}>{t.msg}</div>
        </div>
      ))}
      <style>{`@keyframes lt-in{from{opacity:0; transform:translateX(20px)} to{opacity:1; transform:translateX(0)}}`}</style>
    </div>
  );
}
