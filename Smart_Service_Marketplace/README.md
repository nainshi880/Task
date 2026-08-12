# Smart Service Marketplace

Home-service marketplace connecting **customers**, **technicians**, and **admins**. Customers book and pay for services; available technicians claim jobs; admins manage catalog, users, bookings, and reviews.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| Client | React 19, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, Socket.IO client |
| Server | Node.js (ESM), Express 5, Mongoose, Socket.IO, Winston |
| Database | MongoDB |
| Payments | Razorpay |
| Media | Cloudinary |
| Email | Nodemailer (Gmail SMTP / App Password) |
| Push | Firebase Cloud Messaging (optional) |

---

## Project structure

```
Smart_Service_Marketplace/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/            # HTTP clients
│   │   ├── components/
│   │   ├── pages/          # Customer, technician, admin, auth
│   │   ├── routes/
│   │   ├── services/
│   │   └── store/
│   └── .env                # VITE_* variables
└── server/                 # Express API
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── models/
    │   ├── repositories/
    │   ├── routes/
    │   ├── services/
    │   ├── sockets/
    │   └── seeds/
    └── .env                # Server secrets & config
```

---


## Setup

### 1. Clone and install

```bash
cd Smart_Service_Marketplace

# API
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Environment files

Create `server/.env` and `client/.env` (see [Configuration](#configuration) below).

### 3. Seed super admin (optional but recommended)

```bash
cd server
npm run seed:super-admin
```

Uses `SUPER_ADMIN_*` values from `server/.env`.

### 4. Run locally

**Terminal 1 — API**

```bash
cd server
npm run dev
```

Default: `http://localhost:5000`  
API base: `http://localhost:5000/api/v1`

**Terminal 2 — Client**

```bash
cd client
npm run dev
```

Default: `http://localhost:5173` (Vite)

---

## Configuration

### Server (`server/.env`)

#### Required

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `7d`) |
| `CLIENT_URL` | Frontend origin (e.g. `http://localhost:5173`) |

#### Auth / CORS (optional)

| Variable | Description |
| --- | --- |
| `JWT_ACCESS_EXPIRES_IN` | Default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Default `7d` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `COOKIE_DOMAIN` | Cookie domain in production |

#### Cloudinary (uploads)

| Variable | Description |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

Required in **production**.

#### Email (Nodemailer + Gmail)

| Variable | Description |
| --- | --- |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | Gmail address |
| `EMAIL_PASS` | Gmail **App Password** (not account password) |
| `EMAIL_FROM` | From address |
| `EMAIL_FROM_NAME` | Display name |

#### Razorpay

| Variable | Description |
| --- | --- |
| `RAZORPAY_KEY_ID` | Key ID |
| `RAZORPAY_KEY_SECRET` | Key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret |


#### Firebase Admin (optional push + Google login)

| Variable | Description |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Private key (`\n` escaped) |

Same Admin credentials verify Firebase **ID tokens** for **customer and technician** Google Sign-In / Sign-Up (`POST /auth/google` with optional `role` and `intent`).

**Firebase Console setup for Google Login**

1. Authentication → Sign-in method → enable **Google**
2. Add your app origin to **Authorized domains** (e.g. `localhost`)
3. Client already uses `VITE_FIREBASE_*` web config

Push payloads include a **custom sound** (`/sounds/notification.wav`) and an absolute **deeplink** (`CLIENT_URL` + `actionUrl`). Tapping a notification opens the relevant booking/job/chat page. Foreground pushes also play the chime and show a clickable toast.

#### Chat / logging / seed

| Variable | Description |
| --- | --- |
| `CHAT_ENCRYPTION_KEY` | Encrypt chat payloads in production |
| `CHAT_SOCKET_ALLOW_QUERY_TOKEN` | `true` only for local Socket.IO testing |
| `LOG_LEVEL`, `LOG_DIR`, `LOG_MAX_FILES`, `LOG_MAX_SIZE` | Winston logging |
| `SUPER_ADMIN_NAME` | Seed name |
| `SUPER_ADMIN_EMAIL` | Seed email |
| `SUPER_ADMIN_PASSWORD` | Seed password |
| `SUPER_ADMIN_PHONE` | Seed phone |

### Client (`client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL, e.g. `http://localhost:5000/api/v1` |
| `VITE_FIREBASE_API_KEY` | Firebase web config (optional) |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_FIREBASE_VAPID_KEY` | FCM web push VAPID key |

---

## App flow

### Roles

| Role | Entry | Main areas |
| --- | --- | --- |
| **Customer** | `/register` → `/login` | Services, bookings, payments, reviews, chat |
| **Technician** | `/register` (technician) → setup | Jobs, availability, profile, chat |
| **Admin / Super Admin** | `/admin/login` | Users, bookings, services, payments, reviews, settings |

---

### 1. Registration & onboarding

**Customer**

1. Register with basic details.
2. Verify email (if enabled).
3. Complete **customer profile setup** (`/setup/customer`) — personal details (photo optional).
4. Land on customer dashboard.

**Technician**

1. Register with profile photo + ID proof (required at registration).
2. Verify email (if enabled).
3. Complete **technician profile setup** (`/setup/technician`):
   - Photo & ID are treated as **already done** (from registration).
   - Remaining steps: certificates → service categories → working radius → availability.
4. Admin may approve / manage technician accounts.
5. Land on technician dashboard.

---

### 2. Customer booking & payment

```
Browse services → Book (address, date, notes)
       ↓
 Booking created → status: Pending Payment
       ↓
 Pay with Razorpay (Booking Details)
       ↓
 Payment verified / webhook → Paid + Confirmed
       ↓
 Eligible available technicians notified (broadcast)
       ↓
 First technician to accept wins → Assigned / Accepted
```

Important rules:

- No technician notification until payment succeeds.
- Only **available** technicians with matching skills and **no active job** receive the offer.
- Preferred technician selection is not used; assignment is first-accept wins.

---

### 3. Job lifecycle (technician ↔ customer)

```
Assigned / Accepted
       ↓
 In Progress (optionally Paused)
       ↓
 [Optional] Technician finds extra issues on site
       ↓
 Upload photos + description + amount → Extra charge PENDING
       ↓
 Customer notified (in-app + FCM + Socket.IO)
       ↓
    Accept & pay (Razorpay)          OR          Reject
       ↓                                           ↓
 Extra charge PAID · scope expanded     Original scope only
       ↓                                           ↓
 Technician finishes → Awaiting Confirmation
       ↓
 Customer confirms → Completed
       ↓
 Customer leaves review (stars + optional comment)
       ↓
 Technician rating & review count updated
```

Technicians can upload completion photos, request on-site **extra charges**, update job status from job detail, and chat with the customer.

**Extra charge rules**

- Allowed while the job is **In Progress** or **Paused**, and the booking is already paid.
- At most one open (pending/approved) extra charge per booking.
- Job completion is blocked until the customer accepts+pays or rejects.
- Accept & pay expands booking amount (`extraChargeTotal`, `scopeExpanded`); reject keeps original scope.

---

### 4. Admin flow

Admins (via `/admin/login`) can:

- Manage customers and technicians (approve / inspect profiles & documents)
- View and intervene on bookings
- Manage **service catalog & prices**
- Monitor payments, reviews, reports, and analytics
- Update platform settings

Super Admin is seeded via `npm run seed:super-admin`.

---

## Main scripts

### Server

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API with Nodemon |
| `npm start` | Start API (production) |
| `npm run seed:super-admin` | Create / upsert super admin |

### Client

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run oxlint |

---

## API overview

Base path: `/api/v1`

| Area | Routes (examples) |
| --- | --- |
| Auth | `/auth/*` — register, login, **Google login** (`POST /auth/google`), verify, password reset |
| Customers | `/customers/*` |
| Technicians | `/technicians/*` — profile, availability, jobs |
| Bookings | `/bookings/*`, workflow & assignment routes |
| Extra charges | `POST /technicians/jobs/:id/extra-charges`, `GET /bookings/:id/extra-charges`, `POST /extra-charges/:id/accept|reject`, `POST /payments/extra-charges/:id/orders` |
| Payments | `/payments/*` — Razorpay order, verify, webhook (booking + extra_charge) |
| Services | `/services/*` |
| Reviews | `/reviews/*` |
| Chat | `/chat/*` + Socket.IO |
| Admin | `/admin/*` — users, bookings, settings, analytics |
| Health | `/health`, `/ready`, `/live`, `/metrics` |

### Resilience (Redis / BullMQ)

Requires `REDIS_URL`. Designed for the scale-out topology (API cluster → Redis → workers → Mongo).

| Capability | Behavior |
| --- | --- |
| Dead Letter Queue | Exhausted `payment-retry` / `notifications` jobs move to BullMQ queue `dead-letter` |
| Distributed locks | Razorpay webhooks + payment-retry charges use Redis `SET NX PX` locks |
| Idempotency | Redis keys for webhooks & retry attempts; Mongo unique webhook events; optional `Idempotency-Key` middleware |
| Circuit breakers | `razorpay`, `firebase_fcm`, `smtp` — open after consecutive failures, expose state on `/health` & `/metrics` |
| Metrics | HTTP + queue enqueue/complete/fail + DLQ + locks + idempotency + circuits on `GET /api/v1/metrics` |
| Health | `/health` (deps), `/ready` (traffic), `/live` (process) |

Process roles: `PROCESS_ROLE=api|payment-worker|notification-worker|all` with `npm run start:api`, `start:worker:payment-retry`, `start:worker:notifications`.

### Booking reminders (technicians)

Cron (server local time; disable with `CRON_ENABLED=false`):

| Schedule | Kind | Who |
| --- | --- | --- |
| `07:00` daily | Morning of service day | Technician (+ customer) for `ASSIGNED` / `ACCEPTED` jobs |
| `08:00` daily | Day before service | Technician (+ customer) for upcoming jobs |

Delivery: in-app + FCM push + `notification:new` socket (plays sound when the app is open). Toggle via admin platform settings → `notifications.bookingReminders`.

Manual test from `server/`: `npm run reminders:run` (or `npm run reminders:run -- morning_of` / `day_before`).

---

## Local development tips

1. Keep `CLIENT_URL` and `VITE_API_URL` aligned with your Vite and API ports.
2. For Gmail: enable 2FA and use an **App Password** in `EMAIL_PASS`.
3. For Razorpay webhooks locally, use a tunnel (e.g. ngrok) pointing to  
   `https://<tunnel>/api/v1/payments/webhook` (exact path as implemented).
4. Cloudinary is needed for technician photo / ID / certificate uploads.
5. Restart the server after changing `server/.env`.
6. Restart / refresh the client after changing `client/.env` (Vite injects env at build/dev start).

---

## Technician subscriptions

Technicians start on the **Free** plan (3 job claims/month). **Pro** (₹999/mo via Razorpay) unlocks unlimited claims and priority job matching.

### Technician APIs (`/technicians/subscriptions`)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/plans` | List active plans |
| GET | `/current` | Current subscription status |
| POST | `/` | Start Pro subscription (Razorpay checkout) |
| POST | `/verify` | Verify subscription payment |
| POST | `/cancel` | Cancel at period end |

### Admin APIs (`/admin/subscriptions`)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/analytics` | MRR, tier breakdown |
| GET | `/plans` | All plans |
| POST | `/plans/:planId/sync-razorpay` | Sync Pro plan to Razorpay |
| GET | `/` | List technician subscriptions |

### Razorpay webhooks

Enable subscription events on the same webhook URL: `POST /api/v1/payments/webhook`

Handled events include `subscription.activated`, `subscription.charged`, `subscription.cancelled`, and `subscription.halted`.

---