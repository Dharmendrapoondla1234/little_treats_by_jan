import React, { useState, useMemo, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { Toast } from "./components/ui/Toast";
import { ProductGalleryModal } from "./components/products/ProductGalleryModal";
import { effectivePrice, normalizeImageUrl } from "./utils/productUtils";
import { HomePage } from "./pages/HomePage";
import { ProductsPage } from "./pages/ProductsPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminOffersPage } from "./pages/admin/AdminOffersPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";

const FONT_LINK_ID = "lt-fonts";
if (typeof document !== "undefined" && !document.getElementById(FONT_LINK_ID)) {
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap";
  document.head.appendChild(link);
}

const SEED_PRODUCTS = [
  { id: "p1", name: "Double Choco Bites", price: 249, unit: "250g jar", weight: "250g", stock: 25, tag: "Bestseller", emoji: "🍫", image: "", discountPercent: 15, desc: "Rich cocoa cookie bites rolled in dark chocolate chunks." },
  { id: "p2", name: "Classic Butter Cookies", price: 199, unit: "250g jar", weight: "250g", stock: 30, tag: "Bestseller", emoji: "🍪", image: "", discountPercent: 0, desc: "Melt-in-mouth butter cookies, small-batch baked." },
  { id: "p3", name: "Choco Chip Crunch", price: 229, unit: "250g jar", weight: "250g", stock: 18, tag: "New", emoji: "🍪", image: "", discountPercent: 0, desc: "Golden cookies loaded with chocolate chips." },
  { id: "p4", name: "Assorted Biscuit Mix", price: 279, unit: "300g jar", weight: "300g", stock: 12, tag: "Combo", emoji: "🧁", image: "", discountPercent: 10, desc: "Our four best flavours mixed into one happy jar." },
  { id: "p5", name: "Nutty Cocoa Rounds", price: 259, unit: "250g jar", weight: "250g", stock: 0, tag: "New", emoji: "🍫", image: "", discountPercent: 0, desc: "Dark cocoa cookies studded with roasted nuts." },
  { id: "p6", name: "Honey Oat Biscuits", price: 219, unit: "250g jar", weight: "250g", stock: 20, tag: "", emoji: "🍪", image: "", discountPercent: 0, desc: "Wholesome oats sweetened with honey, lightly crisp." },
];

const ADMIN_EMAIL = "admin@littletreats.com";
const ADMIN_PASSWORD = "admin123";

export default function LittleTreatsApp() {
  const [page, setPage] = useState("home");
  const [users, setUsers] = useState([{ id: "admin1", name: "Jan", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" }]);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [offers, setOffers] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("https://script.google.com/macros/s/AKfycbyJ8aKilYXt-gNzcqy8sueXWuFJ-lFH5Udnm0jykuHU9yMwmnAp9lnG7wza2OUK302x/exec");
  const [toasts, setToasts] = useState([]);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (!sheetUrl) return;

    (async () => {
      const result = await callSheet({ action: "getProducts" });
      if (result.ok && Array.isArray(result.products) && result.products.length) {
        setProducts(result.products.map((p) => ({ ...p, image: normalizeImageUrl(p.image) })));
      }
    })();

    (async () => {
      const result = await callSheet({ action: "getOffers" });
      if (result.ok && Array.isArray(result.offers)) setOffers(result.offers);
    })();

    (async () => {
      const result = await callSheet({ action: "getOrders" });
      if (result.ok && Array.isArray(result.orders)) setOrders(result.orders);
    })();
  }, [sheetUrl]);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const callSheet = async (payload) => {
    if (!sheetUrl) return { ok: false, error: "No Sheets URL configured." };
    try {
      const url = `${sheetUrl}?data=${encodeURIComponent(JSON.stringify(payload))}`;
      const res = await fetch(url);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { ok: false, error: text || "Invalid response from the backend." };
      }
    } catch (e) {
      console.warn("Sheet call failed:", e);
      return { ok: false, error: "Could not reach the Sheets backend." };
    }
  };

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

  const loginUser = async (email, password) => {
    setAuthBusy(true);
    try {
      if (sheetUrl) {
        const result = await callSheet({ action: "loginUser", email, password });
        if (result.ok) {
          setUser(result.user);
          pushToast(`Welcome, ${result.user.name.split(" ")[0]}!`);
          return { ok: true, user: result.user };
        }
        return { ok: false, error: result.error || "Login failed." };
      }

      const found = users.find((u) => u.email === email && u.password === password);
      if (!found) return { ok: false, error: "Invalid email or password." };
      setUser(found);
      pushToast(`Welcome, ${found.name.split(" ")[0]}!`);
      return { ok: true, user: found };
    } finally {
      setAuthBusy(false);
    }
  };

  const registerUser = async (name, email, password, address = {}) => {
    setAuthBusy(true);
    try {
      if (sheetUrl) {
        const result = await callSheet({ action: "registerUser", user: { name, email, password, ...address } });
        if (result.ok) {
          setUser(result.user);
          pushToast(`Welcome, ${result.user.name.split(" ")[0]}!`);
          return { ok: true };
        }
        return { ok: false, error: result.error || "Registration failed." };
      }

      if (users.some((u) => u.email === email)) return { ok: false, error: "An account with this email already exists." };
      const newUser = { id: "u" + Date.now(), name, email, password, role: "user", ...address };
      setUsers((arr) => [...arr, newUser]);
      setUser(newUser);
      pushToast(`Welcome, ${name.split(" ")[0]}!`);
      return { ok: true };
    } finally {
      setAuthBusy(false);
    }
  };

  const resetPassword = async (email, newPassword) => {
    if (sheetUrl) {
      const result = await callSheet({ action: "resetPassword", email, newPassword });
      return result;
    }
    setUsers((arr) => arr.map((u) => (u.email === email ? { ...u, password: newPassword } : u)));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    setPage("home");
  };

  const addProduct = async (p) => {
    if (sheetUrl) {
      const result = await callSheet({ action: "addProduct", product: p });
      if (result.ok) {
        setProducts((arr) => [...arr, { ...p, id: result.id }]);
        pushToast(`${p.name} added to storefront`);
      } else {
        pushToast(result.error || "Couldn't add product.");
      }
      return;
    }

    setProducts((arr) => [...arr, p]);
    pushToast(`${p.name} added to storefront`);
  };

  const deleteProduct = async (id) => {
    setProducts((arr) => arr.filter((p) => p.id !== id));
    if (sheetUrl) callSheet({ action: "deleteProduct", id });
  };

  const updateProduct = async (id, patch) => {
    setProducts((arr) => arr.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (sheetUrl) callSheet({ action: "updateProduct", id, patch });
  };

  const addOffer = async (offer) => {
    if (sheetUrl) {
      const result = await callSheet({ action: "addOffer", offer });
      if (result.ok) {
        setOffers((arr) => [...arr, { ...offer, id: result.id, active: offer.active !== false }]);
        pushToast(`${offer.title} added to homepage`);
      } else {
        pushToast(result.error || "Couldn't add offer.");
      }
      return;
    }

    setOffers((arr) => [...arr, { ...offer, id: "offer_" + Date.now(), active: offer.active !== false }]);
    pushToast(`${offer.title} added to homepage`);
  };

  const deleteOffer = async (id) => {
    setOffers((arr) => arr.filter((o) => o.id !== id));
    if (sheetUrl) callSheet({ action: "deleteOffer", id });
    pushToast("Offer removed");
  };

  const updateOffer = async (id, patch) => {
    setOffers((arr) => arr.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    if (sheetUrl) callSheet({ action: "updateOffer", id, patch });
  };

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

    const utrCheck = String(payment.utr || "").trim();
    const duplicateUtr = orders.some((o) => String(o.utr || "").trim().toLowerCase() === utrCheck.toLowerCase());
    if (utrCheck && duplicateUtr) {
      const msg = "This UTR/reference number has already been used for another order.";
      return { ok: false, error: msg };
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    let order = {
      id: String(Date.now()).slice(-6),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      items,
      total,
      address,
      status: "Pending",
      date: new Date().toISOString(),
      utr: utrCheck,
      paymentMethod: payment.paymentMethod || "",
      paymentStatus: payment.paymentStatus || "Unpaid",
      razorpayPaymentId: payment.razorpayPaymentId || "",
      screenshotUrl: payment.screenshotUrl || "",
    };

    if (sheetUrl) {
      const result = await callSheet({ action: "newOrder", order });
      if (!result.ok) return { ok: false, error: result.error || "Couldn't place order. Please try again." };
      order = result.order || { ...order, id: result.id || order.id };
    }

    setOrders((o) => [...o, order]);
    setProducts((arr) => arr.map((p) => {
      const bought = items.find((i) => i.id === p.id);
      if (!bought) return p;
      return { ...p, stock: Math.max(0, (p.stock ?? 0) - bought.qty) };
    }));
    setLastOrder(order);
    setCart([]);

    setUser((u) => (u ? { ...u, phone: address.phone, address: address.line1, city: address.city, pincode: address.pincode } : u));
    if (sheetUrl) callSheet({ action: "saveUserAddress", email: user.email, address });

    pushToast(`Order #${order.id} received — pending confirmation!`);
    setPage("confirmation");
    return { ok: true, order };
  };

  const syncStatusToSheet = async (orderId, status, orderRef, paymentStatus) => {
    if (!sheetUrl) return;
    try {
      const payload = encodeURIComponent(JSON.stringify({ action: "updateStatus", orderId, status, paymentStatus, order: orderRef }));
      await fetch(`${sheetUrl}?data=${payload}`, { method: "GET", mode: "no-cors" });
    } catch (e) {
      console.warn("Status sync skipped:", e);
    }
  };

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
    if (page === "admin-orders") {
      content = <AdminOrdersPage orders={orders} updateStatus={updateStatus} />;
    } else if (page === "admin-offers") {
      content = <AdminOffersPage offers={offers} addOffer={addOffer} deleteOffer={deleteOffer} updateOffer={updateOffer} callSheet={callSheet} pushToast={pushToast} sheetUrl={sheetUrl} />;
    } else {
      content = <AdminProductsPage products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProduct={updateProduct} sheetUrl={sheetUrl} setSheetUrl={setSheetUrl} callSheet={callSheet} pushToast={pushToast} />;
    }
  } else {
    switch (page) {
      case "products":
        content = <ProductsPage products={products} addToCart={addToCart} toast={pushToast} onView={setViewProduct} />;
        break;
      case "cart":
        content = <CartPage cart={cart} products={products} updateQty={updateQty} removeFromCart={removeFromCart} setPage={setPage} user={user} />;
        break;
      case "checkout":
        content = user ? (
          <CheckoutPage cart={cart} products={products} placeOrder={placeOrder} setPage={setPage} user={user} pushToast={pushToast} callSheet={callSheet} />
        ) : (
          <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />
        );
        break;
      case "confirmation":
        content = <ConfirmationPage lastOrder={lastOrder} setPage={setPage} />;
        break;
      case "orders":
        content = user ? <OrdersPage orders={orders} user={user} setPage={setPage} /> : <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />;
        break;
      case "login":
        content = <LoginPage setPage={setPage} loginUser={loginUser} registerUser={registerUser} resetPassword={resetPassword} authBusy={authBusy} />;
        break;
      default:
        content = <HomePage setPage={setPage} offers={offers} />;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fff8f4 0%, #fff2ef 100%)", fontFamily: "Nunito, sans-serif" }}>
      <Header page={page} setPage={setPage} user={user} logout={logout} cartCount={cartCount} />
      {content}
      <Toast toasts={toasts} />
      <ProductGalleryModal product={viewProduct} addToCart={addToCart} toast={pushToast} onClose={() => setViewProduct(null)} />
      <div style={{ textAlign: "center", padding: "20px 0 30px", fontFamily: "Nunito, sans-serif", fontSize: 12, color: "#B08A7A" }}>
        🍪 Little Treats by Jan — Thank you for supporting homemade! 💗
      </div>
    </div>
  );
}
