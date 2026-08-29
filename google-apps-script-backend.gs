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

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "newOrder") {
      saveOrderToSheet(body.order);
      sendConfirmationEmail(body.order);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Order ID", "Date", "Customer Name", "Customer Email",
      "Phone", "Address", "City", "Pincode",
      "Items", "Total (₹)", "Status"
    ]);
  }
  return sheet;
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

function sendConfirmationEmail(order) {
  if (!order.userEmail) return;

  const itemsHtml = order.items
    .map(function (i) {
      return "<tr><td style='padding:4px 8px'>" + i.name + "</td>" +
        "<td style='padding:4px 8px'>x" + i.qty + "</td>" +
        "<td style='padding:4px 8px'>₹" + (i.price * i.qty) + "</td></tr>";
    })
    .join("");

  const html =
    "<div style='font-family:sans-serif;color:#4A2A22'>" +
    "<h2 style='color:#C6296B'>Your Little Treats order is confirmed! 🧁</h2>" +
    "<p>Hi " + order.address.name + ", thank you for your order <b>#" + order.id + "</b>.</p>" +
    "<table style='border-collapse:collapse;margin:12px 0'>" + itemsHtml + "</table>" +
    "<p><b>Total: ₹" + order.total + "</b></p>" +
    "<p>Delivering to: " + order.address.line1 + ", " + order.address.city + " - " + order.address.pincode + "</p>" +
    "<p style='color:#8A6C5F'>We'll notify you again once your order ships. Thank you for supporting homemade! 💗</p>" +
    "</div>";

  MailApp.sendEmail({
    to: order.userEmail,
    subject: "Little Treats by Jan — Order #" + order.id + " Confirmed",
    htmlBody: html
  });
}

/**
 * Optional: call this once manually from the Apps Script editor
 * (Run > setupSheet) to pre-create the header row before your first order.
 */
function setupSheet() {
  getSheet();
}
