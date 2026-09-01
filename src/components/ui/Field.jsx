import React from "react";
import { COLORS } from "../../theme";

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6, letterSpacing: 0.2 }}>{label}</span>
      <input
        {...props}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 12, border: `2px solid ${COLORS.line}`,
          fontFamily: "Nunito, sans-serif", fontSize: 14.5, outline: "none", boxSizing: "border-box",
          background: "#fff", color: COLORS.cocoa,
        }}
        onFocus={(e) => (e.target.style.borderColor = COLORS.magenta)}
        onBlur={(e) => (e.target.style.borderColor = COLORS.line)}
      />
    </label>
  );
}
