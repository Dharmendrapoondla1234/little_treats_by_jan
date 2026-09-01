import React, { useState } from "react";
import { Plus } from "lucide-react";
import { COLORS } from "../../theme";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { compressImageFile, uploadImageInChunks } from "../../utils/uploadUtils";

export function AdminOffersPage({ offers, addOffer, deleteOffer, updateOffer, callSheet, pushToast, sheetUrl }) {
  const [form, setForm] = useState({ title: "", description: "", color: "#FBE3EA", image: "", active: true });
  const [imgError, setImgError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError("");

    if (!sheetUrl) {
      const previewReader = new FileReader();
      previewReader.onload = () => setForm((f) => ({ ...f, image: previewReader.result }));
      previewReader.readAsDataURL(file);
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageFile(file, 900, 0.7);
      const url = await uploadImageInChunks(compressed, callSheet);
      if (!url || !url.startsWith("http")) throw new Error("Invalid image URL returned from server.");
      setForm((f) => ({ ...f, image: url }));
      pushToast("✓ Offer image uploaded!");
    } catch (err) {
      setImgError(err.message || "Couldn't upload the offer image.");
      setForm((f) => ({ ...f, image: "" }));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.title.trim()) return;

    if (form.image && form.image.startsWith("data:")) {
      setImgError("Please wait for the image upload to finish before adding the offer.");
      return;
    }

    if (uploading) {
      setImgError("Please wait for the image upload to finish.");
      return;
    }

    addOffer({ ...form, title: form.title.trim(), description: form.description.trim() || "Limited-time offer" });
    setForm({ title: "", description: "", color: "#FBE3EA", image: "", active: true });
    setImgError("");
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 4 }}>Admin · Offers</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F", marginBottom: 18 }}>Add banners and promotions that appear immediately on the customer storefront.</p>

      <div style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
          <Field label="Offer Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekend Treat Bundle" />
          <Field label="Card Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} type="color" />
        </div>
        <Field label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Free shipping or 20% off selected cookies" />

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>Offer Image</span>
          <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} style={{ fontFamily: "Nunito, sans-serif", fontSize: 13 }} />
          {uploading && <div style={{ color: COLORS.mint, fontSize: 12, fontWeight: 700, marginTop: 6 }}>Uploading image...</div>}
          {imgError && <div style={{ color: "#C6296B", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{imgError}</div>}
          {form.image && <img src={form.image} alt="offer preview" style={{ width: 110, height: 110, objectFit: "contain", borderRadius: 14, marginTop: 10, border: `2px solid ${COLORS.line}`, background: COLORS.blush }} />}
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontFamily: "Nunito, sans-serif", fontWeight: 800, color: COLORS.cocoa }}>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Show this offer live on the customer page
        </label>

        <Button variant="primary" onClick={submit} disabled={uploading}><Plus size={15} /> Add Offer</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {offers.map((offer) => (
          <div key={offer.id} style={{ background: offer.color || COLORS.blush, border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 14 }}>
            {offer.image ? (
              <img src={offer.image} alt={offer.title} style={{ width: "100%", height: 110, borderRadius: 12, marginBottom: 10, objectFit: "cover", objectPosition: "center", border: `2px solid rgba(74,42,34,.08)`, boxSizing: "border-box" }} />
            ) : (
              <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: "rgba(255,255,255,.32)", borderRadius: 12, marginBottom: 10 }}>🎉</div>
            )}
            <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, fontSize: 13, color: COLORS.cocoa, textTransform: "uppercase" }}>{offer.title}</div>
            <div style={{ fontFamily: "Nunito, sans-serif", fontSize: 12.5, color: "#6B4A3E", marginTop: 4 }}>{offer.description}</div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 11, color: COLORS.cocoa }}>
                <input type="checkbox" checked={offer.active !== false} onChange={(e) => updateOffer(offer.id, { active: e.target.checked })} />
                Live
              </label>
              <button onClick={() => deleteOffer(offer.id)} style={{ background: "none", border: "none", color: "#C6296B", cursor: "pointer", fontFamily: "Nunito, sans-serif", fontWeight: 900 }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
