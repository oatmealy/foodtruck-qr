# Food Truck Ordering System

QR-based food truck ordering — customer menu, kitchen dashboard, and admin panel. Built with Next.js 14 App Router, Supabase, and Tailwind CSS.

---

## Pages

| Route | Who | What |
|-------|-----|------|
| `/` | Customers (via QR) | Browse menu, add to cart, place order, see order number |
| `/staff` | Kitchen team | Live order queue with Realtime, tap to advance status, beep on new order |
| `/admin` | Owner | Add/edit menu items, toggle availability |

### `/` — Customer Menu
- Server-renders available menu items (30 s ISR cache)
- Arabic ↔ English toggle; switches `<html dir>` and `<html lang>` for full RTL
- Cart stored in `localStorage` — survives page refresh
- Tap any item to add to cart, adjust qty in the cart drawer
- "Place order" calls `POST /api/orders` and shows a full-screen order number
- Lazy-loaded images, no JS frameworks beyond React — optimised for slow 3G

### `/staff` — Kitchen Dashboard
- Password gate (see `STAFF_PASSWORD` env var; stored in `sessionStorage` once verified)
- Three columns: **Pending → Preparing → Ready**
- Live updates via Supabase Realtime (postgres_changes)
- Plays a Web Audio API beep on every new order
- One-tap to advance an order to the next status (calls `PATCH /api/orders/[id]`)

### `/admin` — Menu Management
- Same password gate as `/staff`
- Lists all items (including hidden ones) via `GET /api/menu`
- Add new item: English name, Arabic name, price (BD), optional image URL, available toggle
- Toggle availability inline — change is reflected immediately in the list and within 30 s on the customer menu

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt-key>
STAFF_PASSWORD=<your-staff-password>
```

> **`STAFF_PASSWORD`** is never shipped to the browser. Client pages POST it to `/api/auth/staff` for verification; write API routes verify it on every request via `Authorization: Bearer <password>`.

---

## Database Setup

### 1. Run migrations

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/dogyzfciyljwyhxfwodx/sql) and run each file in order:

1. `supabase/migrations/001_init.sql` — creates tables, sequence, and `next_order_number()` RPC helper
2. `supabase/migrations/002_rls.sql` — enables RLS; grants public SELECT on menu, public INSERT + SELECT on orders

### 2. (Optional) Seed sample data

Run `supabase/seed.sql` in the SQL Editor to insert 5 Bahraini food items.

---

## How to Add a QR Code

Generate a QR code pointing to your production URL (e.g. `https://your-app.vercel.app/`).

**Free tools:**
- [qr-code-generator.com](https://www.qr-code-generator.com/)
- `npx qrcode-terminal "https://your-app.vercel.app"` (terminal preview)

Print and place the QR at the ordering counter. Customers scan → land on `/` → order.

---

## Go-Live Checklist

- [ ] Run `001_init.sql` in Supabase SQL editor
- [ ] Run `002_rls.sql` in Supabase SQL editor
- [ ] (Optional) Run `seed.sql` to pre-populate menu items
- [ ] Set all env vars in Vercel dashboard (Settings → Environment Variables)
- [ ] Change `STAFF_PASSWORD` to something strong
- [ ] Deploy: `git push` triggers Vercel auto-deploy
- [ ] Open `/admin`, log in, add your real menu items and photos
- [ ] Generate QR code pointing to your production URL
- [ ] Open `/staff` on the kitchen tablet before service starts
- [ ] Test: scan QR, place a test order, confirm it appears in `/staff`

---

## Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local, then:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
