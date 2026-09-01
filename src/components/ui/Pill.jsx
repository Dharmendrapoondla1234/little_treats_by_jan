import React from "react";
import { COLORS } from "../../theme";

export function Pill({ children, color = COLORS.magenta, bg = COLORS.blush }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase",
      color, background: bg,
    }}>{children}</span>
  );
}
