import React, { useState, useMemo } from "react";
import {
  ShoppingCart, User, LogOut, Plus, Minus, Trash2, Check,
  MapPin, Package, Settings, Home, Heart, Instagram, Phone,
  ChevronLeft, Star, Lock, Mail, Sparkles, ClipboardList, Bell
} from "lucide-react";

/* ---------------------------------------------------------------
   LITTLE TREATS BY JAN — storefront + admin
   Palette: magenta #C6296B, marigold #E8A33D, cocoa #4A2A22,
            cream #FCF1E6, blush #FBE3EA, sage-mint accent #2E8F8B
   Type: display = 'Playfair Display' (headline warmth),
         body = 'Nunito' (rounded, friendly bakery voice)
   Signature: hand-tied "ribbon" divider + a cookie-bite progress
              tracker on the order flow (bite marks fill in as
              you move from Cart -> Address -> Confirm)
----------------------------------------------------------------- */

const FONT_LINK_ID = "lt-fonts";
if (typeof document !== "undefined" && !document.getElementById(FONT_LINK_ID)) {
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap";
  document.head.appendChild(link);
}

// Loads the Razorpay Checkout widget script once, on demand (only when the
// customer is actually about to pay), and resolves once it's ready to use.
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay script")));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.body.appendChild(script);
  });
}

// Compresses an image file to a small JPEG data URL via canvas, so payment
// screenshots stay small enough to chunk-upload quickly and cheaply.
function compressImageFile(file, maxDimension = 700, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load the image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
        else if (height > maxDimension) { width = Math.round((width * maxDimension) / height); height = maxDimension; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Splits a base64 data URL into small chunks and uploads them one at a time
// via GET (see the note in google-apps-script-backend.gs), then asks the
// backend to reassemble and save them to Drive. Returns the final image URL.
async function uploadImageInChunks(dataUrl, callSheet, onProgress) {
  const [, mimeAndData] = dataUrl.split("data:");
  const mimeType = mimeAndData.split(";")[0];
  const base64 = dataUrl.split(",")[1];

  const CHUNK_SIZE = 3000;
  const chunks = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.slice(i, i + CHUNK_SIZE));

  const uploadId = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  for (let i = 0; i < chunks.length; i++) {
    const result = await callSheet({ action: "uploadImageChunk", uploadId, index: i, chunk: chunks[i] });
    if (!result.ok) throw new Error(result.error || "Upload failed partway through.");
    if (onProgress) onProgress(i + 1, chunks.length);
  }

  const final = await callSheet({ action: "finalizeImageUpload", uploadId, total: chunks.length, mimeType });
  if (!final.ok) throw new Error(final.error || "Couldn't finalize the upload.");
  return final.url;
}

const COLORS = {
  magenta: "#C6296B",
  magentaDark: "#9E1E54",
  marigold: "#E8A33D",
  cocoa: "#4A2A22",
  cream: "#FCF1E6",
  blush: "#FBE3EA",
  mint: "#2E8F8B",
  line: "#F0D9C8",
};

/* ---------------- Seed data ---------------- */

const SEED_PRODUCTS = [
  { id: "p1", name: "Double Choco Bites", price: 249, unit: "250g jar", weight: "250g", stock: 25, tag: "Bestseller", emoji: "🍫", image: "", discountPercent: 15, desc: "Rich cocoa cookie bites rolled in dark chocolate chunks." },
  { id: "p2", name: "Classic Butter Cookies", price: 199, unit: "250g jar", weight: "250g", stock: 30, tag: "Bestseller", emoji: "🍪", image: "", discountPercent: 0, desc: "Melt-in-mouth butter cookies, small-batch baked." },
  { id: "p3", name: "Choco Chip Crunch", price: 229, unit: "250g jar", weight: "250g", stock: 18, tag: "New", emoji: "🍪", image: "", discountPercent: 0, desc: "Golden cookies loaded with chocolate chips." },
  { id: "p4", name: "Assorted Biscuit Mix", price: 279, unit: "300g jar", weight: "300g", stock: 12, tag: "Combo", emoji: "🧁", image: "", discountPercent: 10, desc: "Our four best flavours mixed into one happy jar." },
  { id: "p5", name: "Nutty Cocoa Rounds", price: 259, unit: "250g jar", weight: "250g", stock: 0, tag: "New", emoji: "🍫", image: "", discountPercent: 0, desc: "Dark cocoa cookies studded with roasted nuts." },
  { id: "p6", name: "Honey Oat Biscuits", price: 219, unit: "250g jar", weight: "250g", stock: 20, tag: "", emoji: "🍪", image: "", discountPercent: 0, desc: "Wholesome oats sweetened with honey, lightly crisp." },
];

// Rounds to the nearest rupee for a clean displayed/charged price.
function effectivePrice(product) {
  const pct = Number(product?.discountPercent) || 0;
  if (pct <= 0) return product.price;
  return Math.round(product.price * (1 - pct / 100));
}

const ADMIN_EMAIL = "admin@littletreats.com";
const ADMIN_PASSWORD = "admin123";

/* ---------------- Small UI atoms ---------------- */

function Ribbon() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.marigold})` }} />
      <Heart size={16} color={COLORS.magenta} fill={COLORS.magenta} />
      <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${COLORS.marigold}, transparent)` }} />
    </div>
  );
}

function Pill({ children, color = COLORS.magenta, bg = COLORS.blush }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase",
      color, background: bg,
    }}>{children}</span>
  );
}

function Button({ children, onClick, variant = "primary", style, disabled, type = "button", full }) {
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

function Field({ label, ...props }) {
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

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: "#fff", borderRadius: 14, padding: "12px 16px", minWidth: 240,
          boxShadow: "0 12px 30px rgba(74,42,34,.2)", border: `2px solid ${COLORS.line}`,
          display: "flex", alignItems: "center", gap: 10, animation: "lt-in .25s ease",
        }}>
          <Bell size={18} color={COLORS.magenta} />
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 13.5, color: COLORS.cocoa, fontWeight: 700 }}>{t.msg}</div>
        </div>
      ))}
      <style>{`@keyframes lt-in{from{opacity:0; transform:translateX(20px)} to{opacity:1; transform:translateX(0)}}`}</style>
    </div>
  );
}

/* ---------------- Header ---------------- */

function Header({ page, setPage, user, logout, cartCount }) {
  const NavBtn = ({ id, icon, label }) => (
    <button onClick={() => setPage(id)} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none",
      cursor: "pointer", color: page === id ? COLORS.magenta : COLORS.cocoa, fontFamily: "Nunito, sans-serif",
      fontWeight: 800, fontSize: 11, padding: "4px 8px", position: "relative",
    }}>
      {icon}
      {label}
      {id === "cart" && cartCount > 0 && (
        <span style={{
          position: "absolute", top: -4, right: 0, background: COLORS.magenta, color: "#fff",
          borderRadius: 999, fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
        }}>{cartCount}</span>
      )}
    </button>
  );

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50, background: "rgba(252,241,230,.92)", backdropFilter: "blur(6px)",
      borderBottom: `2px solid ${COLORS.line}`, padding: "10px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1000, margin: "0 auto" }}>
        <div onClick={() => setPage(user?.role === "admin" ? "admin" : "home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.jpg" alt="Little Treats by Jan" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: "50%", border: `2px solid ${COLORS.marigold}` }} />
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 18, color: COLORS.magenta, lineHeight: 1 }}>Little Treats</div>
            <div style={{ fontSize: 9.5, color: COLORS.cocoa, fontWeight: 700, letterSpacing: 1 }}>BY JAN</div>
          </div>
        </div>

        {user?.role === "admin" ? (
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <NavBtn id="admin" icon={<Settings size={18} />} label="Admin" />
            <NavBtn id="admin-orders" icon={<ClipboardList size={18} />} label="Orders" />
            <button onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.cocoa }}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <NavBtn id="home" icon={<Home size={18} />} label="Home" />
            <NavBtn id="products" icon={<Sparkles size={18} />} label="Shop" />
            <NavBtn id="cart" icon={<ShoppingCart size={18} />} label="Cart" />
            {user ? (
              <>
                <NavBtn id="orders" icon={<Package size={18} />} label="Orders" />
                <button onClick={logout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.cocoa }}>
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <NavBtn id="login" icon={<User size={18} />} label="Login" />
                <button onClick={() => setPage("login")} title="Admin Login" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none",
                  cursor: "pointer", color: "#8A6C5F", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, padding: "4px 8px",
                }}>
                  <Settings size={18} />
                  Admin
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Home ---------------- */

function HomePage({ setPage }) {
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

/* ---------------- Products ---------------- */

function ProductsPage({ products, addToCart, toast }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: COLORS.cocoa }}>Our Little Treats</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", color: "#8A6C5F", fontSize: 13.5, marginBottom: 18 }}>Small batches, freshly baked and carefully packed.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
        {products.map((p) => {
          const outOfStock = (p.stock ?? 0) <= 0;
          const hasDiscount = Number(p.discountPercent) > 0;
          const finalPrice = effectivePrice(p);
          return (
            <div key={p.id} style={{ background: "#fff", borderRadius: 20, border: `2px solid ${COLORS.line}`, overflow: "hidden", display: "flex", flexDirection: "column", opacity: outOfStock ? 0.75 : 1 }}>
              <div style={{ background: COLORS.blush, textAlign: "center", padding: p.image ? 0 : "22px 0", position: "relative" }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                ) : (
                  <span style={{ fontSize: 54 }}>{p.emoji}</span>
                )}
                {outOfStock && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: COLORS.cocoa, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3 }}>OUT OF STOCK</div>
                )}
                {hasDiscount && !outOfStock && (
                  <div style={{ position: "absolute", top: 8, left: 8, background: COLORS.mint, color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3 }}>{p.discountPercent}% OFF</div>
                )}
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
                {p.tag && !outOfStock && <div style={{ marginBottom: 6 }}><Pill bg="#FFF1D9" color="#B4720F">{p.tag}</Pill></div>}
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: COLORS.cocoa }}>{p.name}</div>
                <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F", margin: "4px 0 8px" }}>{p.desc}</div>
                <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#B08A7A", marginBottom: 10 }}>{p.weight || p.unit}</div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 19, color: COLORS.magenta }}>₹{finalPrice}</span>
                    {hasDiscount && <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: "#B08A7A", textDecoration: "line-through" }}>₹{p.price}</span>}
                  </span>
                  <Button variant="primary" disabled={outOfStock} onClick={() => { addToCart(p.id); toast(`${p.name} added to cart`); }} style={{ padding: "9px 14px", fontSize: 13 }}>
                    {outOfStock ? "Unavailable" : (<><Plus size={14} /> Add</>)}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Cart & Checkout with bite-progress ---------------- */

function BiteProgress({ step }) {
  const steps = ["Cart", "Address", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "6px 0 24px" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i <= step ? COLORS.magenta : "#fff", border: `2px solid ${i <= step ? COLORS.magenta : COLORS.line}`,
              color: i <= step ? "#fff" : "#B08A7A", fontSize: 15,
            }}>
              {i < step ? <Check size={15} /> : "🍪"}
            </div>
            <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 10.5, color: i <= step ? COLORS.magenta : "#B08A7A" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 30, height: 2, background: i < step ? COLORS.magenta : COLORS.line, marginBottom: 16 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function CartPage({ cart, products, updateQty, removeFromCart, setPage, user }) {
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

// TODO: replace with your real UPI ID once set up (shown to customers at checkout).
const BUSINESS_UPI_ID = "9160360405@ibl";

function CheckoutPage({ cart, products, placeOrder, setPage, user, pushToast, callSheet }) {
  const [address, setAddress] = useState({
    name: user?.name || "", phone: user?.phone || "", line1: user?.address || "", city: user?.city || "", pincode: user?.pincode || "",
  });
  const [utr, setUtr] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.id) })).filter((i) => i.product);
  const total = items.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);
  const canSubmit = address.name && address.phone && address.line1 && address.city && address.pincode && utr.trim().length >= 6 && !!screenshotFile;

  const upiLink = `upi://pay?pa=${encodeURIComponent(BUSINESS_UPI_ID)}&pn=${encodeURIComponent("Little Treats by Jan")}&am=${total}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setError("");
    if (!screenshotFile) { setError("Please upload a screenshot of your payment — it's required to confirm your order."); return; }

    setSubmitting(true);
    try {
      setProgress("Compressing screenshot...");
      const compressed = await compressImageFile(screenshotFile);

      setProgress("Uploading proof of payment...");
      const screenshotUrl = await uploadImageInChunks(compressed, callSheet, (done, totalChunks) => {
        setProgress(`Uploading proof of payment (${done}/${totalChunks})...`);
      });

      setProgress("Confirming order...");
      const result = await placeOrder(address, {
        utr: utr.trim(),
        paymentMethod: "UPI (Manual)",
        paymentStatus: "Pending Verification",
        screenshotUrl,
      });
      if (!result?.ok) {
        setError(result?.error || "Couldn't place order. Please try again.");
        pushToast(result?.error || "Couldn't place order.");
      }
    } catch (e) {
      setError(e.message || "Couldn't upload your payment proof. Please try again.");
      pushToast("Upload failed — please try again.");
    } finally {
      setSubmitting(false);
      setProgress("");
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px 60px" }}>
      <BiteProgress step={1} />
      <button onClick={() => setPage("cart")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: COLORS.magenta, fontFamily: "Nunito, sans-serif", fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>
        <ChevronLeft size={16} /> Back to cart
      </button>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: COLORS.cocoa, marginBottom: 4 }}><MapPin size={18} style={{ marginRight: 6, verticalAlign: -3 }} color={COLORS.magenta} />Delivery Address</h2>
      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 18, marginTop: 14 }}>
        <Field label="Full Name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} placeholder="Jane Doe" />
        <Field label="Phone Number" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="98765 43210" />
        <Field label="Address" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House no, street, area" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" />
          <Field label="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="560001" />
        </div>
      </div>

      <div style={{ background: COLORS.blush, borderRadius: 16, padding: 14, marginTop: 16, fontFamily: "Nunito, sans-serif" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: COLORS.cocoa, marginBottom: 8 }}>Order Summary</div>
        {items.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#6B4A3E", marginBottom: 4 }}>
            <span>{i.product.name} × {i.qty}</span><span>₹{effectivePrice(i.product) * i.qty}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: COLORS.cocoa, marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${COLORS.marigold}` }}>
          <span>Total</span><span>₹{total}</span>
        </div>
      </div>

      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 18, marginTop: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color: COLORS.cocoa, marginBottom: 10 }}>Pay via UPI</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <img src={qrImageUrl} alt="UPI QR code" style={{ width: 130, height: 130, borderRadius: 10, border: `2px solid ${COLORS.line}` }} />
          <div style={{ flex: 1, minWidth: 180, fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#6B4A3E" }}>
            <div>Scan the QR, or pay directly to:</div>
            <div style={{ fontWeight: 800, color: COLORS.magenta, margin: "4px 0" }}>{BUSINESS_UPI_ID}</div>
            <div>Amount: <b>₹{total}</b></div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="UTR / Transaction Reference Number *" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 402812345678" />
        </div>

        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>Payment Screenshot * (required)</span>
          <input type="file" accept="image/*" onChange={handleScreenshot} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13 }} />
          {screenshotPreview && <img src={screenshotPreview} alt="payment screenshot preview" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, marginTop: 8, border: `2px solid ${COLORS.line}` }} />}
        </label>

        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11, color: "#B08A7A" }}>
          Each UTR number can only be used once, and a payment screenshot is required as proof — make sure the UTR is copied exactly from your UPI app's confirmation.
        </div>
      </div>

      {error && <div style={{ color: "#C6296B", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, marginTop: 12 }}>{error}</div>}
      {progress && !error && <div style={{ color: COLORS.mint, fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, marginTop: 12 }}>{progress}</div>}

      <Button full variant="primary" disabled={!canSubmit || submitting} style={{ marginTop: 16 }} onClick={submit}>
        {submitting ? "Please wait..." : <><Check size={16} /> Confirm Order</>}
      </Button>
    </div>
  );
}

function ConfirmationPage({ lastOrder, setPage }) {
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

/* ---------------- Auth ---------------- */

function LoginPage({ setPage, loginUser, registerUser, resetPassword, authBusy }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "", city: "", pincode: "" });
  const [resetForm, setResetForm] = useState({ email: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async () => {
    setError("");
    if (mode === "login") {
      const result = await loginUser(form.email, form.password);
      if (!result.ok) return setError(result.error);
      setPage(result.user.role === "admin" ? "admin" : "home");
    } else {
      if (!form.name || !form.email || !form.password) return setError("Please fill in name, email, and password.");
      const result = await registerUser(form.name, form.email, form.password, {
        phone: form.phone, address: form.address, city: form.city, pincode: form.pincode,
      });
      if (!result.ok) return setError(result.error);
      setPage("home");
    }
  };

  const submitReset = async () => {
    setError(""); setNotice("");
    if (!resetForm.newPassword || resetForm.newPassword.length < 4) return setError("New password must be at least 4 characters.");
    if (resetForm.newPassword !== resetForm.confirm) return setError("Passwords don't match.");
    const result = await resetPassword(resetForm.email, resetForm.newPassword);
    if (!result.ok) return setError(result.error || "Couldn't reset password.");
    setNotice("Password updated! You can log in with your new password now.");
    setResetForm({ email: "", newPassword: "", confirm: "" });
    setTimeout(() => { setMode("login"); setNotice(""); }, 1800);
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 18px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src="/logo.jpg" alt="Little Treats by Jan" style={{ height: 64, width: 64, objectFit: "cover", borderRadius: "50%", border: `3px solid ${COLORS.marigold}`, margin: "0 auto" }} />
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: COLORS.cocoa }}>
          {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset your password"}
        </h2>
        <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F" }}>
          {mode === "login" ? "Log in to order your favourite treats" : mode === "register" ? "Sign up to start ordering" : "Enter your account email and choose a new password"}
        </p>
      </div>

      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 20 }}>
        {mode === "forgot" ? (
          <>
            <Field label="Account Email" type="email" value={resetForm.email} onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} placeholder="you@example.com" />
            <Field label="New Password" type="password" value={resetForm.newPassword} onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })} placeholder="At least 4 characters" />
            <Field label="Confirm New Password" type="password" value={resetForm.confirm} onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })} placeholder="Re-enter new password" />
            {error && <div style={{ color: "#C6296B", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
            {notice && <div style={{ color: "#2E8F55", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{notice}</div>}
            <Button full variant="primary" onClick={submitReset} disabled={authBusy}>
              <Lock size={15} /> {authBusy ? "Updating..." : "Update Password"}
            </Button>
            <div style={{ marginTop: 10, fontFamily: "Nunito, sans-serif", fontSize: 11, color: "#B08A7A", textAlign: "center" }}>
              This demo resets the password directly. A production version would email a one-time code first — see note below.
            </div>
          </>
        ) : (
          <>
            {mode === "register" && <Field label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />}
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            {mode === "register" && (
              <>
                <Field label="Phone Number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
                <Field label="Delivery Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House no, street, area" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
                  <Field label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="560001" />
                </div>
                <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11, color: "#B08A7A", marginBottom: 12 }}>
                  Optional now — saves you typing it again at checkout. You can add or update it later too.
                </div>
              </>
            )}
            {error && <div style={{ color: "#C6296B", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
            <Button full variant="primary" onClick={submit} disabled={authBusy}>
              <Lock size={15} /> {authBusy ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
            </Button>
            {mode === "login" && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button onClick={() => { setMode("forgot"); setError(""); }} style={{ background: "none", border: "none", color: COLORS.mint, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
                  Forgot password?
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 14, fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F" }}>
          {mode === "forgot" ? (
            <button onClick={() => { setMode("login"); setError(""); setNotice(""); }} style={{ background: "none", border: "none", color: COLORS.magenta, fontWeight: 800, cursor: "pointer" }}>Back to log in</button>
          ) : (
            <>
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ background: "none", border: "none", color: COLORS.magenta, fontWeight: 800, cursor: "pointer" }}>
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- User Orders ---------------- */

function statusColor(status) {
  return { Pending: "#B4720F", Confirmed: COLORS.mint, Preparing: COLORS.marigold, "Out for Delivery": COLORS.magenta, Delivered: "#2E8F55", Declined: "#A03030" }[status] || COLORS.cocoa;
}

function OrdersPage({ orders, user, setPage }) {
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

/* ---------------- Admin ---------------- */

function AdminProductsPage({ products, addProduct, deleteProduct, updateProduct, sheetUrl, setSheetUrl, callSheet, pushToast }) {
  const [form, setForm] = useState({ name: "", price: "", weight: "", stock: "", discountPercent: "", emoji: "🍪", desc: "", tag: "", image: "" });
  const [imgError, setImgError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError("");

    // Local preview immediately, so the admin sees something right away.
    const previewReader = new FileReader();
    previewReader.onload = () => setForm((f) => ({ ...f, image: previewReader.result }));
    previewReader.readAsDataURL(file);

    if (!sheetUrl) return; // demo mode — preview only, not persisted (matches other demo-mode limits)

    setUploading(true);
    try {
      const compressed = await compressImageFile(file, 800, 0.7);
      const url = await uploadImageInChunks(compressed, callSheet);
      setForm((f) => ({ ...f, image: url }));
      pushToast("Photo uploaded!");
    } catch (err) {
      setImgError(err.message || "Couldn't upload the photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.name || !form.price) return;
    addProduct({
      ...form, id: "p" + Date.now(),
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      discountPercent: Math.min(90, Math.max(0, Number(form.discountPercent) || 0)),
      unit: form.weight,
    });
    setForm({ name: "", price: "", weight: "", stock: "", discountPercent: "", emoji: "🍪", desc: "", tag: "", image: "" });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 4 }}>Admin · Products</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F", marginBottom: 18 }}>Add new treats, set stock levels, discounts, and upload product photos.</p>

      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <Field label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Choco Delight Cookies" />
          <Field label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="249" />
          <Field label="Weight / Size" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="250g jar" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <Field label="Stock Quantity" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="20" />
          <Field label="Discount %" type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="0" />
          <Field label="Emoji Icon (fallback)" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍪" />
          <Field label="Tag (optional)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="New" />
        </div>
        <Field label="Description" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Short description" />

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>Product Photo (optional)</span>
          <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13 }} />
          {uploading && <div style={{ color: COLORS.mint, fontSize: 12, fontWeight: 700, marginTop: 6 }}>Uploading photo...</div>}
          {imgError && <div style={{ color: "#C6296B", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{imgError}</div>}
          {form.image && <img src={form.image} alt="preview" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 12, marginTop: 8, border: `2px solid ${COLORS.line}` }} />}
          {!sheetUrl && <div style={{ color: "#B08A7A", fontSize: 11, marginTop: 6 }}>Connect Google Sheets below to make photos persist permanently.</div>}
        </label>

        <Button variant="primary" onClick={submit} disabled={uploading}><Plus size={15} /> Add Product</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginBottom: 28 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 14, position: "relative" }}>
            <button onClick={() => deleteProduct(p.id)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#C6296B", cursor: "pointer" }}><Trash2 size={15} /></button>
            {p.image ? (
              <img src={p.image} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />
            ) : (
              <div style={{ fontSize: 30 }}>{p.emoji}</div>
            )}
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.cocoa, marginTop: 6 }}>{p.name}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: COLORS.magenta, fontWeight: 700 }}>
              {Number(p.discountPercent) > 0 ? (
                <>₹{effectivePrice(p)} <span style={{ textDecoration: "line-through", color: "#B08A7A", fontWeight: 600 }}>₹{p.price}</span></>
              ) : (
                <>₹{p.price}</>
              )} · {p.weight || p.unit}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#8A6C5F", fontWeight: 700 }}>Stock:</span>
              <input
                type="number" value={p.stock ?? 0}
                onChange={(e) => updateProduct(p.id, { stock: Number(e.target.value) || 0 })}
                style={{ width: 60, padding: "4px 6px", borderRadius: 8, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12.5 }}
              />
              {(p.stock ?? 0) <= 0 && <Pill bg="#F3E1E1" color="#A03030">Out of stock</Pill>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#8A6C5F", fontWeight: 700 }}>Discount %:</span>
              <input
                type="number" value={p.discountPercent ?? 0}
                onChange={(e) => updateProduct(p.id, { discountPercent: Math.min(90, Math.max(0, Number(e.target.value) || 0)) })}
                style={{ width: 60, padding: "4px 6px", borderRadius: 8, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12.5 }}
              />
              {Number(p.discountPercent) > 0 && <Pill bg="#E3F3F1" color={COLORS.mint}>{p.discountPercent}% OFF</Pill>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.blush, border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>Google Sheets Sync</div>
        <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#6B4A3E", marginBottom: 10 }}>
          Paste your deployed Google Apps Script Web App URL here so every order is written straight to your Google Sheet and the customer gets an email notification.
        </p>
        <Field label="Apps Script Web App URL" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://script.google.com/macros/s/XXXX/exec" />
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: sheetUrl ? "#2E8F55" : "#B08A7A", fontWeight: 700 }}>
          {sheetUrl ? "✓ Orders will sync to your Google Sheet." : "Not connected — orders are currently stored in this demo session only."}
        </div>
      </div>
    </div>
  );
}

function AdminOrdersPage({ orders, updateStatus }) {
  const postAcceptStatuses = ["Confirmed", "Preparing", "Out for Delivery", "Delivered"];
  const pending = orders.filter((o) => o.status === "Pending");
  const rest = orders.filter((o) => o.status !== "Pending");

  const OrderCard = ({ o }) => (
    <div style={{ background: "#fff", border: `2px solid ${o.status === "Pending" ? COLORS.marigold : COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: COLORS.cocoa }}>#{o.id} · {o.address.name}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F" }}>{o.address.line1}, {o.address.city} - {o.address.pincode} · 📞 {o.address.phone}</div>
          <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F", marginTop: 4 }}>{new Date(o.date).toLocaleString()}</div>
        </div>

        {o.status === "Pending" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" style={{ padding: "8px 12px", fontSize: 12.5, color: "#A03030", borderColor: "#F1C6C6" }} onClick={() => updateStatus(o.id, "Declined")}>
              Decline
            </Button>
            <Button variant="primary" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => updateStatus(o.id, "Confirmed")}>
              <Check size={14} /> Verify Payment & Accept
            </Button>
          </div>
        ) : o.status === "Declined" ? (
          <Pill color={statusColor(o.status)} bg="#F3E1E1">Declined</Pill>
        ) : (
          <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} style={{
            height: 34, borderRadius: 10, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontWeight: 800,
            fontSize: 12.5, color: statusColor(o.status), padding: "0 8px", background: "#fff",
          }}>
            {postAcceptStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <div style={{ marginTop: 10, fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#6B4A3E" }}>
        {o.itemsText ? (
          <div>{o.itemsText}</div>
        ) : (
          (o.items || []).map((i) => <div key={i.id}>{i.name} × {i.qty} — ₹{i.price * i.qty}</div>)
        )}
      </div>
      <div style={{ marginTop: 6, fontWeight: 800, color: COLORS.magenta, fontFamily: "Nunito, sans-serif" }}>Total ₹{o.total}</div>
      {(o.utr || o.paymentMethod) && (
        <div style={{ marginTop: 8, fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {o.paymentMethod && <span>💳 {o.paymentMethod}</span>}
          {o.utr && <span>UTR: <b style={{ color: COLORS.cocoa }}>{o.utr}</b></span>}
          {o.paymentStatus && <Pill bg={o.paymentStatus === "Paid" ? "#E3F3F1" : "#FFF1D9"} color={o.paymentStatus === "Paid" ? COLORS.mint : "#B4720F"}>{o.paymentStatus}</Pill>}
          {o.screenshotUrl && (
            <a href={o.screenshotUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.magenta, fontWeight: 800, textDecoration: "underline" }}>
              View payment screenshot
            </a>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 4 }}>Admin · All Orders</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F", marginBottom: 18 }}>New orders arrive as Pending — accept them to confirm and notify the customer.</p>

      {pending.length > 0 && (
        <>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: "#B4720F", marginBottom: 10 }}>
            🔔 Awaiting your response ({pending.length})
          </div>
          {pending.slice().reverse().map((o) => <OrderCard key={o.id} o={o} />)}
          <div style={{ margin: "18px 0" }} />
        </>
      )}

      {orders.length === 0 ? (
        <div style={{ color: "#8A6C5F", fontFamily: "Nunito, sans-serif", textAlign: "center", padding: "40px 0" }}>No orders placed yet.</div>
      ) : (
        rest.slice().reverse().map((o) => <OrderCard key={o.id} o={o} />)
      )}
    </div>
  );
}

/* ---------------- App shell ---------------- */

export default function LittleTreatsApp() {
  const [page, setPage] = useState("home");
  const [users, setUsers] = useState([{ id: "admin1", name: "Jan", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" }]);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [cart, setCart] = useState([]); // {id, qty}
  const [orders, setOrders] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("https://script.google.com/macros/s/AKfycbyJ8aKilYXt-gNzcqy8sueXWuFJ-lFH5Udnm0jykuHU9yMwmnAp9lnG7wza2OUK302x/exec");
  const [toasts, setToasts] = useState([]);
  const [authBusy, setAuthBusy] = useState(false);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  // Generic call to the Apps Script backend. Uses GET with the payload in a
  // query param — Apps Script Web Apps always redirect internally, and
  // browsers silently downgrade POST-through-redirect to GET. We read the
  // JSON response back (no no-cors) since GET requests are eligible for
  // CORS-readable responses from script.googleusercontent.com.
  const callSheet = async (payload) => {
    if (!sheetUrl) return { ok: false, error: "No Sheets URL configured." };
    try {
      const url = `${sheetUrl}?data=${encodeURIComponent(JSON.stringify(payload))}`;
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      console.warn("Sheet call failed:", e);
      return { ok: false, error: "Could not reach the Sheets backend." };
    }
  };

  // Load the real product list from the Sheet on startup (if connected).
  // Falls back to the local seed list if no Sheets URL is set or it fails.
  React.useEffect(() => {
    if (!sheetUrl) return;
    (async () => {
      const result = await callSheet({ action: "getProducts" });
      if (result.ok && Array.isArray(result.products) && result.products.length) {
        setProducts(result.products.map((p) => ({ ...p, image: "" })));
      }
    })();
    // Also load existing orders so Admin and customers see orders placed
    // across past sessions/devices, not just this browser tab.
    (async () => {
      const result = await callSheet({ action: "getOrders" });
      if (result.ok && Array.isArray(result.orders)) {
        setOrders(result.orders);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = (id) => {
    setCart((c) => {
      const found = c.find((i) => i.id === id);
      if (found) return c.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id, qty: 1 }];
    });
  };
  const updateQty = (id, qty) => {
    if (qty <= 0) return setCart((c) => c.filter((i) => i.id !== id));
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty } : i)));
  };
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  // Auth: uses the Sheet as the real source of truth when connected
  // (passwords are salted + SHA-256 hashed server-side, never stored in
  // plain text), falling back to local in-memory demo accounts otherwise.
  const loginUser = async (email, password) => {
    setAuthBusy(true);
    try {
      if (sheetUrl) {
        const result = await callSheet({ action: "loginUser", email, password });
        if (result.ok) { setUser(result.user); pushToast(`Welcome, ${result.user.name.split(" ")[0]}!`); return { ok: true, user: result.user }; }
        return { ok: false, error: result.error || "Login failed." };
      }
      const found = users.find((u) => u.email === email && u.password === password);
      if (!found) return { ok: false, error: "Invalid email or password." };
      setUser(found); pushToast(`Welcome, ${found.name.split(" ")[0]}!`);
      return { ok: true, user: found };
    } finally { setAuthBusy(false); }
  };

  const registerUser = async (name, email, password, address = {}) => {
    setAuthBusy(true);
    try {
      if (sheetUrl) {
        const result = await callSheet({ action: "registerUser", user: { name, email, password, ...address } });
        if (result.ok) { setUser(result.user); pushToast(`Welcome, ${result.user.name.split(" ")[0]}!`); return { ok: true }; }
        return { ok: false, error: result.error || "Registration failed." };
      }
      if (users.some((u) => u.email === email)) return { ok: false, error: "An account with this email already exists." };
      const newUser = { id: "u" + Date.now(), name, email, password, role: "user", ...address };
      setUsers((arr) => [...arr, newUser]); setUser(newUser); pushToast(`Welcome, ${name.split(" ")[0]}!`);
      return { ok: true };
    } finally { setAuthBusy(false); }
  };

  const logout = () => { setUser(null); setPage("home"); };

  const addProduct = async (p) => {
    if (sheetUrl) {
      const result = await callSheet({ action: "addProduct", product: p });
      if (result.ok) { setProducts((arr) => [...arr, { ...p, id: result.id }]); pushToast(`${p.name} added to storefront`); }
      else pushToast(result.error || "Couldn't add product.");
      return;
    }
    setProducts((arr) => [...arr, p]); pushToast(`${p.name} added to storefront`);
  };

  const deleteProduct = async (id) => {
    setProducts((arr) => arr.filter((p) => p.id !== id));
    if (sheetUrl) callSheet({ action: "deleteProduct", id });
  };

  const updateProduct = async (id, patch) => {
    setProducts((arr) => arr.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (sheetUrl) callSheet({ action: "updateProduct", id, patch });
  };

  const resetPassword = async (email, newPassword) => {
    if (sheetUrl) {
      const result = await callSheet({ action: "resetPassword", email, newPassword });
      return result;
    }
    setUsers((arr) => arr.map((u) => (u.email === email ? { ...u, password: newPassword } : u)));
    return { ok: true };
  };

  // Places the order via the Apps Script backend using the shared callSheet
  // helper (readable JSON response, not fire-and-forget), so we can react to
  // a real error — e.g. a UTR number that's already been used elsewhere.
  const placeOrder = async (address, payment = {}) => {
    const items = cart.map((c) => {
      const p = products.find((pp) => pp.id === c.id);
      return { id: p.id, name: p.name, price: effectivePrice(p), qty: c.qty };
    });

    const insufficient = items.find((i) => {
      const p = products.find((pp) => pp.id === i.id);
      return (p?.stock ?? 0) < i.qty;
    });
    if (insufficient) {
      const msg = `Sorry, "${insufficient.name}" doesn't have enough stock left.`;
      pushToast(msg);
      return { ok: false, error: msg };
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const order = {
      id: String(Date.now()).slice(-6),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items, total, address,
      status: "Pending",
      date: new Date().toISOString(),
      utr: payment.utr || "",
      paymentMethod: payment.paymentMethod || "",
      paymentStatus: payment.paymentStatus || "Unpaid",
      razorpayPaymentId: payment.razorpayPaymentId || "",
      screenshotUrl: payment.screenshotUrl || "",
    };

    if (payment.utr && orders.some((o) => o.utr && o.utr.trim().toLowerCase() === payment.utr.trim().toLowerCase())) {
      const msg = "This UTR/reference number has already been used for another order.";
      return { ok: false, error: msg };
    }

    if (sheetUrl) {
      const result = await callSheet({ action: "newOrder", order });
      if (!result.ok) {
        return { ok: false, error: result.error || "Couldn't place order. Please try again." };
      }
    }

    setOrders((o) => [...o, order]);
    setProducts((arr) => arr.map((p) => {
      const bought = items.find((i) => i.id === p.id);
      if (!bought) return p;
      const newStock = Math.max(0, (p.stock ?? 0) - bought.qty);
      if (sheetUrl) callSheet({ action: "updateProduct", id: p.id, patch: { stock: newStock } });
      return { ...p, stock: newStock };
    }));
    setLastOrder(order);
    setCart([]);

    // Remember this address on the account for next time.
    setUser((u) => u ? { ...u, phone: address.phone, address: address.line1, city: address.city, pincode: address.pincode } : u);
    if (sheetUrl) callSheet({ action: "saveUserAddress", email: user.email, address });

    pushToast(`Order #${order.id} received — pending confirmation!`);
    setPage("confirmation");
    return { ok: true, order };
  };

  // Pushes an order status change to the sheet too, so Admin decisions
  // (accept/decline/progress) stay reflected in your Google Sheet.
  const syncStatusToSheet = async (orderId, status, orderRef, paymentStatus) => {
    if (!sheetUrl) return;
    try {
      const payload = encodeURIComponent(JSON.stringify({ action: "updateStatus", orderId, status, paymentStatus, order: orderRef }));
      await fetch(`${sheetUrl}?data=${payload}`, { method: "GET", mode: "no-cors" });
    } catch (e) {
      console.warn("Status sync skipped:", e);
    }
  };

  // Accepting an order IS the manual payment-verification step: Admin has
  // checked the UTR against their bank statement, so acceptance marks the
  // payment as verified/Paid at the same time as confirming the order.
  const updateStatus = (id, status) => {
    const orderRef = orders.find((o) => o.id === id);
    const paymentStatus = status === "Confirmed" ? "Paid" : orderRef?.paymentStatus;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status, paymentStatus: paymentStatus || o.paymentStatus } : o)));
    syncStatusToSheet(id, status, orderRef, paymentStatus);
    pushToast(
      status === "Confirmed" ? `Order #${id} accepted, payment verified — customer notified!` :
      status === "Declined" ? `Order #${id} declined — customer notified` :
      `Order #${id} marked "${status}" — customer notified`
    );
  };

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  let content;
  if (user?.role === "admin") {
    content = page === "admin-orders"
      ? <AdminOrdersPage orders={orders} updateStatus={updateStatus} />
      : <AdminProductsPage products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProduct={updateProduct} sheetUrl={sheetUrl} setSheetUrl={setSheetUrl} callSheet={callSheet} pushToast={pushToast} />;
  } else {
    switch (page) {
      case "products": content = <ProductsPage products={products} addToCart={addToCart} toast={pushToast} />; break;
      case "cart": content = <CartPage cart={cart} products={products} updateQty={updateQty} removeFromCart={removeFromCart} setPage={setPage} user={user} />; break;
      case "checkout": content = user ? <CheckoutPage cart={cart} products={products} placeOrder={placeOrder} setPage={setPage} user={user} pushToast={pushToast} callSheet={callSheet} /> : <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />; break;
      case "confirmation": content = <ConfirmationPage lastOrder={lastOrder} setPage={setPage} />; break;
      case "orders": content = user ? <OrdersPage orders={orders} user={user} setPage={setPage} /> : <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />; break;
      case "login": content = <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />; break;
      default: content = <HomePage setPage={setPage} />;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "Nunito, sans-serif" }}>
      <Header page={page} setPage={setPage} user={user} logout={logout} cartCount={cartCount} />
      {content}
      <Toast toasts={toasts} />
      <div style={{ textAlign: "center", padding: "20px 0 30px", fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#B08A7A" }}>
        🍪 Little Treats by Jan — Thank you for supporting homemade! 💗
      </div>
    </div>
  );
}
