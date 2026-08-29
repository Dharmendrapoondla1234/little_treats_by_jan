# Little Treats by Jan — Setup Guide

Three files:

- **little-treats-app.jsx** — the full storefront + admin React app (customer login/register, product catalog, cart, address, order confirmation, order tracking; admin product management and order management).
- **google-apps-script-backend.gs** — the real Google Sheets storage layer + email notifications.
- **SETUP.md** — this file.

## 1. Connect Google Sheets (5 minutes)

1. Create a new Google Sheet (e.g. "Little Treats Orders").
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of `google-apps-script-backend.gs`.
4. In the Apps Script editor toolbar, select the function `setupSheet` and click **Run** once (this creates the "Orders" tab with headers). Approve the permission prompts.
5. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, then copy the **Web app URL** it gives you (ends in `/exec`).

## 2. Connect the React app

1. Log in to the app as Admin (`admin@littletreats.com` / `admin123`).
2. Go to **Admin → Products → Google Sheets Sync**.
3. Paste the Web app URL from step 1 and it's connected.

From then on, every confirmed order is:
- Appended as a new row in your **Orders** Google Sheet.
- Emailed to the customer as a confirmation notification (via `MailApp`, using your Google account — no extra email service needed).

## 3. Where things live in the app

| Feature | Where |
|---|---|
| Customer register/login | Login page (also reachable from Cart if not logged in) |
| Browse products | Shop tab |
| Cart | Cart tab, quantity +/- and remove |
| Delivery address + confirm | Checkout flow after Cart (3-step progress: Cart → Address → Confirm) |
| Order confirmation + notification | Shown right after confirming, plus an in-app toast |
| Track my orders | Orders tab (per logged-in customer) |
| Admin: add/remove products | Admin → Products |
| Admin: view & update all orders | Admin → Orders (status dropdown per order also triggers a "customer notified" toast) |

## Notes

- The demo runs with in-memory state so you can test the full flow immediately, with or without the Sheets URL connected.
- Once the Sheets URL is set, order data becomes durable in your Google Sheet, and customers get real email notifications — the two features the brief specifically asked for.
- To go further (e.g. reading products from the Sheet too, or SMS notifications), the same `.gs` file is the place to extend — happy to build that out on request.
