import React from "react";
import { ShoppingCart, User, LogOut, Settings, Home, Package, Sparkles, ClipboardList, Bell } from "lucide-react";
import { COLORS } from "../../theme";

export function Header({ page, setPage, user, logout, cartCount }) {
  const NavBtn = ({ id, icon, label }) => (
    <button
      onClick={() => setPage(id)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: page === id ? COLORS.magenta : COLORS.cocoa,
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: 11,
        padding: "4px 8px",
        position: "relative",
      }}
    >
      {icon}
      {label}
      {id === "cart" && cartCount > 0 && (
        <span style={{
          position: "absolute",
          top: -4,
          right: 0,
          background: COLORS.magenta,
          color: "#fff",
          borderRadius: 999,
          fontSize: 9.5,
          fontWeight: 800,
          minWidth: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 3px",
        }}>{cartCount}</span>
      )}
    </button>
  );

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(252,241,230,.92)",
      backdropFilter: "blur(6px)",
      borderBottom: `2px solid ${COLORS.line}`,
      padding: "10px 16px",
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
            <NavBtn id="admin-offers" icon={<Bell size={18} />} label="Offers" />
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
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#8A6C5F",
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: 11,
                  padding: "4px 8px",
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
