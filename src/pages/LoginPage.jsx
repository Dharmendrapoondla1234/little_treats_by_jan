import React, { useState } from "react";
import { Lock } from "lucide-react";
import { COLORS } from "../theme";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";

export function LoginPage({ setPage, loginUser, registerUser, resetPassword, authBusy }) {
  const [mode, setMode] = useState("login");
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
        phone: form.phone,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
      });
      if (!result.ok) return setError(result.error);
      setPage("home");
    }
  };

  const submitReset = async () => {
    setError("");
    setNotice("");
    if (!resetForm.newPassword || resetForm.newPassword.length < 4) return setError("New password must be at least 4 characters.");
    if (resetForm.newPassword !== resetForm.confirm) return setError("Passwords don't match.");
    const result = await resetPassword(resetForm.email, resetForm.newPassword);
    if (!result.ok) return setError(result.error || "Couldn't reset password.");
    setNotice("Password updated! You can log in with your new password now.");
    setResetForm({ email: "", newPassword: "", confirm: "" });
    setTimeout(() => {
      setMode("login");
      setNotice("");
    }, 1800);
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
              This demo resets the password directly. A production version would email a one-time code first.
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
                  Optional now — saves you typing it again at checkout.
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
