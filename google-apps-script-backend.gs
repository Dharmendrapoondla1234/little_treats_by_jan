/**
 * LITTLE TREATS BY JAN — Google Sheets backend (Users + Products + Orders)
 * -------------------------------------------------------------------------
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * All calls use GET with the payload in a "data" query param — Apps
 * Script Web Apps always redirect internally, and browsers silently
 * downgrade POST-through-redirect to GET, so GET is the reliable path.
 *
 * Maintains three tabs, auto-created on first use:
 *   Users    — Email, Name, PasswordHash, Salt, Role, CreatedAt
 *   Products — ID, Name, Price, Weight, Stock, Tag, Emoji, Description, UpdatedAt
 *   Orders   — Order ID, Date, Customer Name, Customer Email, Phone,
 *              Address, City, Pincode, Items, Total (₹), Status
 *
 * NOTE ON PRODUCT PHOTOS: photo uploads are NOT synced here. Base64 image
 * data is far too large to pass through a URL query string reliably (the
 * GET approach above only works because payloads are short). Photos stay
 * client-side/session-only for now. To add real persisted photos later,
 * host images externally (e.g. Google Drive with DriveApp.createFile, or
 * a service like Cloudinary/imgur) and store just the resulting URL string
 * in a new "ImageURL" column — happy to build that out on request.
 */

const SPREADSHEET_ID = "1if8S1v37fJwEOnMC2feRD5Dwj_uPJWfX-J7uF6liC-g";

const ADMIN_EMAIL = "admin@littletreats.com";
const ADMIN_PASSWORD = "admin123";

const ORDERS_SHEET = "Orders";
const ORDERS_HEADERS = ["Order ID", "Date", "Customer Name", "Customer Email", "Phone", "Address", "City", "Pincode", "Items", "Total (₹)", "Status", "Payment Method", "Payment Status", "Razorpay Payment ID", "UTR Number"];

const USERS_SHEET = "Users";
const USERS_HEADERS = ["Email", "Name", "PasswordHash", "Salt", "Role", "CreatedAt", "Phone", "Address", "City", "Pincode"];

const PRODUCTS_SHEET = "Products";
const PRODUCTS_HEADERS = ["ID", "Name", "Price", "Weight", "Stock", "Tag", "Emoji", "Description", "Discount", "UpdatedAt"];

const SEED_PRODUCTS = [
  ["p1", "Double Choco Bites", 249, "250g", 25, "Bestseller", "🍫", "Rich cocoa cookie bites rolled in dark chocolate chunks.", 15],
  ["p2", "Classic Butter Cookies", 199, "250g", 30, "Bestseller", "🍪", "Melt-in-mouth butter cookies, small-batch baked.", 0],
  ["p3", "Choco Chip Crunch", 229, "250g", 18, "New", "🍪", "Golden cookies loaded with chocolate chips.", 0],
  ["p4", "Assorted Biscuit Mix", 279, "300g", 12, "Combo", "🧁", "Our four best flavours mixed into one happy jar.", 10],
  ["p5", "Nutty Cocoa Rounds", 259, "250g", 0, "New", "🍫", "Dark cocoa cookies studded with roasted nuts.", 0],
  ["p6", "Honey Oat Biscuits", 219, "250g", 20, "", "🍪", "Wholesome oats sweetened with honey, lightly crisp.", 0],
];

/* ------------------------- entry points ------------------------- */

function doGet(e) {
  try {
    const raw = e.parameter.data;
    if (!raw) return jsonOut({ ok: false, error: "No data parameter" });
    const body = JSON.parse(raw);
    return jsonOut(handleAction(body));
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

// Kept for compatibility — will not normally be reached from the browser
// (see the note at the top of this file), but works if called some other way.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return jsonOut(handleAction(body));
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function handleAction(body) {
  switch (body.action) {
    case "newOrder":
      if (body.order.utr && !isUtrUnique(body.order.utr)) {
        return { ok: false, error: "This UTR/reference number has already been used for another order. Please double-check and try again." };
      }
      saveOrderToSheet(body.order);
      sendOrderReceivedEmail(body.order);
      return { ok: true };
    case "updateStatus": updateStatusInSheet(body.orderId, body.status); sendStatusEmail(body.order, body.status); return { ok: true };
    case "getOrders": return { ok: true, orders: getAllOrders() };

    case "registerUser": return registerUser(body.user);
    case "loginUser": return loginUser(body.email, body.password);
    case "resetPassword": return resetPassword(body.email, body.newPassword);
    case "saveUserAddress": return saveUserAddress(body.email, body.address);

    case "getProducts": return { ok: true, products: getAllProducts() };
    case "addProduct": return addProduct(body.product);
    case "updateProduct": return updateProduct(body.id, body.patch);
    case "deleteProduct": return deleteProduct(body.id);

    case "getRazorpayKey": return { ok: true, keyId: getScriptProp("RAZORPAY_KEY_ID") };
    case "createRazorpayOrder": return createRazorpayOrder(body.amount, body.receipt);
    case "verifyRazorpayPayment": return verifyRazorpayPayment(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);

    default: return { ok: false, error: "Unknown action: " + body.action };
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------- sheet helpers ------------------------- */

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function sheetRowsAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = data[r][i]; });
    rows.push({ obj, rowIndex: r + 1 });
  }
  return rows;
}

/* ------------------------- Orders ------------------------- */

function getOrdersSheet() {
  const sheet = getOrCreateSheet(ORDERS_SHEET, ORDERS_HEADERS);
  migrateOrdersSheetIfNeeded(sheet);
  return sheet;
}

// Upgrades an older Orders sheet (created before payment columns existed)
// by appending the missing headers at the end, in ORDERS_HEADERS order.
function migrateOrdersSheetIfNeeded(sheet) {
  ["Payment Method", "Payment Status", "Razorpay Payment ID", "UTR Number"].forEach(col => {
    const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (current.indexOf(col) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col);
    }
  });
}

function saveOrderToSheet(order) {
  const sheet = getOrdersSheet();
  const itemsText = order.items.map(i => i.name + " x" + i.qty + " (₹" + i.price * i.qty + ")").join(", ");
  sheet.appendRow([
    order.id, new Date(order.date), order.address.name, order.userEmail || "",
    order.address.phone, order.address.line1, order.address.city, order.address.pincode,
    itemsText, order.total, order.status,
    order.paymentMethod || "", order.paymentStatus || "Unpaid", order.razorpayPaymentId || "", order.utr || ""
  ]);
}

// Scans the UTR column for an existing, non-empty match (case-insensitive).
function isUtrUnique(utr) {
  if (!utr) return true;
  const sheet = getOrdersSheet();
  const data = sheet.getDataRange().getValues();
  const target = String(utr).trim().toLowerCase();
  for (let r = 1; r < data.length; r++) {
    const existing = String(data[r][14] || "").trim().toLowerCase();
    if (existing && existing === target) return false;
  }
  return true;
}

function updateStatusInSheet(orderId, status) {
  const sheet = getOrdersSheet();
  const data = sheet.getDataRange().getValues();
  for (let row = 1; row < data.length; row++) {
    if (String(data[row][0]) === String(orderId)) { sheet.getRange(row + 1, 11).setValue(status); break; }
  }
}

function getAllOrders() {
  const sheet = getOrdersSheet();
  const data = sheet.getDataRange().getValues();
  const orders = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    orders.push({
      id: String(row[0]), date: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
      address: { name: row[2], phone: row[4], line1: row[5], city: row[6], pincode: row[7] },
      userEmail: row[3], itemsText: row[8], total: row[9], status: row[10],
      paymentMethod: row[11] || "", paymentStatus: row[12] || "Unpaid", razorpayPaymentId: row[13] || "", utr: row[14] || "",
    });
  }
  return orders;
}

/* ------------------------- Users / auth ------------------------- */

function getUsersSheet() {
  const sheet = getOrCreateSheet(USERS_SHEET, USERS_HEADERS);
  migrateUsersSheetIfNeeded(sheet);
  // Seed the admin account once so admin login always works via the sheet.
  const rows = sheetRowsAsObjects(sheet);
  const hasAdmin = rows.some(r => String(r.obj.Email).toLowerCase() === ADMIN_EMAIL);
  if (!hasAdmin) {
    const salt = generateSalt();
    sheet.appendRow([ADMIN_EMAIL, "Jan", hashPassword(ADMIN_PASSWORD, salt), salt, "admin", new Date()]);
  }
  return sheet;
}

// Upgrades an older Users sheet (created before address columns existed) by
// appending any missing headers at the end, matching USERS_HEADERS order.
function migrateUsersSheetIfNeeded(sheet) {
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  ["Phone", "Address", "City", "Pincode"].forEach(col => {
    const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (current.indexOf(col) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(col);
    }
  });
}

function generateSalt() { return Utilities.getUuid().slice(0, 8); }

function hashPassword(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + ":" + salt);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

function registerUser(user) {
  const sheet = getUsersSheet();
  const rows = sheetRowsAsObjects(sheet);
  const email = String(user.email || "").toLowerCase().trim();
  if (!email || !user.password || !user.name) return { ok: false, error: "Missing name, email, or password." };
  if (rows.some(r => String(r.obj.Email).toLowerCase() === email)) return { ok: false, error: "An account with this email already exists." };

  const salt = generateSalt();
  const hash = hashPassword(user.password, salt);
  sheet.appendRow([email, user.name, hash, salt, "user", new Date(), user.phone || "", user.address || "", user.city || "", user.pincode || ""]);
  return {
    ok: true,
    user: {
      id: email, name: user.name, email, role: "user",
      phone: user.phone || "", address: user.address || "", city: user.city || "", pincode: user.pincode || "",
    }
  };
}

function loginUser(email, password) {
  const sheet = getUsersSheet();
  const rows = sheetRowsAsObjects(sheet);
  const target = String(email || "").toLowerCase().trim();
  const match = rows.find(r => String(r.obj.Email).toLowerCase() === target);
  if (!match) return { ok: false, error: "No account found with that email." };

  const hash = hashPassword(password, match.obj.Salt);
  if (hash !== match.obj.PasswordHash) return { ok: false, error: "Incorrect password." };

  return {
    ok: true,
    user: {
      id: match.obj.Email, name: match.obj.Name, email: match.obj.Email, role: match.obj.Role,
      phone: match.obj.Phone || "", address: match.obj.Address || "", city: match.obj.City || "", pincode: match.obj.Pincode || "",
    }
  };
}

function resetPassword(email, newPassword) {
  const sheet = getUsersSheet();
  const rows = sheetRowsAsObjects(sheet);
  const target = String(email || "").toLowerCase().trim();
  const match = rows.find(r => String(r.obj.Email).toLowerCase() === target);
  if (!match) return { ok: false, error: "No account found with that email." };
  if (!newPassword || newPassword.length < 4) return { ok: false, error: "New password must be at least 4 characters." };

  const salt = generateSalt();
  const hash = hashPassword(newPassword, salt);
  sheet.getRange(match.rowIndex, 3).setValue(hash); // PasswordHash column
  sheet.getRange(match.rowIndex, 4).setValue(salt);  // Salt column
  return { ok: true };
}

function saveUserAddress(email, address) {
  const sheet = getUsersSheet();
  const rows = sheetRowsAsObjects(sheet);
  const target = String(email || "").toLowerCase().trim();
  const match = rows.find(r => String(r.obj.Email).toLowerCase() === target);
  if (!match) return { ok: false, error: "No account found with that email." };

  // Columns: 7=Phone, 8=Address, 9=City, 10=Pincode
  sheet.getRange(match.rowIndex, 7).setValue(address.phone || "");
  sheet.getRange(match.rowIndex, 8).setValue(address.line1 || "");
  sheet.getRange(match.rowIndex, 9).setValue(address.city || "");
  sheet.getRange(match.rowIndex, 10).setValue(address.pincode || "");
  return { ok: true };
}

/* ------------------------- Products ------------------------- */

function getProductsSheet() {
  const sheet = getOrCreateSheet(PRODUCTS_SHEET, PRODUCTS_HEADERS);
  if (sheet.getLastRow() === 1) { // headers only — seed defaults once
    SEED_PRODUCTS.forEach(p => sheet.appendRow(p.concat([new Date()])));
  }
  migrateProductsSheetIfNeeded(sheet);
  return sheet;
}

// Upgrades an older Products sheet (created before the Discount column
// existed) by inserting "Discount" in the correct position — right before
// "UpdatedAt" — since the rest of this file reads columns by fixed
// position. Existing rows get a default of 0 (no discount).
function migrateProductsSheetIfNeeded(sheet) {
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.indexOf("Discount") !== -1) return; // already up to date

  const updatedAtIdx = headerRow.indexOf("UpdatedAt"); // 0-based
  const insertBeforeCol = updatedAtIdx >= 0 ? updatedAtIdx + 1 : lastCol + 1; // 1-based
  sheet.insertColumnBefore(insertBeforeCol);
  sheet.getRange(1, insertBeforeCol).setValue("Discount");

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const defaults = [];
    for (let i = 0; i < lastRow - 1; i++) defaults.push([0]);
    sheet.getRange(2, insertBeforeCol, lastRow - 1, 1).setValues(defaults);
  }
}

function getAllProducts() {
  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  const products = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    products.push({
      id: String(row[0]), name: row[1], price: Number(row[2]), weight: row[3], unit: row[3],
      stock: Number(row[4]) || 0, tag: row[5] || "", emoji: row[6] || "🍪", desc: row[7] || "",
      discountPercent: Number(row[8]) || 0, image: "",
    });
  }
  return products;
}

function addProduct(p) {
  const sheet = getProductsSheet();
  const id = "p" + Date.now();
  sheet.appendRow([id, p.name, Number(p.price) || 0, p.weight || "", Number(p.stock) || 0, p.tag || "", p.emoji || "🍪", p.desc || "", Number(p.discountPercent) || 0, new Date()]);
  return { ok: true, id };
}

function updateProduct(id, patch) {
  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  const colIndex = { name: 2, price: 3, weight: 4, stock: 5, tag: 6, emoji: 7, desc: 8, discountPercent: 9 };
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(id)) {
      Object.keys(patch).forEach(key => {
        if (colIndex[key]) sheet.getRange(r + 1, colIndex[key]).setValue(patch[key]);
      });
      sheet.getRange(r + 1, 10).setValue(new Date()); // UpdatedAt
      return { ok: true };
    }
  }
  return { ok: false, error: "Product not found." };
}

function deleteProduct(id) {
  const sheet = getProductsSheet();
  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(id)) { sheet.deleteRow(r + 1); return { ok: true }; }
  }
  return { ok: false, error: "Product not found." };
}

/* ------------------------- Razorpay (UPI) ------------------------- */
// Keys are read from Script Properties, never hardcoded here — set them via
// Apps Script's Project Settings > Script Properties: RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET. The Secret never leaves this server-side script.

function getScriptProp(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

function createRazorpayOrder(amountRupees, receipt) {
  const keyId = getScriptProp("RAZORPAY_KEY_ID");
  const keySecret = getScriptProp("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return { ok: false, error: "Razorpay keys are not configured yet in Script Properties." };

  const auth = Utilities.base64Encode(keyId + ":" + keySecret);
  const payload = {
    amount: Math.round(Number(amountRupees) * 100), // paise
    currency: "INR",
    receipt: receipt || ("order_" + Date.now()),
    payment_capture: 1,
  };

  try {
    const response = UrlFetchApp.fetch("https://api.razorpay.com/v1/orders", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Basic " + auth },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const data = JSON.parse(response.getContentText());
    if (data.error) return { ok: false, error: data.error.description || "Razorpay order creation failed." };
    return { ok: true, orderId: data.id, amount: data.amount, currency: data.currency, keyId: keyId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function verifyRazorpayPayment(orderId, paymentId, signature) {
  const keySecret = getScriptProp("RAZORPAY_KEY_SECRET");
  if (!keySecret) return { ok: false, error: "Razorpay key secret not configured." };
  if (!orderId || !paymentId || !signature) return { ok: false, error: "Missing payment verification fields." };

  const expected = bytesToHex(Utilities.computeHmacSha256Signature(orderId + "|" + paymentId, keySecret));
  if (expected !== signature) return { ok: false, error: "Payment signature verification failed." };
  return { ok: true };
}

function bytesToHex(bytes) {
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
}

/* ------------------------- Emails ------------------------- */

function sendOrderReceivedEmail(order) {
  if (!order.userEmail) return;
  const itemsHtml = itemRowsHtml(order.items);
  const html =
    "<div style='font-family:sans-serif;color:#4A2A22'>" +
    "<h2 style='color:#C6296B'>We've received your order! 🧁</h2>" +
    "<p>Hi " + order.address.name + ", thanks for ordering from Little Treats by Jan — order <b>#" + order.id + "</b> is now <b>pending confirmation</b>.</p>" +
    "<table style='border-collapse:collapse;margin:12px 0'>" + itemsHtml + "</table>" +
    "<p><b>Total: ₹" + order.total + "</b></p>" +
    "<p>Delivering to: " + order.address.line1 + ", " + order.address.city + " - " + order.address.pincode + "</p>" +
    "<p style='color:#8A6C5F'>We'll email you again as soon as it's confirmed. Thank you for supporting homemade! 💗</p>" +
    "</div>";
  MailApp.sendEmail({ to: order.userEmail, subject: "Little Treats by Jan — Order #" + order.id + " Received (Pending)", htmlBody: html });
}

function sendStatusEmail(order, status) {
  if (!order || !order.userEmail) return;
  const messages = {
    "Confirmed": { emoji: "✅", title: "Your order is confirmed!", note: "We're getting your treats ready." },
    "Declined": { emoji: "😔", title: "Your order couldn't be accepted", note: "Please contact us if you have questions, or feel free to place a new order." },
    "Preparing": { emoji: "👩‍🍳", title: "Your order is being prepared", note: "Fresh and made with love, right now." },
    "Out for Delivery": { emoji: "🚚", title: "Your order is out for delivery!", note: "It should reach you soon." },
    "Delivered": { emoji: "🎉", title: "Your order has been delivered!", note: "We hope you enjoy every bite." }
  };
  const m = messages[status] || { emoji: "🧁", title: "Order update", note: "" };
  const itemsHtml = itemRowsHtml(order.items);
  const html =
    "<div style='font-family:sans-serif;color:#4A2A22'>" +
    "<h2 style='color:#C6296B'>" + m.emoji + " " + m.title + "</h2>" +
    "<p>Hi " + order.address.name + ", order <b>#" + order.id + "</b> is now: <b>" + status + "</b>.</p>" +
    "<table style='border-collapse:collapse;margin:12px 0'>" + itemsHtml + "</table>" +
    "<p><b>Total: ₹" + order.total + "</b></p>" +
    "<p style='color:#8A6C5F'>" + m.note + "</p>" +
    "</div>";
  MailApp.sendEmail({ to: order.userEmail, subject: "Little Treats by Jan — Order #" + order.id + " " + status, htmlBody: html });
}

function itemRowsHtml(items) {
  return (items || []).map(i =>
    "<tr><td style='padding:4px 8px'>" + i.name + "</td><td style='padding:4px 8px'>x" + i.qty + "</td><td style='padding:4px 8px'>₹" + (i.price * i.qty) + "</td></tr>"
  ).join("");
}

/* ------------------------- setup / debug ------------------------- */

function setupSheet() {
  getOrdersSheet();
  getUsersSheet();
  getProductsSheet();
}

function testSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log("Opened spreadsheet name: " + ss.getName());
  setupSheet();
  Logger.log("Tabs now: " + ss.getSheets().map(s => s.getName()).join(", "));
  Logger.log("Products count: " + getAllProducts().length);
  Logger.log("Orders count: " + getAllOrders().length);
}
