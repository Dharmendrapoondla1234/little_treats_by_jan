/**
 * LITTLE TREATS BY JAN — Google Sheets order backend
 * ---------------------------------------------------
 * Deploy this as a Web App (see SETUP.md) to receive orders from the
 * React storefront and:
 *   1. Append every order as a row in a Google Sheet ("Orders")
 *   2. Email the customer a confirmation notification
 *
 * The web app URL you get after deploying gets pasted into
 * Admin > Products > "Google Sheets Sync" in the React app.
 */

const SHEET_NAME = "Orders";
const SPREADSHEET_ID = "1if8S1v37fJwEOnMC2feRD5Dwj_uPJWfX-J7uF6liC-g";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "newOrder") {
      saveOrderToSheet(body.order);
      sendOrderReceivedEmail(body.order);
    } else if (body.action === "updateStatus") {
      updateStatusInSheet(body.orderId, body.status);
      sendStatusEmail(body.order, body.status);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Order ID", "Date", "Customer Name", "Customer Email",
      "Phone", "Address", "City", "Pincode",
      "Items", "Total (₹)", "Status"
    ]);
  }
  return sheet;
}

function updateStatusInSheet(orderId, status) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  // Column A = Order ID, Column K (11th) = Status
  for (let row = 1; row < data.length; row++) {
    if (String(data[row][0]) === String(orderId)) {
      sheet.getRange(row + 1, 11).setValue(status);
      break;
    }
  }
}

function saveOrderToSheet(order) {
  const sheet = getSheet();
  const itemsText = order.items
    .map(function (i) { return i.name + " x" + i.qty + " (₹" + i.price * i.qty + ")"; })
    .join(", ");

  sheet.appendRow([
    order.id,
    new Date(order.date),
    order.address.name,
    order.userEmail || "",
    order.address.phone,
    order.address.line1,
    order.address.city,
    order.address.pincode,
    itemsText,
    order.total,
    order.status
  ]);
}

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

  MailApp.sendEmail({
    to: order.userEmail,
    subject: "Little Treats by Jan — Order #" + order.id + " Received (Pending)",
    htmlBody: html
  });
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

  MailApp.sendEmail({
    to: order.userEmail,
    subject: "Little Treats by Jan — Order #" + order.id + " " + status,
    htmlBody: html
  });
}

function itemRowsHtml(items) {
  return (items || [])
    .map(function (i) {
      return "<tr><td style='padding:4px 8px'>" + i.name + "</td>" +
        "<td style='padding:4px 8px'>x" + i.qty + "</td>" +
        "<td style='padding:4px 8px'>₹" + (i.price * i.qty) + "</td></tr>";
    })
    .join("");
}

/**
 * Optional: call this once manually from the Apps Script editor
 * (Run > setupSheet) to pre-create the header row before your first order.
 */
function setupSheet() {
  getSheet();
}

/**
 * DEBUG ONLY — run this manually (select "testSetup" in the function
 * dropdown, then click Run) and check View > Logs afterward. It prints
 * exactly what spreadsheet and sheets it can see, which tells us
 * immediately whether the ID/permissions/sheet name are correct.
 */
function testSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log("Opened spreadsheet name: " + ss.getName());
  Logger.log("Existing tabs: " + ss.getSheets().map(function (s) { return s.getName(); }).join(", "));

  const sheet = getSheet();
  Logger.log("getSheet() returned tab named: " + sheet.getName());
  Logger.log("Tabs after getSheet(): " + ss.getSheets().map(function (s) { return s.getName(); }).join(", "));
}
