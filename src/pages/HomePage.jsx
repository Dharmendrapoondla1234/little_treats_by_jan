import React from "react";
import { Heart, Phone, Instagram, Sparkles } from "lucide-react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";
import { Pill } from "../components/ui/Pill";

export function Ribbon() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.marigold})` }} />
      <Heart size={16} color={COLORS.magenta} fill={COLORS.magenta} />
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${COLORS.marigold}, transparent)` }} />
    </div>
  );
}

function OfferStrip({ offers }) {
  if (!offers || offers.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, margin: "24px 0 10px" }}>
      {offers.filter((offer) => offer.active !== false).map((offer) => (
        <div key={offer.id} style={{
          display: "flex", alignItems: "center", gap: 12, background: offer.color || COLORS.blush,
          borderRadius: 18, border: `2px solid ${COLORS.line}`, padding: 14,
          boxShadow: "0 12px 26px rgba(198,41,107,.08)", overflow: "hidden"
        }}>
          {offer.image ? (
            <img src={offer.image} alt={offer.title} style={{ width: 78, height: 78, borderRadius: 14, objectFit: "cover", objectPosition: "center", flexShrink: 0, border: `2px solid rgba(74,42,34,.08)` }} />
          ) : <div style={{ width: 78, height: 78, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.45)", fontSize: 28 }}>🎉</div>}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 13, color: COLORS.cocoa, textTransform: "uppercase", letterSpacing: 0.7 }}>{offer.title}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: "#6B4A3E", marginTop: 4 }}>{offer.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage({ setPage, offers }) {
  const features = [
    { icon: "🌿", title: "Premium Ingredients", sub: "Made with the finest ingredients" },
    { icon: "💗", title: "Made With Love", sub: "Every bite baked with care" },
    { icon: "🧁", title: "Homemade & Fresh", sub: "Small batches for best quality" },
    { icon: "🛡️", title: "Hygienic & Safe", sub: "Clean, safe & carefully packed" },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 18px 60px" }}>
      <div style={{
        borderRadius: 28, padding: "40px 26px", textAlign: "center",
        background: `radial-gradient(circle at 30% 20%, ${COLORS.blush}, ${COLORS.cream})`,
        border: `2px solid ${COLORS.line}`,
      }}>
        <img src="/logo.jpg" alt="Little Treats by Jan" style={{ height: 90, width: 90, objectFit: "cover", borderRadius: "50%", border: `3px solid ${COLORS.marigold}`, margin: "0 auto 14px" }} />
        <Pill>Baked with Love</Pill>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, margin: "14px 0 6px", color: COLORS.cocoa, lineHeight: 1.15 }}>
          Homemade goodness,<br /><span style={{ color: COLORS.magenta }}>made with love</span>
        </h1>
        <p style={{ fontFamily: "Nunito, sans-serif", color: "#6B4A3E", fontSize: 15, maxWidth: 420, margin: "0 auto 22px" }}>
          Cookies, biscuits, and more — made with the finest ingredients for you and your loved ones.
        </p>
        <Button variant="primary" onClick={() => setPage("products")} style={{ margin: "0 auto" }}>
          <Sparkles size={16} /> Shop the jars
        </Button>
      </div>

      <Ribbon />
      <OfferStrip offers={offers} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 14 }}>
        {features.map((f) => (
          <div key={f.title} style={{ background: "#fff", borderRadius: 18, padding: "18px 12px", textAlign: "center", border: `2px solid ${COLORS.line}` }}>
            <div style={{ fontSize: 26 }}>{f.icon}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: COLORS.cocoa, marginTop: 6 }}>{f.title}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#8A6C5F", marginTop: 2 }}>{f.sub}</div>
          </div>
        ))}
      </div>

      <Ribbon />

      <div style={{
        borderRadius: 22, padding: "22px", background: COLORS.cocoa, color: "#fff",
        display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Phone size={18} color={COLORS.marigold} />
          <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14 }}>Orders & enquiries: 8897987795</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Instagram size={18} color={COLORS.marigold} />
          <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 14 }}>@littletreats_by_jan</span>
        </div>
      </div>
    </div>
  );
}
