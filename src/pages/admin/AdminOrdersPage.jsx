import React, { useState } from "react";
import { Check } from "lucide-react";
import { COLORS } from "../../theme";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";

function statusColor(status) {
  return { Pending: "#B4720F", Confirmed: COLORS.mint, Preparing: COLORS.marigold, "Out for Delivery": COLORS.magenta, Delivered: "#2E8F55", Declined: "#A03030" }[status] || COLORS.cocoa;
}

export function AdminOrdersPage({ orders, updateStatus }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const postAcceptStatuses = ["Confirmed", "Preparing", "Out for Delivery", "Delivered"];

  const filteredOrders = orders.filter((o) => {
    const orderDate = new Date(o.date);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (orderDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (orderDate > end) return false;
    }
    return true;
  });

  const pending = filteredOrders.filter((o) => o.status === "Pending");
  const rest = filteredOrders.filter((o) => o.status !== "Pending");

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
            height: 34,
            borderRadius: 10,
            border: `2px solid ${COLORS.line}`,
            fontFamily: "Nunito, sans-serif",
            fontWeight: 800,
            fontSize: 12.5,
            color: statusColor(o.status),
            padding: "0 8px",
            background: "#fff",
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

      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, color: COLORS.cocoa, marginBottom: 12 }}>📅 Filter by Date</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontSize: 13 }} />
          </div>
          <button onClick={() => { setStartDate(""); setEndDate(""); }} style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${COLORS.line}`, background: "#fff", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12.5, color: COLORS.cocoa, cursor: "pointer" }}>
            Clear
          </button>
        </div>
        <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#8A6C5F", marginTop: 8 }}>
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {pending.length > 0 && (
        <>
          <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, color: "#B4720F", marginBottom: 10 }}>
            🔔 Awaiting your response ({pending.length})
          </div>
          {pending.slice().reverse().map((o) => <OrderCard key={o.id} o={o} />)}
          <div style={{ margin: "18px 0" }} />
        </>
      )}

      {filteredOrders.length === 0 ? (
        <div style={{ color: "#8A6C5F", fontFamily: "Nunito, sans-serif", textAlign: "center", padding: "40px 0" }}>No orders found for the selected date range.</div>
      ) : (
        rest.slice().reverse().map((o) => <OrderCard key={o.id} o={o} />)
      )}
    </div>
  );
}
