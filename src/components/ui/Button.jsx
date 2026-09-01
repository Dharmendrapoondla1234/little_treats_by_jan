import React from "react";
import { COLORS } from "../../theme";

export function Button({ children, onClick, variant = "primary", style, disabled, type = "button", full }) {
  const base = {
    fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14.5,
    padding: "12px 20px", borderRadius: 14, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "transform .12s ease, box-shadow .12s ease", opacity: disabled ? 0.55 : 1,
    width: full ? "100%" : "auto",
  };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${COLORS.magenta}, ${COLORS.magentaDark})`, color: "#fff", boxShadow: "0 8px 20px rgba(198,41,107,.28)" },
    gold: { background: `linear-gradient(135deg, ${COLORS.marigold}, #D98F22)`, color: "#4A2A22", boxShadow: "0 8px 18px rgba(232,163,61,.35)" },
    ghost: { background: "#fff", color: COLORS.cocoa, border: `2px solid ${COLORS.line}` },
    danger: { background: "#fff", color: "#C6296B", border: "2px solid #F4C4D6" },
    dark: { background: COLORS.cocoa, color: "#fff" },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}
