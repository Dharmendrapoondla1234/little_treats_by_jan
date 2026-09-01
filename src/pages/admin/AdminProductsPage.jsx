import React, { useState } from "react";
import { Plus, Trash2, X, ImagePlus } from "lucide-react";
import { COLORS } from "../../theme";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { Pill } from "../../components/ui/Pill";
import { effectivePrice, getProductImages, normalizeImageUrl } from "../../utils/productUtils";
import { compressImageFile, uploadImageInChunks } from "../../utils/uploadUtils";

export function AdminProductsPage({ products, addProduct, deleteProduct, updateProduct, sheetUrl, setSheetUrl, callSheet, pushToast }) {
  const [form, setForm] = useState({ name: "", price: "", weight: "", stock: "", discountPercent: "", emoji: "🍪", desc: "", tag: "", images: [] });
  const [imgError, setImgError] = useState("");
  const [uploading, setUploading] = useState(false);

  const MAX_PHOTOS = 5;

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setImgError("");

    const room = MAX_PHOTOS - form.images.length;
    if (room <= 0) {
      setImgError(`You can add up to ${MAX_PHOTOS} photos per product.`);
      return;
    }
    const toAdd = files.slice(0, room);
    if (files.length > room) setImgError(`Only added ${room} more — ${MAX_PHOTOS} photos max per product.`);

    if (!sheetUrl) {
      for (const file of toAdd) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        setForm((f) => ({ ...f, images: [...f.images, dataUrl] }));
      }
      return;
    }

    setUploading(true);
    try {
      for (const file of toAdd) {
        const compressed = await compressImageFile(file, 800, 0.7);
        const url = await uploadImageInChunks(compressed, callSheet);
        if (!url || !url.startsWith("http")) throw new Error("Invalid image URL returned from server.");
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
      pushToast(toAdd.length > 1 ? `✓ ${toAdd.length} photos uploaded!` : "✓ Photo uploaded and ready!");
    } catch (err) {
      setImgError(err.message || "Couldn't upload one of the photos. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const submit = () => {
    if (!form.name || !form.price) return;
    if (uploading) {
      setImgError("Please wait for the photo upload to finish.");
      return;
    }
    if (form.images.some((img) => img.startsWith("data:") && sheetUrl)) {
      setImgError("Please wait for the photo upload to finish before adding the product.");
      return;
    }

    addProduct({
      ...form,
      id: "p" + Date.now(),
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      discountPercent: Math.min(90, Math.max(0, Number(form.discountPercent) || 0)),
      unit: form.weight,
      image: form.images[0] || "",
      images: form.images.join("|"),
    });

    setForm({ name: "", price: "", weight: "", stock: "", discountPercent: "", emoji: "🍪", desc: "", tag: "", images: [] });
    setImgError("");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 18px 60px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.cocoa, marginBottom: 4 }}>Admin · Products</h2>
      <p style={{ fontFamily: "Nunito, sans-serif", fontSize: 13, color: "#8A6C5F", marginBottom: 18 }}>Add new treats, set stock levels, discounts, and upload product photos.</p>

      {sheetUrl && (
        <button
          onClick={async () => {
            const result = await callSheet({ action: "getProducts" });
            if (result.ok && Array.isArray(result.products)) {
              const withImages = result.products.map((p) => ({
                ...p,
                image: String(p.image || "").trim() || "",
              }));
              pushToast("✓ Products reloaded from Google Sheets");
              products = withImages;
            } else {
              pushToast("❌ Failed to reload products");
            }
          }}
          style={{ marginBottom: 18, padding: "8px 14px", borderRadius: 10, background: COLORS.mint, color: "#fff", border: "none", fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
        >
          🔄 Reload from Google Sheets
        </button>
      )}

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

        <div style={{ marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: COLORS.cocoa, marginBottom: 6 }}>
            Product Photos (optional, up to {MAX_PHOTOS} — first one is the cover photo)
          </span>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: form.images.length >= MAX_PHOTOS ? "not-allowed" : "pointer", padding: "9px 14px", borderRadius: 10, border: `2px dashed ${COLORS.line}`, color: COLORS.cocoa, fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 13, background: "#fff" }}>
            <ImagePlus size={16} color={COLORS.magenta} /> Add photos
            <input type="file" accept="image/*" multiple onChange={handleImages} disabled={uploading || form.images.length >= MAX_PHOTOS} style={{ display: "none" }} />
          </label>
          {uploading && <div style={{ color: COLORS.mint, fontSize: 12, fontWeight: 700, marginTop: 8 }}>Uploading photo...</div>}
          {imgError && <div style={{ color: "#C6296B", fontSize: 12, fontWeight: 700, marginTop: 8 }}>{imgError}</div>}

          {form.images.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {form.images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 76, height: 76 }}>
                  <img src={img} alt={`preview ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, border: `2px solid ${COLORS.line}`, background: COLORS.blush }} />
                  {i === 0 && (
                    <span style={{ position: "absolute", bottom: -6, left: 4, background: COLORS.magenta, color: "#fff", fontSize: 8.5, fontWeight: 800, padding: "1.5px 6px", borderRadius: 999 }}>COVER</span>
                  )}
                  <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: COLORS.cocoa, color: "#fff", border: "2px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          {!sheetUrl && <div style={{ color: "#B08A7A", fontSize: 11, marginTop: 8 }}>Connect Google Sheets below to make photos persist permanently.</div>}
        </div>

        <Button variant="primary" onClick={submit} disabled={uploading}><Plus size={15} /> Add Product</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginBottom: 28 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 14, position: "relative" }}>
            <button onClick={() => deleteProduct(p.id)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#C6296B", cursor: "pointer" }}><Trash2 size={15} /></button>
            <div style={{ width: "100%", height: 100, borderRadius: 10, marginBottom: 8, background: COLORS.blush, position: "relative", overflow: "hidden" }}>
              {p.image && String(p.image).trim().length > 0 ? (
                <img src={normalizeImageUrl(p.image)} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} onError={(e) => {
                  console.warn(`⚠️ Image failed to load for ${p.name}: ${p.image}`);
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.insertAdjacentHTML("beforeend", `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px">${p.emoji || "🍪"}</span>`);
                }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 40 }}>{p.emoji}</span>
                </div>
              )}
              {getProductImages(p).length > 1 && (
                <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(74,42,34,.6)", color: "#fff", borderRadius: 999, padding: "2px 7px", fontSize: 9.5, fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>{getProductImages(p).length} photos</div>
              )}
            </div>
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
              <input type="number" value={p.stock ?? 0} onChange={(e) => updateProduct(p.id, { stock: Number(e.target.value) || 0 })} style={{ width: 60, padding: "4px 6px", borderRadius: 8, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12.5 }} />
              {(p.stock ?? 0) <= 0 && <Pill bg="#F3E1E1" color="#A03030">Out of stock</Pill>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 11.5, color: "#8A6C5F", fontWeight: 700 }}>Discount %:</span>
              <input type="number" value={p.discountPercent ?? 0} onChange={(e) => updateProduct(p.id, { discountPercent: Math.min(90, Math.max(0, Number(e.target.value) || 0)) })} style={{ width: 60, padding: "4px 6px", borderRadius: 8, border: `2px solid ${COLORS.line}`, fontFamily: "Nunito, sans-serif", fontWeight: 800, fontSize: 12.5 }} />
              {Number(p.discountPercent) > 0 && <Pill bg="#E3F3F1" color={COLORS.mint}>{p.discountPercent}% OFF</Pill>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, #fff, #fff4f8)", border: `2px solid ${COLORS.line}`, borderRadius: 18, padding: 18, marginTop: 10 }}>
        <div style={{ fontFamily: "Nunito, sans-serif", fontWeight: 900, color: COLORS.cocoa, marginBottom: 8 }}>What this helps the admin do</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>
          {[
            "Manage product stock and pricing",
            "Upload product photos quickly",
            "Run seasonal offers and promotions",
            "Verify UTR/payment proof before accepting orders",
            "Track order updates and customer communication",
          ].map((item) => (
            <div key={item} style={{ background: "#fff", border: `2px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px", fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700, color: COLORS.cocoa }}>
              ✓ {item}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: COLORS.blush, border: `2px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginTop: 24 }}>
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
