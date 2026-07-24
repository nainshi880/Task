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


#### Firebase Admin (optional push)

| Variable | Description |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Private key (`\n` escaped) |

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
 Technician finishes → Awaiting Confirmation
       ↓
 Customer confirms → Completed
       ↓
 Customer leaves review (stars + optional comment)
       ↓
 Technician rating & review count updated
```

Technicians can upload completion photos, update job status from job detail, and chat with the customer.

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
| Auth | `/auth/*` — register, login, verify, password reset |
| Customers | `/customers/*` |
| Technicians | `/technicians/*` — profile, availability, jobs |
| Bookings | `/bookings/*`, workflow & assignment routes |
| Payments | `/payments/*` — Razorpay order, verify, webhook |
| Services | `/services/*` |
| Reviews | `/reviews/*` |
| Chat | `/chat/*` + Socket.IO |
| Admin | `/admin/*` — users, bookings, settings, analytics |
| Health | `/health` |

Swagger UI may be available on the server when enabled in the app bootstrap.

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