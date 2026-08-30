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
| Admin: product photo, weight, stock | Admin → Products (upload a photo, set weight/size, set stock quantity) |
| Admin: adjust stock inline | Admin → Products, edit the "Stock" number directly on any product card |
| Storefront stock behavior | Out-of-stock products show an "OUT OF STOCK" badge and can't be added to cart; stock automatically decreases when an order is placed |
| Order lifecycle | New orders start as **Pending**. Admin must explicitly **Accept** (→ Confirmed) or **Decline** each one. Once accepted, Admin can progress it through Preparing → Out for Delivery → Delivered via a dropdown. |
| Two consoles | Customer console (Home/Shop/Cart/Orders) and Admin console (Products/Orders) are already fully separate — which one you see depends on whether you log in with a customer account or the admin account. |
| Forgot password | Login page → "Forgot password?" → enter account email + set a new password directly |
| Admin: view, accept, decline, and progress orders | Admin → Orders — pending orders are pinned at the top with Accept/Decline buttons; every status change (including decline) emails the customer automatically and writes back to your Google Sheet |

## Important: redeploy the Apps Script after updating it

The `.gs` file now handles two actions (`newOrder` and `updateStatus`) and two email types. If you already deployed an older version:

1. Paste the updated `google-apps-script-backend.gs` content over your existing script.
2. Save.
3. Go to **Deploy → Manage deployments** → click the pencil/edit icon → change **Version** to **New version** → **Deploy**.
4. Your `/exec` URL stays the same — no changes needed in the React app.

Skipping step 3 is the most common reason updates "don't work" — editing code alone never updates what the live URL actually runs.

## Forgot password — current behavior and how to upgrade it

Right now, "Forgot password" lets someone type their account email and set a new password immediately — no verification step, since there's no email-sending capability in the React app itself. This is fine for a private/internal demo, but before real customers use it, add a verification step using the same Apps Script backend that already sends order confirmation emails:

1. Add a new action to `google-apps-script-backend.gs`, e.g. `sendResetCode`, that generates a random 6-digit code, emails it via `MailApp.sendEmail`, and returns it (or better, stores it temporarily using `PropertiesService` and only confirms a match server-side).
2. In the React app's "Forgot password" flow, first call that endpoint with the user's email, show a "enter the code we emailed you" step, then only allow setting the new password after the code matches.

Happy to build this out fully on request — it's a small addition once you're ready for it.

## Notes

- The demo runs with in-memory state so you can test the full flow immediately, with or without the Sheets URL connected.
- Once the Sheets URL is set, order data becomes durable in your Google Sheet, and customers get real email notifications — the two features the brief specifically asked for.
- To go further (e.g. reading products from the Sheet too, or SMS notifications), the same `.gs` file is the place to extend — happy to build that out on request.
