import React, { useState } from "react";
import { MapPin, Check, ChevronLeft } from "lucide-react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { effectivePrice } from "../utils/productUtils";
import { compressImageFile, uploadImageInChunks } from "../utils/uploadUtils";

function BiteProgress({ step }) {
  const steps = ["Cart", "Address", "Confirm"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "6px 0 24px" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: i <= step ? COLORS.magenta : "#fff",
              border: `2px solid ${i <= step ? COLORS.magenta : COLORS.line}`,
              color: i <= step ? "#fff" : "#B08A7A",
              fontSize: 15,
            }}>
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

const BUSINESS_UPI_ID = "9160360405@ibl";

export function CheckoutPage({ cart, products, placeOrder, setPage, user, pushToast, callSheet }) {
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    line1: user?.address || "",
    city: user?.city || "",
    pincode: user?.pincode || "",
  });
  const [utr, setUtr] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.id) })).filter((i) => i.product);
  const total = items.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);
  const utrValue = String(utr || "").trim();
  const canSubmit = address.name && address.phone && address.line1 && address.city && address.pincode && utrValue.length >= 6 && !!screenshotFile;

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
    if (!screenshotFile) {
      setError("Please upload a screenshot of your payment — it's required to confirm your order.");
      return;
    }

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
        utr: String(utr || "").trim(),
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
          {screenshotPreview && <img src={screenshotPreview} alt="payment screenshot preview" style={{ width: 90, height: 90, objectFit: "contain", borderRadius: 10, marginTop: 8, border: `2px solid ${COLORS.line}`, background: COLORS.blush }} />}
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
